<template>
  <div
    ref="containerRef"
    class="zcode-cms-container"
    :class="{
      'zcode-dev-padding': devRightPadding && isPanelVisible,
      'zcode-editor-mode-add': currentMode === 'add' && viewMode === 'manage',
      'zcode-show-add-between-buttons': showAddBetweenButtons
    }"
  >
    <Toolbar
      v-if="!embedded"
      :current-mode="currentMode"
      :view-mode="viewMode"
      :allow-dynamic-content-interaction="allowDynamicContentInteraction"
      @switch-mode="handleToolbarSwitchMode"
      @switch-view-mode="(mode) => (viewMode = mode)"
      @open-settings="settingsPanelOpen = true"
    />

    <div
      v-if="saveErrorBanner.visible"
      class="zcode-save-banner zcode-save-banner--error"
      role="alert"
    >
      <div class="zcode-save-banner-text">
        {{ saveErrorBanner.message }}
      </div>
      <button
        class="zcode-save-banner-close"
        :aria-label="$t('common.close')"
        @click="saveErrorBanner.visible = false"
      >
        ×
      </button>
    </div>

    <!-- 保存ボタン（左下固定、管理モードの時のみ表示。Editor / Studio の中では外側が出す） -->
    <div v-if="viewMode === 'manage' && !embedded" class="zcode-save-controls-fixed">
      <button class="zcode-save-btn" :aria-label="$t('common.save')" @click="requestSave">
        <Save :size="16" aria-hidden="true" />
        <span>{{ $t('common.save') }}</span>
      </button>
    </div>

    <!-- 表示モード: プレビューのみ（表示専用、動的コンテンツは常に有効） -->
    <ZeroCodePreview
      v-if="viewMode === 'preview'"
      :cms-data="cmsData"
      :allow-dynamic-content-interaction="true"
    />

    <!-- 管理モード: 既存の編集機能 -->
    <template v-if="viewMode === 'manage'">
      <!-- プレビューエリア（編集機能あり） -->
      <PreviewArea
        ref="previewAreaRef"
        :cms-data="cmsData"
        :full-page-html="fullPageHtml"
        :on-add-click="handleEmptyStateAddClick"
        :allow-dynamic-content-interaction="allowDynamicContentInteraction"
      />

      <!-- 編集パネル -->
      <EditPanel
        :editing-component="editingComponent"
        :editing-available-fields="editingAvailableFields"
        :field-errors="fieldErrors"
        :current-mode="currentMode"
        :can-select-parent="canSelectParent"
        :cms-data="cmsData"
        :page-id="pageId"
        @close="closeEditPanel"
        @select-parent="selectParentElement"
        @save-field="handleSaveFieldEdit"
      />

      <!-- 削除確認パネル -->
      <DeletePanel
        :delete-confirm-component="deleteConfirmComponent"
        :current-mode="currentMode"
        :can-select-parent="canSelectParent"
        :continue-delete-after="continueDeleteAfter"
        @confirm="confirmDelete"
        @cancel="cancelDelete"
        @select-parent="selectParentElement"
        @update:continue-delete-after="continueDeleteAfter = $event"
        @reset-options="resetDeletePanelOptions"
      />

      <!-- 並べ替えパネル -->
      <ReorderPanel
        v-if="currentMode === 'reorder' && structureListGroupId"
        :cms-data="cmsData"
        :reorder-source-path="reorderSourcePath"
        :structure-list-group-id="structureListGroupId"
        :hovered-path="structureListHoveredPath"
        :current-mode="currentMode"
        :can-select-parent="canSelectParent"
        :show-structure-labels="showReorderStructureLabels"
        @cancel="handleReorderPanelClose"
        @select-parent="selectParentElement"
        @structure-reorder="reorderStructureByDragIndices"
        @highlight-path="setStructureListHoveredPath"
        @locate-path="onStructureListLocate"
        @reorder-click="onStructureListReorderClick"
        @drag-state-change="reorderListDragging = $event"
        @update:show-structure-labels="showReorderStructureLabels = $event"
        @reset-options="resetReorderPanelOptions"
      />

      <!-- パーツ選択パネル -->
      <AddPanel
        :add-target-path="addTargetPath"
        :add-part-category="addPartCategory"
        :add-type-tab="addTypeTab"
        :add-selected-part="addSelectedPart"
        :add-selected-type="addSelectedType"
        :has-special-parts="hasSpecialParts"
        :clicked-component="clickedComponent"
        :available-part-types="availablePartTypes"
        :config="config"
        :grouped-parts-by-type="groupedPartsByType"
        :can-select-parent="canSelectParent"
        :get-part-preview-html="getPartPreviewHtml"
        :get-clicked-component-preview-html="getClickedComponentPreviewHtml"
        :add-insert-before="addInsertBefore"
        :edit-after-add="editAfterAdd"
        :show-add-between-buttons="showAddBetweenButtons"
        @cancel="cancelAdd"
        @select-parent="selectParentElement"
        @category-tab-click="handleCategoryTabClick"
        @type-tab-click="handleTypeTabClick"
        @select-part="selectPart"
        @duplicate-selected="duplicateSelectedPart"
        @update:add-insert-before="setAddInsertBeforeUserOption"
        @update:edit-after-add="editAfterAdd = $event"
        @update:show-add-between-buttons="showAddBetweenButtons = $event"
        @reset-options="resetAddPanelOptions"
      />
    </template>

    <!-- 設定パネル -->
    <SettingsPanel
      :is-open="settingsPanelOpen"
      :view-mode="viewMode"
      mode="toolbar"
      :allow-dynamic-content-interaction="allowDynamicContentInteraction"
      :dev-right-padding="devRightPaddingValue"
      :enable-context-menu="enableContextMenu"
      :show-part-discovery-outlines="showPartDiscoveryOutlines"
      :scroll-into-view-on-part-edit="scrollIntoViewOnPartEdit"
      :show-save-confirm="showSaveConfirm"
      @close="settingsPanelOpen = false"
      @toggle-dynamic-content="allowDynamicContentInteraction = $event"
      @toggle-dev-padding="devRightPadding = $event"
      @toggle-context-menu="enableContextMenu = $event"
      @toggle-part-discovery-outlines="showPartDiscoveryOutlines = $event"
      @toggle-scroll-on-part-edit="scrollIntoViewOnPartEdit = $event"
      @toggle-save-confirm="showSaveConfirm = $event"
      @reset-toolbar-settings="resetToolbarSettings"
    />

    <!-- コンテキストメニュー -->
    <ContextMenu
      :is-visible="contextMenuVisible"
      :position="contextMenuPosition"
      :current-mode="currentMode"
      @select-mode="handleContextMenuModeSelect"
      @close="closeContextMenu"
    />

    <SaveConfirmDialog :show="showSaveConfirmDialog" @confirm="confirmSave" @cancel="cancelSave" />

    <!-- Teleport 用（Shadow DOM 内にモーダル向け。Editor 埋め込み時は provide なし） -->
    <div v-if="!embedded" ref="teleportTargetRef" class="zcode-teleport-root" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, provide, type Ref } from 'vue';
