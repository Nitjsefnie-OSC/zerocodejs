<template>
  <Teleport :to="teleportTo">
    <div
      v-if="
        show &&
        (activeCategory === 'common' ||
          activeCategory === 'individual' ||
          activeCategory === 'special')
      "
      class="zcode-help-modal-overlay"
      @click.self="$emit('close')"
    >
      <div ref="modalContentRef" class="zcode-help-modal zcode-css-warning-modal" @click.stop>
        <div class="zcode-help-modal-header">
          <div class="zcode-help-modal-header-title" role="heading" aria-level="3">
            <AlertTriangle :size="20" class="zcode-css-warning-modal-title-icon" />
            <span>{{ $t('partsManager.cssEditWarning') }}</span>
          </div>
          <button class="zcode-close-btn" :aria-label="$t('common.close')" @click="$emit('close')">
            <X :size="20" />
          </button>
        </div>

        <div class="zcode-help-modal-body">
          <div class="zcode-warning-content">
            <div class="zcode-warning-text">
              <ul class="zcode-warning-list">
                <li>
                  <template v-if="activeCategory === 'common'">
                    {{ $t('partsManager.cssEditWarningMessageCommon') }}
                  </template>
                  <template v-else-if="activeCategory === 'individual'">
                    {{ $t('partsManager.cssEditWarningMessageIndividual') }}
                  </template>
                  <template v-else>
                    {{ $t('partsManager.cssEditWarningMessageSpecial') }}
                  </template>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="zcode-css-warning-modal-footer">
          <label class="zcode-checkbox-label" style="margin-bottom: 12px">
            <input v-model="dontShowAgain" type="checkbox" class="zcode-checkbox-input" />
            <span>{{ $t('partsManager.dontShowAgain') }}</span>
          </label>
          <button class="zcode-btn-primary" @click="$emit('close')">
            {{ $t('partsManager.understood') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { X, AlertTriangle } from '../../../core/icons';
import { useZcodeTeleportTo } from '../../../core/composables/useZcodeTeleportTo';
import { useModalA11y } from '../../../core/composables/useModalA11y';

const props = defineProps<{
  show: boolean;
  activeCategory: string;
}>();

const emit = defineEmits<{ close: [] }>();

const dontShowAgain = defineModel<boolean>('dontShowAgain', { required: true });

const teleportTo = useZcodeTeleportTo();

const modalContentRef = ref<HTMLElement | null>(null);
useModalA11y(
  () => props.show,
  () => emit('close'),
  modalContentRef
);
</script>
