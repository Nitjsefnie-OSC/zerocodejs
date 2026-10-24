<template>
  <Teleport :to="teleportTo">
    <div v-if="isOpen" ref="imageModalRef" class="zcode-image-modal" @click.self="close">
      <div class="zcode-image-modal-content" @click.stop>
        <div class="zcode-image-modal-header">
          <div class="zcode-image-modal-header-title" role="heading" aria-level="3">
            {{ $t('imagesManager.selectImage') }}
          </div>
          <button class="zcode-close-btn" :aria-label="$t('common.close')" @click="close">
            <X :size="18" />
          </button>
        </div>

        <!-- 現在選択中 / 変更プレビュー -->
        <div v-if="selectionPreviewVisible" class="zcode-image-current">
          <div class="zcode-image-current-title" role="heading" aria-level="4">
            {{ $t('imagesManager.currentlySelected') }}
          </div>
          <div class="zcode-image-current-item">
            <img
              v-if="currentImage"
              :src="currentImage.url"
              :alt="currentImage.name"
              class="zcode-image-current-item-img"
            />
            <ArrowRight
              v-if="showSelectionArrow"
              class="zcode-image-current-arrow"
              :size="16"
              aria-hidden="true"
            />
            <img
              v-if="selectedPreviewImage"
              :src="selectedPreviewImage.url"
              :alt="selectedPreviewImage.name"
              class="zcode-image-current-item-img"
              :class="{ 'zcode-image-current-item-img--pending': showSelectionArrow }"
            />
          </div>
        </div>

        <div class="zcode-image-select-toolbar">
          <div class="zcode-image-tabs">
            <button
              :class="{ active: activeTab === 'all' }"
              class="zcode-image-tab"
              @click="activeTab = 'all'"
            >
              {{ $t('imagesManager.tabAll') }}
            </button>
            <button
              :class="{ active: activeTab === 'common' }"
              class="zcode-image-tab"
              @click="activeTab = 'common'"
            >
              {{ $t('dataViewer.common') }}
            </button>
            <button
              :class="{ active: activeTab === 'individual' }"
              class="zcode-image-tab"
              @click="activeTab = 'individual'"
            >
              {{ $t('dataViewer.individual') }}
            </button>
            <button
              :class="{ active: activeTab === 'special' }"
              class="zcode-image-tab"
              @click="activeTab = 'special'"
            >
              {{ $t('dataViewer.special') }}
            </button>
          </div>
          <div class="zcode-image-select-add-wrapper">
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleFileSelect"
            />
            <button
              type="button"
              class="zcode-btn-primary zcode-image-select-add-btn"
              @click="openSpecialImageFilePicker"
            >
              <Plus :size="14" />
              <span>{{ $t('imagesManager.addSpecialImage') }}</span>
            </button>
          </div>
        </div>

        <!-- 画像一覧 -->
        <div class="zcode-image-grid">
          <template v-if="activeTab === 'special'">
            <div
              v-for="image in currentImages"
              :key="image.id"
              :class="getSpecialItemClass(image)"
              role="button"
              tabindex="0"
              @click="selectImage(image)"
              @keydown.enter.prevent="selectImage(image)"
              @keydown.space.prevent="selectImage(image)"
            >
              <div v-if="reorderSourceImage === image.id" class="zcode-reorder-source-indicator">
                {{ $t('partsManager.source') }}
              </div>
              <img :src="image.url" :alt="image.name" class="zcode-image-item-img" />
              <div class="zcode-image-item-overlay">
                <div class="zcode-image-item-actions">
                  <button
                    class="zcode-action-btn"
                    :title="$t('imagesManager.editImage')"
                    @click.stop="startEditing(image)"
                  >
                    <Pencil :size="16" />
                  </button>
                  <button
                    class="zcode-action-btn"
                    :class="{ active: reorderSourceImage === image.id }"
                    :title="$t('partsManager.reorderPart')"
                    @click.stop="handleReorderClick(image.id)"
                  >
                    <ArrowUpDown :size="16" />
                  </button>
                  <button
                    class="zcode-action-btn zcode-delete-btn"
                    :title="$t('partsManager.deletePartButton')"
                    @click.stop="handleDelete(image)"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </div>
              <div class="zcode-image-name">
                {{ image.name }}
              </div>
            </div>
            <div v-if="currentImages.length === 0" class="zcode-image-select-modal-empty">
              {{ $t('partsManager.noImagesRegistered') }}
            </div>
          </template>
          <template v-else>
            <div
              v-for="entry in displayImages"
              :key="entry.image.id"
              :class="{ selected: selectedImageId === entry.image.id }"
              class="zcode-image-item"
              role="button"
              tabindex="0"
              @click="selectImage(entry.image)"
              @keydown.enter.prevent="selectImage(entry.image)"
              @keydown.space.prevent="selectImage(entry.image)"
            >
              <span
                v-if="activeTab === 'all'"
                class="zcode-image-item-category-badge"
                :class="`zcode-image-item-category-badge--${entry.category}`"
              >
                {{ getCategoryLabel(entry.category) }}
              </span>
              <img :src="entry.image.url" :alt="entry.image.name" class="zcode-image-item-img" />
              <div class="zcode-image-name">
                {{ entry.image.name }}
              </div>
            </div>
            <div v-if="displayImages.length === 0" class="zcode-image-select-modal-empty">
              {{ $t('partsManager.noImagesRegistered') }}
            </div>
          </template>
        </div>

        <!-- アクションボタン -->
        <div class="zcode-image-modal-actions">
          <button
            v-if="selectedImageId"
            class="zcode-btn-primary zcode-image-modal-actions-btn"
            @click="handleConfirm"
          >
            <Check :size="16" />
            <span>{{ $t('imagesManager.select') }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 専用画像の編集（画像管理と同様） -->
  <Teleport :to="teleportTo">
    <div
      v-if="editingImage"
      class="zcode-image-modal zcode-image-select-edit-overlay"
      @click.self="cancelEditing"
    >
      <div ref="imageEditOverlayRef" class="zcode-image-modal-content" data-edit-mode @click.stop>
        <div class="zcode-image-editor-header">
          <div class="zcode-image-editor-header-title" role="heading" aria-level="4">
            {{ $t('imagesManager.editImage') }}
          </div>
          <button class="zcode-close-btn" :aria-label="$t('common.close')" @click="cancelEditing">
            <X :size="18" />
          </button>
        </div>

        <div class="zcode-image-editor-form">
          <div class="zcode-image-preview-large">
            <img
              :src="editingImage.url"
              :alt="editingImage.name"
              class="zcode-image-preview-large-img"
            />
          </div>

          <div class="zcode-image-editor-replace">
            <input
              ref="replaceFileInputRef"
              type="file"
              accept="image/*"
              class="zcode-image-replace-input"
              @change="handleReplaceFile"
            />
            <button
              type="button"
              class="zcode-image-select-btn"
              @click="replaceFileInputRef?.click()"
            >
              <ImageIcon :size="16" />
              <span>{{ $t('imagesManager.replaceImage') }}</span>
            </button>
          </div>

          <div class="zcode-form-field">
            <label>{{ $t('imagesManager.imageId') }}</label>
            <input v-model="editingImage.id" type="text" class="zcode-text-input" disabled />
          </div>

          <div class="zcode-form-field">
            <label>{{ $t('imagesManager.imageName') }}</label>
            <input v-model="editingImage.name" type="text" class="zcode-text-input" />
          </div>

          <div class="zcode-image-editor-actions">
            <button class="zcode-btn-primary zcode-image-editor-actions-btn" @click="saveImage">
              <Check :size="16" />
              <span>{{ $t('common.confirm') }}</span>
            </button>
            <button class="zcode-btn-cancel zcode-image-editor-actions-btn" @click="cancelEditing">
              <X :size="16" />
              <span>{{ $t('common.cancel') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useModalA11y } from '../../../core/composables/useModalA11y';
import { useI18n } from 'vue-i18n';
import { useZcodeTeleportTo } from '../../../core/composables/useZcodeTeleportTo';
import type { ZeroCodeData, ImageData } from '../../../types';
import { useImagesManager } from '../../images-manager/composables/useImagesManager';
import { filterSpecialImagesForPage } from '../../../core/utils/image-scope';
import { logger } from '../../../core/utils/logger';
import {
  X,
  Check,
  Plus,
  Pencil,
  ArrowUpDown,
  ArrowRight,
  Trash2,
  Image as ImageIcon
} from '../../../core/icons';

type ImageCategory = 'common' | 'individual' | 'special';
type ImageSelectTab = 'all' | ImageCategory;

type DisplayImageEntry = {
  image: ImageData;
  category: ImageCategory;
};

const { t } = useI18n();
const teleportTo = useZcodeTeleportTo();

const props = defineProps<{
  isOpen: boolean;
  cmsData: ZeroCodeData;
  currentValue?: string;
  /** 指定時、専用画像は shared + 当該ページのみ表示・追加時は page スコープ */
  pageId?: string;
}>();

const emit = defineEmits<{
  'update:model-value': [imageId: string | null];
  close: [];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const replaceFileInputRef = ref<HTMLInputElement | null>(null);

const activeTab = ref<ImageSelectTab>('all');
const selectedImageId = ref<string | null>(props.currentValue || null);

const {
  activeCategory,
  reorderSourceImage,
  handleReorderClick,
  cancelReorder,
  editingImage,
  currentImages,
  addImage,
  deleteImage,
  startEditing,
  saveImage,
  cancelEditing,
  checkImageUsage
} = useImagesManager(props.cmsData, { pageId: props.pageId });

const displayImages = computed((): DisplayImageEntry[] => {
  const { common, individual, special } = props.cmsData.images;
  const visibleSpecial = filterSpecialImagesForPage(special, props.pageId);

  if (activeTab.value === 'all') {
    return [
      ...common.map((image) => ({ image, category: 'common' as const })),
      ...individual.map((image) => ({ image, category: 'individual' as const })),
      ...visibleSpecial.map((image) => ({ image, category: 'special' as const }))
    ];
  }

  if (activeTab.value === 'common') {
    return common.map((image) => ({ image, category: 'common' as const }));
  }

  if (activeTab.value === 'individual') {
    return individual.map((image) => ({ image, category: 'individual' as const }));
  }

  return [];
});

watch(
  activeTab,
  (tab) => {
    if (tab !== 'all') {
      activeCategory.value = tab;
    }
    cancelReorder();
  },
  { immediate: true }
);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      selectedImageId.value = props.currentValue ?? null;
      activeTab.value = 'all';
      cancelEditing();
      cancelReorder();
    } else {
      cancelEditing();
      cancelReorder();
    }
  }
);

