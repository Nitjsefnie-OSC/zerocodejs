import { ref, computed } from 'vue';
import type { ZeroCodeData, ImageData, ImageHookContext, MediaImage } from '../../../types';
import { findImageReferences } from '../../../core/utils/image-utils';
import {
  filterSpecialImagesForPage,
  getSpecialImageAddDefaults
} from '../../../core/utils/image-scope';
import type { Translate } from '../../../i18n';
import {
  checkImageFile,
  formatFileSize,
  readFileAsDataUrl,
  uniqueImageId,
  type ImageFileProblem
} from '../../../core/utils/image-files';
import { useZeroCodeHost } from '../../../core/composables/useZeroCodeHost';

/** 追加・差し替えできないファイル（種類・サイズ）。アップロードの失敗とは分けて表示する */
export class ImageFileRejected extends Error {
  constructor(readonly problem: ImageFileProblem) {
    super(problem.code);
  }
}

export class ImageUploadFailed extends Error {
  constructor(readonly cause: unknown) {
    super('uploadImage failed');
  }
}

/** 画像の追加・差し替えに失敗したときに表示する文 */
export function imageFileErrorMessage(error: unknown, t: Translate, accept: string): string {
  if (error instanceof ImageFileRejected) {
    return error.problem.code === 'size'
      ? t('imagesManager.fileTooLarge', { max: formatFileSize(error.problem.maxSize) })
      : t('imagesManager.fileTypeNotAllowed', { accept });
  }
  return t(
    error instanceof ImageUploadFailed
      ? 'imagesManager.uploadFailed'
      : 'imagesManager.addImageFailed'
  );
}

type ImageFileFields = Pick<ImageData, 'url' | 'mimeType' | 'needsUpload'> &
  Partial<Pick<ImageData, 'id' | 'name'>>;

export interface UseImagesManagerOptions {
  /** 指定時は専用画像を shared + 当該 pageId のみ表示し、追加時は page スコープにする */
  pageId?: string;
}

