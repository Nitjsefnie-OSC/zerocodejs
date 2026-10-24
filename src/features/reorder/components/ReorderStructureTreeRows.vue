<template>
  <li
    v-for="node in nodes"
    :key="node.entry.componentId"
    class="zcode-reorder-structure-block"
    role="listitem"
  >
    <div
      class="zcode-reorder-structure-item"
      :class="{
        'zcode-reorder-structure-item--hovered':
          hoveredPath === node.entry.path && reorderSourcePath !== node.entry.path,
        'zcode-reorder-structure-item--source-selected': reorderSourcePath === node.entry.path
      }"
      :data-zcode-structure-path="node.entry.path"
      :style="{ paddingLeft: `${node.entry.depth * 16 + 10}px` }"
      role="button"
      tabindex="0"
      @click="handleItemClick(node.entry.path, $event)"
      @keydown.enter.prevent="handleItemClick(node.entry.path)"
      @keydown.space.prevent="handleItemClick(node.entry.path)"
      @mouseenter="handleItemMouseEnter(node.entry.path)"
      @mouseleave="handleItemMouseLeave(node.entry.path)"
    >
      <button
        type="button"
        class="zcode-reorder-structure-handle"
        :aria-label="
          $t('reorderPanel.dragHandleAria', {
            label: getStructureEntryPreviewLabel(node.entry)
          })
        "
        @click.stop
      >
        <GripVertical :size="14" />
      </button>
      <div class="zcode-reorder-structure-item-body">
        <div class="zcode-reorder-structure-item-label">
          {{ getStructureEntryPreviewLabel(node.entry) }}
        </div>
      </div>
      <button
        type="button"
        class="zcode-action-btn zcode-reorder-structure-action-btn"
        :class="{ active: reorderSourcePath === node.entry.path }"
        :title="$t('reorderPanel.reorderPartButton')"
        :aria-label="
          $t('reorderPanel.reorderPartButtonAria', {
            label: getStructureEntryPreviewLabel(node.entry)
          })
        "
        @click.stop="emit('reorder-click', node.entry.path)"
      >
        <ArrowUpDown :size="14" />
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import { ArrowUpDown, GripVertical } from '../../../core/icons';
import type { StructureTreeNode } from '../utils/page-reorder';
import { getStructureEntryPreviewLabel } from '../utils/page-reorder';

const props = defineProps<{
  nodes: StructureTreeNode[];
  hoveredPath: string | null;
  reorderSourcePath: string;
  isDragging: boolean;
  suppressLocateClick: boolean;
}>();

const emit = defineEmits<{
  'highlight-path': [path: string | null];
  'locate-path': [path: string];
  'reorder-click': [path: string];
}>();

function handleItemClick(path: string, event?: MouseEvent) {
  if (props.isDragging) {
    return;
  }
  if (props.suppressLocateClick) {
    return;
  }
  if (event?.target instanceof Element && event.target.closest('.zcode-reorder-structure-handle')) {
    return;
  }
  if (
    event?.target instanceof Element &&
    event.target.closest('.zcode-reorder-structure-action-btn')
  ) {
    return;
  }
  emit('locate-path', path);
}

function handleItemMouseEnter(path: string) {
  if (props.isDragging) {
    return;
  }
  emit('highlight-path', path);
}

function handleItemMouseLeave(path: string) {
  if (props.isDragging) {
    return;
  }
  if (props.hoveredPath === path) {
    emit('highlight-path', null);
  }
}
</script>
