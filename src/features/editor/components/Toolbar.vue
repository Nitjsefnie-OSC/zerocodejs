<template>
  <div class="zcode-toolbar">
    <div class="zcode-toolbar-mode-label" aria-hidden="true">
      {{ $t('toolbar.modeLabel') }}
    </div>
    <div class="zcode-toolbar-controls">
      <button
        :class="{ active: viewMode === 'preview' }"
        class="zcode-view-mode-btn zcode-view-mode-preview"
        :aria-label="$t('toolbar.viewMode')"
        :aria-pressed="viewMode === 'preview'"
        @click="$emit('switch-view-mode', viewMode === 'preview' ? 'manage' : 'preview')"
      >
        <Eye :size="16" aria-hidden="true" />
        <span>{{ $t('toolbar.viewMode') }}</span>
      </button>
      <button
        v-if="!availableModes || availableModes.includes('edit')"
        :class="{ active: currentMode === 'edit' && viewMode === 'manage' }"
        class="zcode-mode-btn zcode-mode-edit"
        :aria-label="$t('toolbar.editMode')"
        :aria-pressed="currentMode === 'edit' && viewMode === 'manage'"
        @click="handleModeClick('edit')"
      >
        <Pencil :size="16" aria-hidden="true" />
        <span>{{ $t('toolbar.editMode') }}</span>
      </button>
      <button
        v-if="!availableModes || availableModes.includes('add')"
        :class="{ active: currentMode === 'add' && viewMode === 'manage' }"
        class="zcode-mode-btn zcode-mode-add"
        :aria-label="$t('toolbar.addMode')"
        :aria-pressed="currentMode === 'add' && viewMode === 'manage'"
        @click="handleModeClick('add')"
      >
        <Plus :size="16" aria-hidden="true" />
        <span>{{ $t('toolbar.addMode') }}</span>
      </button>
      <button
        v-if="!availableModes || availableModes.includes('reorder')"
        :class="{ active: currentMode === 'reorder' && viewMode === 'manage' }"
        class="zcode-mode-btn zcode-mode-reorder"
        :aria-label="$t('toolbar.reorderMode')"
        :aria-pressed="currentMode === 'reorder' && viewMode === 'manage'"
        @click="handleModeClick('reorder')"
      >
        <ArrowUpDown :size="16" aria-hidden="true" />
        <span>{{ $t('toolbar.reorderMode') }}</span>
      </button>
      <button
        v-if="!availableModes || availableModes.includes('delete')"
        :class="{ active: currentMode === 'delete' && viewMode === 'manage' }"
        class="zcode-mode-btn zcode-mode-delete"
        :aria-label="$t('toolbar.deleteMode')"
        :aria-pressed="currentMode === 'delete' && viewMode === 'manage'"
        @click="handleModeClick('delete')"
      >
        <Trash2 :size="16" aria-hidden="true" />
        <span>{{ $t('toolbar.deleteMode') }}</span>
      </button>
      <button
        class="zcode-settings-btn"
        :title="$t('toolbar.settings')"
        :aria-label="$t('toolbar.settings')"
        @click="$emit('open-settings')"
      >
        <Settings :size="16" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Pencil, Plus, ArrowUpDown, Trash2, Eye, Settings } from '../../../core/icons';

type ModeType = 'edit' | 'add' | 'reorder' | 'delete';
type ViewModeType = 'preview' | 'manage';

defineProps<{
  currentMode: ModeType;
  viewMode: ViewModeType;
  availableModes?: ModeType[];
  allowDynamicContentInteraction: boolean;
}>();

const emit = defineEmits<{
  'switch-mode': [mode: ModeType];
  'switch-view-mode': [mode: ViewModeType];
  'open-settings': [];
  'toggle-dynamic-content': [enabled: boolean];
}>();

const handleModeClick = (mode: ModeType) => {
  emit('switch-mode', mode);
};
</script>