import { zcodeRichTextConfigKey, zcodeTeleportTargetKey } from '../core/injectionKeys';
import { resolveRichTextConfig } from '../features/editor/rich-text/features';
import { Save } from '../core/icons';
import ZeroCodePreview from './ZeroCodePreview.vue';
import PreviewArea from '../features/preview/PreviewArea.vue';
import Toolbar from '../features/editor/components/Toolbar.vue';
import SettingsPanel from '../features/editor/components/SettingsPanel.vue';
import EditPanel from '../features/editor/components/EditPanel.vue';
import DeletePanel from '../features/delete/components/DeletePanel.vue';
import ReorderPanel from '../features/reorder/components/ReorderPanel.vue';
import AddPanel from '../features/add/components/AddPanel.vue';
import ContextMenu from '../features/editor/components/ContextMenu.vue';
import { useZeroCodeData } from '../core/composables/useZeroCodeData';
import { useHostEvents } from '../core/composables/useHostEvents';
import { useSaveResult } from '../features/editor/composables/useSaveResult';
import { useSaveRequest } from '../features/editor/composables/useSaveRequest';
import { useCmsSettings } from '../features/editor/composables/useCmsSettings';
import SaveConfirmDialog from '../features/editor/components/SaveConfirmDialog.vue';
import { useZeroCodeRenderer } from '../core/composables/useZeroCodeRenderer';
import { useEditorMode, type EditorMode } from '../features/editor/composables/useEditorMode';
import { useEditMode } from '../features/editor/composables/useEditMode';
import { useAddMode, type AddModeActions } from '../features/add/composables/useAddMode';
import { useDeleteMode } from '../features/delete/composables/useDeleteMode';
import { useReorderMode } from '../features/reorder/composables/useReorderMode';
import { useParentSelector } from '../features/parent-selector/composables/useParentSelector';
import { useClickHandlers } from '../features/editor/composables/useClickHandlers';
import { useDiscoveryOutlines } from '../features/editor/composables/useDiscoveryOutlines';
import { useReorderTargetOutlines } from '../features/editor/composables/useReorderTargetOutlines';
import { useReorderStructureLabels } from '../features/reorder/composables/useReorderStructureLabels';
import { useModeSwitcher } from '../features/editor/composables/useModeSwitcher';
import {
  canHandoffPathToAddMode,
  resolveComponentPathForMode
} from '../features/editor/composables/mode-selection-handoff';
import { getComponentByPath } from '../core/utils/path-utils';
import { useContextMenu } from '../features/editor/composables/useContextMenu';
import { validateData as validateDataUtil } from '../core/utils/validation';
import { saveCMSSettings } from '../core/utils/storage';
import {
  resolveCmsSettingDefault,
  TOOLBAR_CMS_SETTING_KEYS,
  ADD_PANEL_CMS_SETTING_KEYS,
  REORDER_PANEL_CMS_SETTING_KEYS
} from '../core/utils/cms-settings-reset';
import { parseConfig } from '../core/utils/config';
import { PAGE_SAVE_TARGETS } from '../core/utils/save-targets';
import type { CMSConfig } from '../types';
import type { ZeroCodeDataProps } from './props';
import { provideZeroCodeHost } from '../core/composables/useZeroCodeHost';