watch(
  () => props.currentValue,
  (v) => {
    if (props.isOpen) {
      selectedImageId.value = v ?? null;
    }
  }
);

function getCategoryLabel(category: ImageCategory): string {
  if (category === 'common') {
    return t('dataViewer.common');
  }
  if (category === 'individual') {
    return t('dataViewer.individual');
  }
  return t('dataViewer.special');
}

function findImageById(id: string | null | undefined): ImageData | null {
  if (!id) return null;
  const { common, individual, special } = props.cmsData.images;
  return [...common, ...individual, ...special].find((img) => img.id === id) ?? null;
}

const currentImage = computed(() => findImageById(props.currentValue));

const selectedImage = computed(() => findImageById(selectedImageId.value));

const showSelectionArrow = computed(() => {
  const current = currentImage.value;
  const selected = selectedImage.value;
  return !!current && !!selected && current.id !== selected.id;
});

const selectedPreviewImage = computed(() => {
  if (!selectedImage.value) return null;
  if (currentImage.value && !showSelectionArrow.value) return null;
  return selectedImage.value;
});

const selectionPreviewVisible = computed(
  () => !!currentImage.value || !!selectedPreviewImage.value
);

const selectImage = (image: ImageData) => {
  selectedImageId.value = image.id;
};

const handleConfirm = () => {
  if (selectedImageId.value) {
    emit('update:model-value', selectedImageId.value);
    close();
  }
};

