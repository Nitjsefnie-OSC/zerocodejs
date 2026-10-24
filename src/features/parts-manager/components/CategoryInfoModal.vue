<template>
  <Teleport :to="teleportTo">
    <div v-if="show" class="zcode-help-modal-overlay" @click.self="$emit('close')">
      <div ref="modalContentRef" class="zcode-help-modal" @click.stop>
        <div class="zcode-help-modal-header">
          <div class="zcode-help-modal-header-title" role="heading" aria-level="3">
            <Info :size="20" class="zcode-css-warning-modal-title-icon" />
            <span>{{ $t('dataViewer.categoryInfo.title') }}</span>
          </div>
          <button class="zcode-close-btn" :aria-label="$t('common.close')" @click="$emit('close')">
            <X :size="18" />
          </button>
        </div>
        <div class="zcode-help-modal-body">
          <div
            v-for="category in ['common', 'individual', 'special']"
            :key="category"
            class="zcode-help-section"
          >
            <div class="zcode-help-section-title" role="heading" aria-level="4">
              {{ $t(`dataViewer.categoryInfo.${category}.title`) }}
            </div>
            <div class="zcode-help-section-item">
              {{ $t(`dataViewer.categoryInfo.${category}.description`) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X, Info } from '../../../core/icons';
import { ref } from 'vue';
import { useZcodeTeleportTo } from '../../../core/composables/useZcodeTeleportTo';
import { useModalA11y } from '../../../core/composables/useModalA11y';

const props = defineProps<{ show: boolean }>();

const emit = defineEmits<{ close: [] }>();

const teleportTo = useZcodeTeleportTo();

const modalContentRef = ref<HTMLElement | null>(null);
useModalA11y(
  () => props.show,
  () => emit('close'),
  modalContentRef
);
</script>