const props = defineProps<
  ZeroCodeDataProps & {
    /** ZeroCodeEditor / Studio の中で使う（ツールバー・保存ボタン・Teleport 先は外側が出す） */
    embedded?: boolean;
  }
>();

const teleportTargetRef = ref<HTMLElement | null>(null);
if (!props.embedded) {
  provide(zcodeTeleportTargetKey, teleportTargetRef);
}

const viewMode = ref<'preview' | 'manage'>('manage');
const settingsPanelOpen = ref(false);

const config: Partial<CMSConfig> = parseConfig(props.config, 'ZeroCodeCMS');
provide(zcodeRichTextConfigKey, resolveRichTextConfig(config.richText));
const host = provideZeroCodeHost({
  source: 'cms',
  hooks: () => props.hooks,
  images: config.images
});

const {
  devRightPadding,
  enableContextMenu,
  showSaveConfirm,
  scrollIntoViewOnPartEdit,
  showPartDiscoveryOutlines,
  showAddBetweenButtons,
  showReorderStructureLabels,
  resetSettings
} = useCmsSettings(config);
const devRightPaddingValue = computed(() => devRightPadding.value);

const { cmsData, loadDataFromProps, getData: getDataBase, setData } = useZeroCodeData(props);
const { fullPageHtml, renderComponentPreviewHtml } = useZeroCodeRenderer(cmsData, true);