const imageModalRef = ref<HTMLElement | null>(null);
useModalA11y(
  () => props.isOpen,
  () => close(),
  imageModalRef
);

// 画像編集オーバーレイは選択モーダルの上に重なる別モーダルとして扱う
// （スタックにより Esc は編集側が先に閉じ、Tab トラップも編集側の範囲になる）
const imageEditOverlayRef = ref<HTMLElement | null>(null);
useModalA11y(
  () => !!editingImage.value,
  () => cancelEditing(),
  imageEditOverlayRef
);

const close = () => {
  cancelEditing();
  cancelReorder();
  emit('close');
};

function openSpecialImageFilePicker() {
  activeCategory.value = 'special';
  fileInputRef.value?.click();
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  activeCategory.value = 'special';

  try {
    const newImage = await addImage(file);
    selectedImageId.value = newImage.id;
    if (input) input.value = '';
  } catch (error) {
    logger.error('画像追加エラー:', error);
    alert(t('imagesManager.addImageFailed'));
  }
}

function handleReplaceFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !editingImage.value) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target?.result as string;
    if (!base64 || !editingImage.value) return;
    editingImage.value.url = base64;
    editingImage.value.mimeType = file.type;
    editingImage.value.needsUpload = true;
  };
  reader.readAsDataURL(file);
  if (input) input.value = '';
}

function getSpecialItemClass(image: ImageData) {
  const classes = ['zcode-image-item'];
  if (selectedImageId.value === image.id) {
    classes.push('selected');
  }
  if (reorderSourceImage.value === image.id) {
    classes.push('zcode-reorder-source');
  }
  return classes.join(' ');
}

function handleDelete(image: ImageData) {
  const usages = checkImageUsage(image.id);
  if (usages.length > 0) {
    if (!confirm(t('imagesManager.deleteImageWithUsagesConfirm', { count: usages.length }))) {
      return;
    }
  } else {
    if (!confirm(t('imagesManager.deleteImageConfirm'))) {
      return;
    }
  }

  deleteImage(image.id);
  if (selectedImageId.value === image.id) {
    selectedImageId.value = null;
  }
}
</script>

<style scoped>
.zcode-image-select-edit-overlay {
  z-index: 3100;
}

.zcode-image-select-modal-empty {
  grid-column: 1 / -1;
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: #6b7280;
}
</style>
