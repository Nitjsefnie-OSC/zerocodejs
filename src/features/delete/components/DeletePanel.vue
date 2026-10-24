<template>
  <div
    v-if="deleteConfirmComponent && currentMode === 'delete'"
    class="zcode-delete-panel"
    @click.stop
  >
    <div class="zcode-delete-panel-header">
      <div class="zcode-panel-header-title" role="heading" aria-level="3">
        {{ $t('deletePanel.title') }}
      </div>
      <div class="zcode-delete-panel-header-actions">
        <div ref="deleteOptionsAnchorRef" class="zcode-delete-panel-options-anchor">
          <button
            type="button"
            class="zcode-delete-panel-options-trigger"
            :class="{ 'is-active': optionsPopoverOpen }"
            :aria-expanded="optionsPopoverOpen"
            :aria-label="$t('deletePanel.optionsAriaLabel')"
            :title="$t('deletePanel.optionsAriaLabel')"
            @click.stop="toggleOptionsPopover"
          >
            <Settings :size="18" />
          </button>
          <div
            v-show="optionsPopoverOpen"
            class="zcode-delete-panel-options-popover"
            role="region"
            :aria-label="$t('deletePanel.optionsPopoverTitle')"
            tabindex="-1"
          >
            <div class="zcode-delete-panel-options-popover-title">
              {{ $t('deletePanel.optionsPopoverTitle') }}
            </div>
            <label class="zcode-delete-option-label">
              <input
                type="checkbox"
                :checked="continueDeleteAfter"
                class="zcode-keep-adding-checkbox"
                @change="
                  $emit('update:continue-delete-after', ($event.target as HTMLInputElement).checked)
                "
              />
              <span>{{ $t('deletePanel.continueDeleteAfter') }}</span>
            </label>
            <button type="button" class="zcode-panel-options-reset" @click="$emit('reset-options')">
              {{ $t('deletePanel.resetOptions') }}
            </button>
          </div>
        </div>
        <button class="zcode-close-btn" :aria-label="$t('common.close')" @click="$emit('cancel')">
          <X :size="18" />
        </button>
      </div>
    </div>

    <div v-if="canSelectParent" class="zcode-parent-selector">
      <button class="zcode-parent-select-btn" @click="$emit('select-parent')">
        <ChevronUp :size="16" />
        <span>{{ $t('deletePanel.selectParent') }}</span>
      </button>
    </div>

    <div class="zcode-delete-panel-content">
      <div class="zcode-delete-warning">
        <AlertTriangle :size="20" class="zcode-delete-warning-icon" />
        <div class="zcode-delete-warning-text">
          {{ $t('deletePanel.confirmMessage') }}
        </div>
      </div>

      <div class="zcode-delete-actions">
        <button class="zcode-btn-danger" @click="$emit('confirm')">
          <Trash2 :size="16" />
          <span>{{ $t('common.delete') }}</span>
        </button>
        <button class="zcode-btn-cancel" @click="$emit('cancel')">
          <X :size="16" />
          <span>{{ $t('common.cancel') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ComponentData } from '../../../types';
import { usePanelOptionsPopover } from '../../editor/composables/usePanelOptionsPopover';
import { ChevronUp, AlertTriangle, Trash2, X, Settings } from '../../../core/icons';

defineProps<{
  deleteConfirmComponent: ComponentData | null;
  currentMode: 'edit' | 'add' | 'reorder' | 'delete';
  canSelectParent: boolean;
  continueDeleteAfter: boolean;
}>();

defineEmits<{
  confirm: [];
  cancel: [];
  'select-parent': [];
  'update:continue-delete-after': [value: boolean];
  'reset-options': [];
}>();

const deleteOptionsAnchorRef = ref<HTMLElement | null>(null);
const { optionsPopoverOpen, toggleOptionsPopover } = usePanelOptionsPopover(deleteOptionsAnchorRef);
</script>