function getData(path?: string) {
  if (path === 'css') {
    return undefined;
  }

  if (!path) {
    return getDataBase();
  }

  return getDataBase(path);
}

const containerRef = ref<HTMLElement | null>(null);
const { getHostElement, dispatchEvent } = useHostEvents(containerRef);
const previewAreaRef = ref<InstanceType<typeof PreviewArea> | null>(null);
const previewArea = computed(() => {
  const exposed = previewAreaRef.value?.previewArea;
  if (exposed instanceof HTMLElement) {
    return exposed;
  }
  if (exposed && typeof exposed === 'object' && 'value' in exposed) {
    const unwrapped = (exposed as Ref<HTMLElement | null>).value;
    return unwrapped instanceof HTMLElement ? unwrapped : null;
  }
  return null;
});

const {
  currentMode,
  switchMode: switchModeBase,
  allowDynamicContentInteraction: allowDynamicContentInteractionBase
} = useEditorMode();

// localStorageからallowDynamicContentInteractionを読み込み（デフォルトはfalse）
const savedAllowDynamicContentInteraction = resolveCmsSettingDefault(
  'allowDynamicContentInteraction',
  config
);
const allowDynamicContentInteraction = ref(savedAllowDynamicContentInteraction);
allowDynamicContentInteractionBase.value = savedAllowDynamicContentInteraction;

let savedAllowDynamicContentInteractionForPreview = false;

watch(viewMode, (newMode, oldMode) => {
  if (newMode === 'preview') {
    savedAllowDynamicContentInteractionForPreview = allowDynamicContentInteraction.value;
    allowDynamicContentInteraction.value = true;
    allowDynamicContentInteractionBase.value = true;
    // Shadow DOM内の値を更新
    nextTick(() => {
      updateShadowDOMAllowDynamicContentInteraction();
    });
  } else if (oldMode === 'preview') {
    allowDynamicContentInteraction.value = savedAllowDynamicContentInteractionForPreview;
    allowDynamicContentInteractionBase.value = savedAllowDynamicContentInteractionForPreview;
    // Shadow DOM内の値を更新
    nextTick(() => {
      updateShadowDOMAllowDynamicContentInteraction();
    });
  }

  // 表示モード変更イベントを発火
  dispatchEvent('view-mode-changed', {
    mode: newMode,
    previousMode: oldMode
  });
});

const addModeActions: AddModeActions = {};

const {
  editingComponent,
  editingComponentPath,
  editingAvailableFields,
  handleEditClick,
  saveFieldEdit,
  closeEditPanel
} = useEditMode(cmsData, previewArea, scrollIntoViewOnPartEdit);

addModeActions.handleEditClick = handleEditClick;

const { fieldErrors, saveErrorBanner, clearFieldError } = useSaveResult(
  getHostElement,
  editingComponentPath
);

type EditableField = Parameters<typeof saveFieldEdit>[0];

function handleSaveFieldEdit(field: EditableField) {
  if (field?.fieldName) clearFieldError(field.fieldName);
  saveFieldEdit(field);
}

const {
  addTargetPath,
  addSelectedType,
  addSelectedPart,
  clickedComponent,
  addPartCategory,
  addTypeTab,
  addInsertBefore,
  insertBeforeActive,
  setAddInsertBeforeUserOption,
  editAfterAdd,
  availablePartTypes,
  groupedPartsByType,
  hasSpecialParts,
  handleAddClick,
  handleCategoryTabClick,
  handleTypeTabClick,
  selectPart,
  duplicateSelectedPart,
  getPartPreviewHtml,
  getClickedComponentPreviewHtml,
  cancelAdd
} = useAddMode(
  cmsData,
  previewArea,
  renderComponentPreviewHtml,
  config,
  scrollIntoViewOnPartEdit,
  addModeActions
);

