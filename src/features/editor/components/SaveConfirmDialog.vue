<template>
  <div v-if="show" class="zcode-save-confirm-dialog-overlay" @click.self="$emit('cancel')">
    <div
      ref="dialogRef"
      class="zcode-save-confirm-dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('saveConfirm.title')"
    >
      <div class="zcode-save-confirm-dialog-header">
        <div class="zcode-save-confirm-dialog-title" role="heading" aria-level="3">
          {{ $t('saveConfirm.title') }}
        </div>
      </div>
      <div class="zcode-save-confirm-dialog-body">
        <template v-if="targets && targets.length > 0">
          <div class="zcode-save-confirm-dialog-message">{{ $t('saveConfirm.message') }}</div>
          <div class="zcode-save-confirm-targets" role="list">
            <div
              v-for="target in targets"
              :key="target"
              class="zcode-save-confirm-target"
              role="listitem"
            >
              {{ getTargetLabel(target) }}
            </div>
          </div>
        </template>
        <div v-else class="zcode-save-confirm-dialog-message">
          {{ $t('saveConfirm.simpleMessage') }}
        </div>
      </div>
      <div class="zcode-save-confirm-dialog-footer">
        <button class="zcode-btn-secondary" @click="$emit('cancel')">
          {{ $t('common.cancel') }}
        </button>
        <button class="zcode-btn-primary" @click="$emit('confirm')">
          {{ $t('saveConfirm.saveButton') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useModalA11y } from '../../../core/composables/useModalA11y';
import { useI18n } from '../../../i18n';

const props = defineProps<{
  show: boolean;
  /** 保存対象（save-request の targets）。指定がなければ対象を並べずに確認する */
  targets?: string[];
}>();

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const { t } = useI18n();
const dialogRef = ref<HTMLElement | null>(null);

useModalA11y(
  () => props.show,
  () => emit('cancel'),
  dialogRef
);

function getTargetLabel(target: string): string {
  const key = `saveConfirm.targets.${target}`;
  const label = t(key);
  return label === key ? target : label;
}
</script>
