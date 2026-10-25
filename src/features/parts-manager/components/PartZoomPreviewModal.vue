<template>
  <Teleport :to="teleportTo">
    <div v-if="show" class="zcode-preview-modal" @click="$emit('close')">
      <div ref="modalContentRef" class="zcode-preview-modal-content" @click.stop>
        <div class="zcode-preview-modal-header">
          <div class="zcode-preview-modal-header-title" role="heading" aria-level="4">
            {{ $t('partsManager.preview') }} {{ title }}
          </div>
          <button class="zcode-close-btn" @click="$emit('close')">
            <X :size="18" />
          </button>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -- 描画処理で無害化済みの HTML -->
        <div class="zcode-preview-modal-body" v-html="html" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from '../../../core/icons';
import { ref } from 'vue';
import { useZcodeTeleportTo } from '../../../core/composables/useZcodeTeleportTo';
import { useModalA11y } from '../../../core/composables/useModalA11y';

const props = defineProps<{
  show: boolean;
  title: string;
  html: string;
}>();

const emit = defineEmits<{ close: [] }>();

const teleportTo = useZcodeTeleportTo();

const modalContentRef = ref<HTMLElement | null>(null);
useModalA11y(
  () => props.show,
  () => emit('close'),
  modalContentRef
);
</script>