const {
  reorderSourcePath,
  handleReorderClick,
  canReorderWith,
  cancelReorder,
  reorderStructureByDragIndices,
  setStructureListHoveredPath,
  structureListHoveredPath,
  structureListGroupId,
  applyReorderHandoff,
  leaveReorderStructureList,
  closeReorderPanel,
  handleStructureListLocate,
  handleStructureListReorderClick
} = useReorderMode(cmsData, previewArea, scrollIntoViewOnPartEdit);

const reorderListDragging = ref(false);

function onStructureListLocate(path: string) {
  if (reorderListDragging.value) {
    return;
  }
  handleStructureListLocate(path);
}

function onStructureListReorderClick(path: string) {
  if (reorderListDragging.value) {
    return;
  }
  handleStructureListReorderClick(path);
}

function handleReorderPanelClose() {
  closeReorderPanel();
}

const {
  deleteConfirmComponent,
  deleteConfirmPath,
  continueDeleteAfter,
  handleDeleteClick,
  confirmDelete,
  cancelDelete
} = useDeleteMode(cmsData, previewArea, switchModeBase, nextTick, scrollIntoViewOnPartEdit);

const { switchMode: switchModeWithHandoff } = useModeSwitcher(
  previewArea,
  currentMode,
  switchModeBase,
  editingComponentPath,
  addTargetPath,
  reorderSourcePath,
  deleteConfirmPath,
  closeEditPanel,
  cancelDelete,
  cancelAdd,
  cancelReorder,
  {
    applyForMode(mode, path) {
      switch (mode) {
        case 'edit': {
          const resolved = resolveComponentPathForMode(path, cmsData);
          if (!resolved) {
            return;
          }
          const component = getComponentByPath(resolved, cmsData);
          if (component) {
            handleEditClick(resolved, component);
          }
          break;
        }
        case 'add': {
          if (!canHandoffPathToAddMode(path, cmsData)) {
            return;
          }
          handleAddClick(path);
          break;
        }
        case 'reorder': {
          const resolved = resolveComponentPathForMode(path, cmsData);
          if (resolved) {
            applyReorderHandoff(resolved);
          }
          break;
        }
        case 'delete': {
          const resolved = resolveComponentPathForMode(path, cmsData);
          if (!resolved) {
            return;
          }
          const component = getComponentByPath(resolved, cmsData);
          if (component) {
            handleDeleteClick(resolved, component);
          }
          break;
        }
      }
    }
  }
);

function switchMode(mode: EditorMode) {
  if (mode === currentMode.value) {
    return;
  }
  switchModeWithHandoff(mode);
}

function handleToolbarSwitchMode(mode: EditorMode) {
  if (viewMode.value === 'preview') {
    viewMode.value = 'manage';
    nextTick(() => {
      switchMode(mode);
    });
    return;
  }
  switchMode(mode);
}

addModeActions.switchMode = switchMode;

function handleEmptyStateAddClick(path: string) {
  if (currentMode.value !== 'add') {
    switchMode('add');
    nextTick(() => {
      handleAddClick(path);
    });
    return;
  }
  handleAddClick(path);
}

// 親要素選択機能
const currentSelectedPath = computed(() => {
  if (currentMode.value === 'edit' && editingComponentPath.value) {
    return editingComponentPath.value;
  }
  if (currentMode.value === 'add' && addTargetPath.value) {
    return addTargetPath.value;
  }
  if (currentMode.value === 'reorder' && reorderSourcePath.value) {
    return reorderSourcePath.value;
  }
  if (currentMode.value === 'delete' && deleteConfirmPath.value) {
    return deleteConfirmPath.value;
  }
  return null;
});

const { canSelectParent, selectParentElement } = useParentSelector(
  cmsData,
  previewArea,
  currentMode,
  currentSelectedPath,
  handleEditClick,
  handleAddClick,
  handleReorderClick,
  handleDeleteClick,
  reorderSourcePath
);

