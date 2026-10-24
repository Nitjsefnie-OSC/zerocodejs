<template>
  <div class="zcode-images-manager">
    <!-- 共通/個別タブ ＋ 画像追加ボタン（右上にコンパクト配置） -->
    <div class="zcode-images-category-tabs">
      <div v-if="!fixedCategory" class="zcode-images-category-tab-group">
        <button
          v-for="category in categoryTabs"
          :key="category"
          :class="{ active: activeCategory === category }"
          class="zcode-category-tab"
          @click="activeCategory = category"
        >
          {{
            category === 'common'
              ? $t('dataViewer.common')
              : category === 'individual'
                ? $t('dataViewer.individual')
                : $t('dataViewer.special')
          }}
        </button>
        <button
          class="zcode-help-btn"
          :title="$t('dataViewer.categoryInfo.title')"
          @click="showCategoryInfoModal = true"
        >
          <HelpCircle :size="14" />
        </button>
      </div>
      <div class="zcode-images-add-wrapper">
        <span class="zcode-image-uploading" role="status">{{
          uploading ? $t('imagesManager.uploading') : ''
        }}</span>
        <input
          ref="fileInput"
          type="file"
          :accept="accept"
          style="display: none"
          @change="handleFileSelect"
        />
        <button
          v-if="canListMedia"
          class="zcode-btn-secondary zcode-images-add-btn"
          :aria-disabled="uploading"
          @click="mediaPickerOpen = !uploading"
        >
          <Image :size="14" />
          <span>{{ $t('imagesManager.chooseFromMedia') }}</span>
        </button>
        <button
          class="zcode-btn-primary zcode-images-add-btn"
          :aria-disabled="uploading"
          @click="!uploading && fileInput?.click()"
        >
          <Plus :size="14" />
          <span>{{ $t('imagesManager.addImage') }}</span>
        </button>
      </div>
    </div>

    <div class="zcode-images-manager-content">
      <!-- 画像一覧 -->
      <div class="zcode-images-grid">
        <div
          v-for="image in currentImages"
          :key="image.id"
          :class="getImageItemClass(image)"
          role="button"
          tabindex="0"
          @click="startEditing(image)"
          @keydown.enter.self.prevent="startEditing(image)"
          @keydown.space.self.prevent="startEditing(image)"
        >
          <!-- 並べ替え中の移動元インジケーター -->
          <div v-if="reorderSourceImage === image.id" class="zcode-reorder-source-indicator">
            {{ $t('partsManager.source') }}
          </div>
          <img :src="image.url" :alt="image.name" />
          <!-- ホバー時に表示されるアクションボタン -->
          <div class="zcode-image-item-overlay">
            <div class="zcode-image-item-actions">
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
          <div class="zcode-image-item-name">
            {{ image.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- 画像編集モーダル -->
    <Teleport :to="teleportTo">
      <div v-if="editingImage" class="zcode-image-modal" @click.self="cancelEditing">
        <div ref="imageEditModalRef" class="zcode-image-modal-content" data-edit-mode @click.stop>
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
                :accept="accept"
                class="zcode-image-replace-input"
                @change="handleReplaceFile"
              />
              <button
                type="button"
                class="zcode-image-select-btn"
                :aria-disabled="uploading"
                @click="!uploading && replaceFileInputRef?.click()"
              >
                <Image :size="16" />
                <span>{{ $t('imagesManager.replaceImage') }}</span>
              </button>
              <span class="zcode-image-uploading" role="status">{{
                uploading ? $t('imagesManager.uploading') : ''
              }}</span>
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
              <button
                class="zcode-btn-primary zcode-image-editor-actions-btn"
                :aria-disabled="uploading"
                @click="!uploading && saveImage()"
              >
                <Check :size="16" />
                <span>{{ $t('common.confirm') }}</span>
              </button>
              <button
                class="zcode-btn-cancel zcode-image-editor-actions-btn"
                @click="cancelEditing"
              >
                <X :size="16" />
                <span>{{ $t('common.cancel') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- カテゴリ情報モーダル -->
    <CategoryInfoModal :show="showCategoryInfoModal" @close="showCategoryInfoModal = false" />
    <MediaPickerModal
      v-if="canListMedia"
      :show="mediaPickerOpen"
      :load="listMediaImages"
      :is-added="isMediaAdded"
      @pick="handleMediaPick"
      @close="mediaPickerOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useZcodeTeleportTo } from '../../../core/composables/useZcodeTeleportTo';
import { useI18n } from '../../../i18n';
import type { ZeroCodeData, ImageData, CMSConfig, MediaImage } from '../../../types';
import { useImagesManager, imageFileErrorMessage } from '../composables/useImagesManager';
import MediaPickerModal from './MediaPickerModal.vue';
import { useModalA11y } from '../../../core/composables/useModalA11y';
import { logger } from '../../../core/utils/logger';
import { Plus, Trash2, X, Check, ArrowUpDown, HelpCircle, Image } from '../../../core/icons';
import CategoryInfoModal from '../../parts-manager/components/CategoryInfoModal.vue';

const { t } = useI18n();

const teleportTo = useZcodeTeleportTo();

const props = defineProps<{
  cmsData: ZeroCodeData;
  config?: Partial<CMSConfig>;
  fixedCategory?: 'common' | 'individual' | 'special';
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const replaceFileInputRef = ref<HTMLInputElement | null>(null);
const showCategoryInfoModal = ref(false);

// タブの順序を制御
const categoryOrder = computed(() => props.config?.categoryOrder || 'common');

const categoryTabs = computed(() => {
  const tabs: Array<'common' | 'individual' | 'special'> = [];

  if (categoryOrder.value === 'individual') {
    tabs.push('individual', 'common', 'special');
  } else if (categoryOrder.value === 'special') {
    tabs.push('special', 'common', 'individual');
  } else {
    tabs.push('common', 'individual', 'special');
  }

  return tabs as readonly ('common' | 'individual' | 'special')[];
});

const {
  // 並べ替え
  reorderSourceImage,
  handleReorderClick,

  // 既存
  activeCategory,
  editingImage,
  currentImages,
  addImage,
  replaceEditingImageFile,
  uploading,
  accept,
  canListMedia,
  listMediaImages,
  addMediaImage,
  deleteImage: deleteImageInternal,
  startEditing,
  saveImage,
  cancelEditing,
  checkImageUsage
} = useImagesManager(props.cmsData);

// fixedCategory が指定されていればそれを使用、そうでなければ categoryOrder に基づいて設定
if (props.fixedCategory) {
  activeCategory.value = props.fixedCategory;
} else if (props.config?.categoryOrder === 'individual') {
  activeCategory.value = 'individual';
} else if (props.config?.categoryOrder === 'special') {
  activeCategory.value = 'special';
}

// activeCategoryをexpose
defineExpose({
  activeCategory
});

const imageEditModalRef = ref<HTMLElement | null>(null);
useModalA11y(() => !!editingImage.value, cancelEditing, imageEditModalRef);

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  try {
    await addImage(file);
  } catch (error) {
    logger.error('画像追加エラー:', error);
    alert(imageFileErrorMessage(error, t, accept.value));
  }
}

async function handleReplaceFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  try {
    await replaceEditingImageFile(file);
  } catch (error) {
    logger.error('画像差し替えエラー:', error);
    alert(imageFileErrorMessage(error, t, accept.value));
  }
}

const mediaPickerOpen = ref(false);

function isMediaAdded(media: MediaImage) {
  return currentImages.value.some((image) => image.url === media.url);
}

function handleMediaPick(media: MediaImage) {
  addMediaImage(media);
  mediaPickerOpen.value = false;
}

// アイテムのクラスを動的に生成
function getImageItemClass(image: ImageData) {
  const classes = ['zcode-image-item'];

  // 並べ替えの移動元を強調
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

  deleteImageInternal(image.id);
}
</script>
