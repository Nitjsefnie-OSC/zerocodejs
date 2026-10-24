<template>
  <Teleport :to="teleportTo">
    <div v-if="show" class="zcode-image-modal zcode-media-picker" @click.self="$emit('close')">
      <div ref="modalContentRef" class="zcode-image-modal-content" @click.stop>
        <div class="zcode-image-modal-header">
          <div class="zcode-image-modal-header-title" role="heading" aria-level="3">
            {{ $t('imagesManager.chooseFromMedia') }}
          </div>
          <button class="zcode-close-btn" :aria-label="$t('common.close')" @click="$emit('close')">
            <X :size="18" />
          </button>
        </div>

        <div class="zcode-image-grid" :aria-busy="status === 'loading'">
          <div
            v-for="media in images"
            :key="media.id"
            class="zcode-image-item"
            :class="{ selected: isAdded(media) }"
            role="button"
            tabindex="0"
            @click="$emit('pick', media)"
            @keydown.enter.prevent="$emit('pick', media)"
            @keydown.space.prevent="$emit('pick', media)"
          >
            <span v-if="isAdded(media)" class="zcode-image-item-category-badge">
              {{ $t('imagesManager.mediaAdded') }}
            </span>
            <img :src="media.url" :alt="media.name || media.id" class="zcode-image-item-img" />
            <div class="zcode-image-name">{{ media.name || media.id }}</div>
          </div>
          <div v-if="status !== 'ready' || images.length === 0" class="zcode-media-picker-message">
            {{ message }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { X } from '../../../core/icons';
import { useZcodeTeleportTo } from '../../../core/composables/useZcodeTeleportTo';
import { useModalA11y } from '../../../core/composables/useModalA11y';
import { useI18n } from '../../../i18n';
import { logger } from '../../../core/utils/logger';
import type { MediaImage } from '../../../types';

const props = defineProps<{
  show: boolean;
  load: () => Promise<MediaImage[]>;
  isAdded: (media: MediaImage) => boolean;
}>();

const emit = defineEmits<{ close: []; pick: [media: MediaImage] }>();

const { t } = useI18n();
const teleportTo = useZcodeTeleportTo();

const images = ref<MediaImage[]>([]);
const status = ref<'loading' | 'ready' | 'failed'>('loading');
let loadId = 0;

const message = computed(() => {
  if (status.value === 'loading') return t('imagesManager.mediaLoading');
  if (status.value === 'failed') return t('imagesManager.mediaLoadFailed');
  return t('imagesManager.mediaEmpty');
});

watch(
  () => props.show,
  async (show) => {
    if (!show) return;
    const id = ++loadId;
    images.value = [];
    status.value = 'loading';
    try {
      const list = await props.load();
      if (id !== loadId) return;
      images.value = Array.isArray(list) ? list.filter((media) => media?.id && media?.url) : [];
      status.value = 'ready';
    } catch (error) {
      if (id !== loadId) return;
      logger.error('listImages failed:', error);
      status.value = 'failed';
    }
  },
  { immediate: true }
);

const modalContentRef = ref<HTMLElement | null>(null);
useModalA11y(
  () => props.show,
  () => emit('close'),
  modalContentRef
);
</script>

<style scoped>
.zcode-media-picker {
  z-index: 3100;
}

.zcode-media-picker-message {
  grid-column: 1 / -1;
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: #6b7280;
}
</style>