// パネル表示有無（編集／追加／並べ替え／削除のいずれかがアクティブ）
const isPanelVisible = computed(() => {
  return !!(
    editingComponent.value ||
    addTargetPath.value ||
    (currentMode.value === 'reorder' && structureListGroupId.value) ||
    deleteConfirmComponent.value
  );
});

const updateShadowDOMAllowDynamicContentInteraction = () => {
  if (previewArea.value) {
    const rootNode = previewArea.value.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      type ShadowRootWithZCMS = ShadowRoot & {
        __zcmsSetAllowDynamicContentInteraction?: (value: boolean) => void;
      };
      const maxRetries = 30;
      const retryIntervalMs = 50;
      let tries = 0;

      const apply = () => {
        tries++;
        const zcmsRoot = rootNode as ShadowRootWithZCMS;
        if (typeof zcmsRoot.__zcmsSetAllowDynamicContentInteraction === 'function') {
          zcmsRoot.__zcmsSetAllowDynamicContentInteraction(allowDynamicContentInteraction.value);
          return;
        }
        if (tries < maxRetries) {
          setTimeout(apply, retryIntervalMs);
        }
      };

      apply();
    }
  }
};

const { syncDiscoveryOutlines } = useDiscoveryOutlines(
  previewArea,
  viewMode,
  currentMode,
  showPartDiscoveryOutlines,
  editingComponentPath,
  addTargetPath,
  reorderSourcePath,
  deleteConfirmPath
);

const { syncReorderTargetOutlines } = useReorderTargetOutlines(
  previewArea,
  viewMode,
  currentMode,
  reorderSourcePath,
  canReorderWith
);

const { syncStructureLabels, clearStructureLabels } = useReorderStructureLabels(
  previewArea,
  viewMode,
  currentMode,
  structureListGroupId,
  showReorderStructureLabels,
  cmsData
);

function syncManageOutlines() {
  syncDiscoveryOutlines();
  syncReorderTargetOutlines();
  syncStructureLabels();
}

// クリックハンドラー
const { setupClickHandlers, cleanupEventListeners } = useClickHandlers(
  cmsData,
  previewArea,
  containerRef,
  currentMode,
  editingComponentPath,
  addTargetPath,
  insertBeforeActive,
  reorderSourcePath,
  reorderListDragging,
  deleteConfirmPath,
  handleEditClick,
  handleAddClick,
  handleReorderClick,
  handleDeleteClick,
  canReorderWith,
  switchMode,
  allowDynamicContentInteraction,
  closeEditPanel,
  cancelAdd,
  cancelDelete,
  cancelReorder,
  syncManageOutlines
);

// コンテキストメニュー
const {
  isVisible: contextMenuVisible,
  position: contextMenuPosition,
  handleModeSelect: handleContextMenuModeSelect,
  closeMenu: closeContextMenu,
  setupContextMenu,
  cleanupContextMenu
} = useContextMenu(previewArea, enableContextMenu, switchMode);

onMounted(() => {
  loadDataFromProps();

  nextTick(() => {
    setupClickHandlers();
    if (enableContextMenu.value) {
      setupContextMenu();
    }
    // Shadow DOM内の値を初期化
    updateShadowDOMAllowDynamicContentInteraction();
    dispatchEvent('zcode-dom-updated', {});
  });
});

onUnmounted(() => {
  cleanupEventListeners();
  cleanupContextMenu();
});

watch(
  [
    () => props.page,
    () => props.cssCommon,
    () => props.cssIndividual,
    () => props.cssSpecial,
    () => props.partsCommon,
    () => props.partsIndividual,
    () => props.partsSpecial,
    () => props.imagesCommon,
    () => props.imagesIndividual,
    () => props.imagesSpecial
  ],
  () => {
    loadDataFromProps();
  }
);

watch(
  cmsData,
  () => {
    nextTick(() => {
      setupClickHandlers();
      syncStructureLabels();
      dispatchEvent('zcode-dom-updated', {});
    });
  },
  { deep: true }
);