export function useImagesManager(cmsData: ZeroCodeData, options: UseImagesManagerOptions = {}) {
  const host = useZeroCodeHost();
  const uploading = ref(false);
  const canListMedia = computed(() => !!host.hooks.value.listImages);
  const accept = computed(() => host.images.accept ?? 'image/*');
  // 状態管理
  const activeCategory = ref<'common' | 'individual' | 'special'>('common');
  const selectedImage = ref<ImageData | null>(null);
  const editingImage = ref<ImageData | null>(null);
  const isCreatingNew = ref(false);

  // 並べ替え用の状態
  const reorderSourceImage = ref<string | null>(null); // 画像ID

  // 現在のカテゴリの画像一覧
  const currentImages = computed(() => {
    if (activeCategory.value === 'common') {
      return cmsData.images.common;
    } else if (activeCategory.value === 'individual') {
      return cmsData.images.individual;
    } else {
      return filterSpecialImagesForPage(cmsData.images.special, options.pageId);
    }
  });

  // 画像を選択
  function selectImage(image: ImageData) {
    selectedImage.value = image;
    editingImage.value = null;
    isCreatingNew.value = false;
  }

  function categoryImages(): ImageData[] {
    return cmsData.images[activeCategory.value];
  }

  function hookContext(replacingId?: string): ImageHookContext {
    return {
      category: activeCategory.value,
      pageId: options.pageId,
      source: host.source,
      ...(replacingId ? { replacingId } : {})
    };
  }

  /** uploadImage があればアップロードした URL、なければ base64（保存時にホストがアップロードする） */
  async function readImageFile(file: File, replacingId?: string): Promise<ImageFileFields> {
    const problem = checkImageFile(file, host.images);
    if (problem) throw new ImageFileRejected(problem);
    const upload = host.hooks.value.uploadImage;
    if (!upload) {
      return { url: await readFileAsDataUrl(file), mimeType: file.type, needsUpload: true };
    }
    uploading.value = true;
    try {
      const result = await upload(file, hookContext(replacingId));
      if (typeof result?.url !== 'string' || !result.url) {
        throw new Error('uploadImage did not return a url');
      }
      return { url: result.url, mimeType: file.type, id: result.id, name: result.name };
    } catch (error) {
      throw new ImageUploadFailed(error);
    } finally {
      uploading.value = false;
    }
  }

  function scopeDefaults() {
    return activeCategory.value === 'special' ? getSpecialImageAddDefaults(options.pageId) : {};
  }

  async function addImage(file: File): Promise<ImageData> {
    const fields = await readImageFile(file);
    const newImage: ImageData = {
      id: uniqueImageId(fields.id || `img-${Date.now()}`, cmsData.images),
      name: fields.name || file.name,
      url: fields.url,
      mimeType: fields.mimeType,
      ...(fields.needsUpload ? { needsUpload: true } : {}),
      ...scopeDefaults()
    };
    categoryImages().push(newImage);
    return newImage;
  }

  /** 編集中の画像のファイルを差し替える（ID は変えない） */
  async function replaceEditingImageFile(file: File): Promise<void> {
    const target = editingImage.value;
    if (!target) return;
    const fields = await readImageFile(file, target.id);
    target.url = fields.url;
    target.mimeType = fields.mimeType;
    if (fields.needsUpload) target.needsUpload = true;
    else delete target.needsUpload;
  }

  function listMediaImages(): Promise<MediaImage[]> {
    const list = host.hooks.value.listImages;
    return list ? list(hookContext()) : Promise.resolve([]);
  }

  /** メディアの画像を、今のカテゴリに参照（URL）として登録する。登録済みならそれを返す */
  function addMediaImage(media: MediaImage): ImageData {
    const images = categoryImages();
    const existing = images.find((image) => image.url === media.url);
    if (existing) return existing;
    const image: ImageData = {
      id: uniqueImageId(media.id, cmsData.images),
      name: media.name || media.id,
      url: media.url,
      ...scopeDefaults()
    };
    images.push(image);
    return image;
  }

  // 画像削除
  function deleteImage(imageId: string) {
    const references = findImageReferences(imageId, cmsData.page);

    // 参照をクリア
    references.forEach((ref) => {
      Object.keys(ref.component).forEach((key) => {
        if (key.includes('image') && ref.component[key] === imageId) {
          ref.component[key] = '';
        }
      });
    });

    // 画像データを削除
    const commonIndex = cmsData.images.common.findIndex((img) => img.id === imageId);
    if (commonIndex !== -1) {
      cmsData.images.common.splice(commonIndex, 1);
    }

    const individualIndex = cmsData.images.individual.findIndex((img) => img.id === imageId);
    if (individualIndex !== -1) {
      cmsData.images.individual.splice(individualIndex, 1);
    }

    const specialIndex = cmsData.images.special.findIndex((img) => img.id === imageId);
    if (specialIndex !== -1) {
      cmsData.images.special.splice(specialIndex, 1);
    }

    if (selectedImage.value?.id === imageId) {
      selectedImage.value = null;
    }
  }

  // 画像編集開始
  function startEditing(image: ImageData) {
    editingImage.value = { ...image };
    isCreatingNew.value = false;
    selectedImage.value = image;
  }

  // 画像保存
  function saveImage() {
    if (!editingImage.value) return;

    let targetArray: ImageData[];
    if (activeCategory.value === 'common') {
      targetArray = cmsData.images.common;
    } else if (activeCategory.value === 'individual') {
      targetArray = cmsData.images.individual;
    } else {
      targetArray = cmsData.images.special;
    }

    const index = targetArray.findIndex((img) => img.id === editingImage.value!.id);
    if (index !== -1) {
      targetArray[index] = editingImage.value;
    }

    editingImage.value = null;
    isCreatingNew.value = false;
  }

  // 編集キャンセル
  function cancelEditing() {
    editingImage.value = null;
    isCreatingNew.value = false;
  }

  // 画像の使用状況をチェック
  function checkImageUsage(
    imageId: string
  ): Array<{ path: string; component: any; fieldName: string }> {
    return findImageReferences(imageId, cmsData.page);
  }

  // 並べ替え関数
  function handleReorderClick(imageId: string) {
    // 1回目のクリック: 移動元を選択
    if (!reorderSourceImage.value) {
      reorderSourceImage.value = imageId;
      return;
    }

    // 同じ画像をクリック: キャンセル
    if (reorderSourceImage.value === imageId) {
      cancelReorder();
      return;
    }

    // 2回目のクリック: 並べ替え実行
    reorderImages(reorderSourceImage.value, imageId);
    cancelReorder();
  }

  function reorderImages(sourceId: string, targetId: string) {
    let targetArray: ImageData[];
    if (activeCategory.value === 'common') {
      targetArray = cmsData.images.common;
    } else if (activeCategory.value === 'individual') {
      targetArray = cmsData.images.individual;
    } else {
      targetArray = cmsData.images.special;
    }

    const sourceIndex = targetArray.findIndex((img) => img.id === sourceId);
    const targetIndex = targetArray.findIndex((img) => img.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // 配列の順序を入れ替え
    const [removed] = targetArray.splice(sourceIndex, 1);
    targetArray.splice(targetIndex, 0, removed);
  }

  function cancelReorder() {
    reorderSourceImage.value = null;
  }

  return {
    // 並べ替え
    reorderSourceImage,
    handleReorderClick,
    cancelReorder,

    // 既存のexport
    activeCategory,
    selectedImage,
    editingImage,
    isCreatingNew,
    currentImages,
    selectImage,
    addImage,
    replaceEditingImageFile,
    uploading,
    accept,
    canListMedia,
    listMediaImages,
    addMediaImage,
    deleteImage,
    startEditing,
    saveImage,
    cancelEditing,
    checkImageUsage
  };
}
