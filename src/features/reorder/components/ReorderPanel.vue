<template>
  <div v-if="currentMode === 'reorder'" class="zcode-reorder-panel" @click.stop>
    <div class="zcode-reorder-panel-header">
      <div class="zcode-panel-header-title" role="heading" aria-level="3">
        {{ $t('reorderPanel.title') }}
      </div>
      <div class="zcode-reorder-panel-header-actions">
        <div ref="optionsAnchorRef" class="zcode-reorder-panel-options-anchor">
          <button
            type="button"
            class="zcode-reorder-panel-options-trigger"
            :class="{ 'is-active': optionsPopoverOpen }"
            :aria-expanded="optionsPopoverOpen"
            :aria-label="$t('reorderPanel.optionsAriaLabel')"
            :title="$t('reorderPanel.optionsAriaLabel')"
            @click.stop="toggleOptionsPopover"
          >
            <Settings :size="18" />
          </button>
          <div
            v-show="optionsPopoverOpen"
            class="zcode-reorder-panel-options-popover"
            role="region"
            :aria-label="$t('reorderPanel.optionsPopoverTitle')"
            tabindex="-1"
          >
            <div class="zcode-reorder-panel-options-popover-title">
              {{ $t('reorderPanel.optionsPopoverTitle') }}
            </div>
            <label class="zcode-reorder-option-label">
              <input
                type="checkbox"
                :checked="showStructureLabels"
                class="zcode-keep-adding-checkbox"
                @change="
                  $emit('update:show-structure-labels', ($event.target as HTMLInputElement).checked)
                "
              />
              <span>{{ $t('reorderPanel.showStructureLabels') }}</span>
            </label>
            <button type="button" class="zcode-panel-options-reset" @click="emit('reset-options')">
              {{ $t('reorderPanel.resetOptions') }}
            </button>
          </div>
        </div>
        <button class="zcode-close-btn" :aria-label="$t('common.close')" @click="$emit('cancel')">
          <X :size="18" />
        </button>
      </div>
    </div>

    <div v-if="canSelectParent && reorderSourcePath" class="zcode-parent-selector">
      <button class="zcode-parent-select-btn" @click="$emit('select-parent')">
        <ChevronUp :size="16" />
        <span>{{ $t('reorderPanel.selectParent') }}</span>
      </button>
    </div>

    <div class="zcode-reorder-panel-content">
      <template v-if="structureView">
        <div v-if="structureView.slotName" class="zcode-reorder-structure-group-label">
          {{ $t('reorderPanel.slotGroup', { name: structureView.slotName }) }}
        </div>
        <div v-else class="zcode-reorder-structure-group-label">
          {{ $t('reorderPanel.pageGroup') }}
        </div>

        <ul
          v-if="structureView.nodes.length > 0"
          ref="structureRootRef"
          :key="structureTreeKey"
          class="zcode-reorder-structure-list"
          :data-reorder-group="structureView.groupId"
          role="list"
        >
          <ReorderStructureTreeRows
            :nodes="structureView.nodes"
            :hovered-path="hoveredPath"
            :reorder-source-path="reorderSourcePath"
            :is-dragging="isDragging"
            :suppress-locate-click="suppressLocateClick"
            @highlight-path="handleHighlightPath"
            @locate-path="(path) => emit('locate-path', path)"
            @reorder-click="(path) => emit('reorder-click', path)"
          />
        </ul>

        <div v-else class="zcode-reorder-structure-empty">
          {{ $t('reorderPanel.emptyGroup') }}
        </div>
      </template>

      <div v-else class="zcode-reorder-structure-empty">
        {{ $t('reorderPanel.emptyPage') }}
      </div>

      <div class="zcode-reorder-panel-footnotes">
        <p class="zcode-reorder-panel-help">
          {{ $t('reorderPanel.panelHelp') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ChevronUp, Settings, X } from '../../../core/icons';
import type { ZeroCodeData } from '../../../types';
import { usePanelOptionsPopover } from '../../editor/composables/usePanelOptionsPopover';
import { buildStructureGroupViewByGroupId, buildStructureTreeKey } from '../utils/page-reorder';
import { useReorderStructureSortables } from '../composables/useReorderStructureSortables';
import ReorderStructureTreeRows from './ReorderStructureTreeRows.vue';

const props = defineProps<{
  cmsData: ZeroCodeData;
  reorderSourcePath: string;
  structureListGroupId: string | null;
  hoveredPath: string | null;
  currentMode: 'edit' | 'add' | 'reorder' | 'delete';
  canSelectParent: boolean;
  showStructureLabels: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  'select-parent': [];
  'structure-reorder': [groupId: string, oldIndex: number, newIndex: number];
  'highlight-path': [path: string | null];
  'locate-path': [path: string];
  'reorder-click': [path: string];
  'drag-state-change': [dragging: boolean];
  'update:show-structure-labels': [value: boolean];
  'reset-options': [];
}>();

const structureRootRef = ref<HTMLElement | null>(null);
const optionsAnchorRef = ref<HTMLElement | null>(null);
const { optionsPopoverOpen, toggleOptionsPopover } = usePanelOptionsPopover(optionsAnchorRef);

const structureView = computed(() => {
  if (!props.structureListGroupId) {
    return null;
  }
  return buildStructureGroupViewByGroupId(props.cmsData, props.structureListGroupId);
});
const structureTreeKey = computed(() => {
  if (!structureView.value) {
    return 'empty';
  }
  return `${props.structureListGroupId}|${buildStructureTreeKey(structureView.value.nodes)}`;
});
const isReorderMode = computed(() => props.currentMode === 'reorder');

const { isDragging, suppressLocateClick } = useReorderStructureSortables({
  rootRef: structureRootRef,
  enabled: isReorderMode,
  treeKey: structureTreeKey,
  onReorder: (groupId, oldIndex, newIndex) => {
    emit('structure-reorder', groupId, oldIndex, newIndex);
  },
  onDragEnd: () => {
    emit('highlight-path', null);
  }
});

watch(isDragging, (dragging) => {
  emit('drag-state-change', dragging);
});

function handleHighlightPath(path: string | null) {
  if (isDragging.value && path !== null) {
    return;
  }
  emit('highlight-path', path);
}
</script>