watch([viewMode, previewArea, containerRef], ([newViewMode, newPreviewArea, newContainerRef]) => {
  if (newViewMode === 'manage' && newPreviewArea && newContainerRef) {
    nextTick(() => {
      setupClickHandlers();
      if (enableContextMenu.value) {
        setupContextMenu();
      }
      updateShadowDOMAllowDynamicContentInteraction();
      syncStructureLabels();
      dispatchEvent('zcode-dom-updated', {});
    });
  } else {
    cleanupContextMenu();
    nextTick(() => {
      syncManageOutlines();
    });
  }
});

watch(currentMode, (_mode, oldMode) => {
  if (oldMode === 'reorder') {
    leaveReorderStructureList();
    clearStructureLabels();
  }

  nextTick(() => {
    syncDiscoveryOutlines({ pulse: true });
    syncReorderTargetOutlines();
    syncStructureLabels();
    dispatchEvent('zcode-dom-updated', {});
  });
});

watch(structureListGroupId, () => {
  nextTick(() => {
    syncStructureLabels();
  });
});

watch(reorderSourcePath, (newPath, oldPath) => {
  nextTick(() => {
    syncDiscoveryOutlines();
    syncReorderTargetOutlines({ pulse: Boolean(newPath && !oldPath) });
  });
});

watch([editingComponentPath, addTargetPath, deleteConfirmPath, showPartDiscoveryOutlines], () => {
  nextTick(() => {
    syncManageOutlines();
  });
});

watch(allowDynamicContentInteraction, (newValue) => {
  // manageモードの時のみlocalStorageに保存（previewモードでは保存しない）
  if (viewMode.value === 'manage') {
    saveCMSSettings({ allowDynamicContentInteraction: newValue });
  }
  // useEditorMode()の値と同期
  allowDynamicContentInteractionBase.value = newValue;
  nextTick(() => {
    setupClickHandlers();
    // Shadow DOM内の値を更新
    updateShadowDOMAllowDynamicContentInteraction();
    dispatchEvent('zcode-dom-updated', {});
  });
});

watch(enableContextMenu, (newValue) => {
  if (newValue) {
    nextTick(() => {
      setupContextMenu();
    });
  } else {
    cleanupContextMenu();
  }
});

watch(showPartDiscoveryOutlines, () => {
  nextTick(() => {
    syncManageOutlines();
  });
});

watch(showReorderStructureLabels, () => {
  nextTick(() => {
    syncStructureLabels();
  });
});

function resetToolbarSettings() {
  const defaults = resetSettings(TOOLBAR_CMS_SETTING_KEYS);
  allowDynamicContentInteraction.value = defaults.allowDynamicContentInteraction!;
  savedAllowDynamicContentInteractionForPreview = defaults.allowDynamicContentInteraction!;
}

function resetAddPanelOptions() {
  setAddInsertBeforeUserOption(false);
  editAfterAdd.value = false;
  resetSettings(ADD_PANEL_CMS_SETTING_KEYS);
}

function resetReorderPanelOptions() {
  resetSettings(REORDER_PANEL_CMS_SETTING_KEYS);
}

function resetDeletePanelOptions() {
  continueDeleteAfter.value = false;
}

const { showSaveConfirmDialog, requestSave, confirmSave, cancelSave } = useSaveRequest({
  source: () => host.source,
  getTargets: () => PAGE_SAVE_TARGETS,
  showConfirm: showSaveConfirm,
  dispatchEvent
});

defineExpose({
  getData,
  setData,
  validateData: validateDataUtil,
  cmsData,
  currentMode,
  switchMode,
  addTargetPath,
  showAddBetweenButtons,
  allowDynamicContentInteraction,
  devRightPadding,
  devRightPaddingValue,
  scrollIntoViewOnPartEdit,
  settingsPanelOpen
});
</script>
