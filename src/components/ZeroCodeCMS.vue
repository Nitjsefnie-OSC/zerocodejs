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
      v-if="!hideToolbar"
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

    <!-- 保存ボタン（左下固定、管理モードの時のみ表示。Studio 等で親に委譲する場合は非表示） -->
    <div v-if="viewMode === 'manage' && !hideFixedSaveButton" class="zcode-save-controls-fixed">
      <button class="zcode-save-btn" :aria-label="$t('common.save')" @click="handleSave">
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

    <!-- 保存確認ダイアログ -->
    <div
      v-if="showSaveConfirmDialog"
      class="zcode-save-confirm-dialog-overlay"
      @click.self="cancelSave"
    >
      <div ref="saveConfirmDialogRef" class="zcode-save-confirm-dialog">
        <div class="zcode-save-confirm-dialog-header">
          <div class="zcode-save-confirm-dialog-title">
            {{ $t('saveConfirm.title') }}
          </div>
        </div>
        <div class="zcode-save-confirm-dialog-body">
          <p>{{ $t('saveConfirm.simpleMessage') }}</p>
        </div>
        <div class="zcode-save-confirm-dialog-footer">
          <button class="zcode-btn-secondary" @click="cancelSave">
            {{ $t('common.cancel') }}
          </button>
          <button class="zcode-btn-primary" @click="confirmSave">
            {{ $t('saveConfirm.saveButton') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Teleport 用（Shadow DOM 内にモーダル向け。Editor 埋め込み時は provide なし） -->
    <div
      v-if="!skipTeleportTargetProvide"
      ref="teleportTargetRef"
      class="zcode-teleport-root"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  getCurrentInstance,
  provide,
  type Ref
} from 'vue';
import { zcodeRichTextConfigKey, zcodeTeleportTargetKey } from '../core/injectionKeys';
import { resolveRichTextConfig } from '../features/editor/rich-text/features';
import { Save } from 'lucide-vue-next';
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
import { useModalA11y } from '../core/composables/useModalA11y';
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
  resolveCmsSettingsDefaultsAfterClear,
  TOOLBAR_CMS_SETTING_KEYS,
  ADD_PANEL_CMS_SETTING_KEYS,
  REORDER_PANEL_CMS_SETTING_KEYS
} from '../core/utils/cms-settings-reset';
import { logger } from '../core/utils/logger';
import { useI18n } from 'vue-i18n';
import type { CMSConfig, CMSSettings } from '../types';

const { t } = useI18n();

const props = defineProps<{
  locale?: string;
  page?: string;
  /** 専用画像のページスコープ用 ID（記事 ID など）。ホストが `<zcode-cms page-id="...">` で渡す */
  pageId?: string;
  cssCommon?: string;
  cssIndividual?: string;
  cssSpecial?: string;
  partsCommon?: string;
  partsIndividual?: string;
  partsSpecial?: string;
  imagesCommon?: string;
  imagesIndividual?: string;
  imagesSpecial?: string;
  config?: string;
  endpoints?: string;
  backendData?: string;
  /** true のとき固定保存ボタンを出さない（親が save-request を送る） */
  hideFixedSaveButton?: boolean;
  /** save-request の detail.source（埋め込み先が studio のときは 'studio'） */
  saveRequestSource?: 'cms' | 'studio';
  /**
   * true のとき Teleport 用の provide / マウント点を出さない（ZeroCodeEditor / Studio が上位で提供する場合）
   */
  skipTeleportTargetProvide?: boolean;
  /** true のとき内蔵ツールバーを出さない（ZeroCodeEditor / Studio が外側で表示する場合） */
  hideToolbar?: boolean;
}>();

const hideToolbar = computed(() => props.hideToolbar === true);

const skipTeleportTargetProvide = computed(() => props.skipTeleportTargetProvide === true);

const teleportTargetRef = ref<HTMLElement | null>(null);
if (props.skipTeleportTargetProvide !== true) {
  provide(zcodeTeleportTargetKey, teleportTargetRef);
}

const viewMode = ref<'preview' | 'manage'>('manage');
const settingsPanelOpen = ref(false);

// configをパース
const parseConfig = (configString?: string): Partial<CMSConfig> => {
  if (!configString) return {};
  try {
    return JSON.parse(configString);
  } catch (e) {
    logger.warn('ZeroCodeCMS: Failed to parse config:', e);
    return {};
  }
};

const config = parseConfig(props.config);
provide(zcodeRichTextConfigKey, resolveRichTextConfig(config.richText));

/** ページ保存時はページ本体に加え、専用画像プール（images-special）もホストが永続化できるよう含める */
const saveTargets = ['page', 'images-special'];

const hideFixedSaveButton = computed(() => props.hideFixedSaveButton === true);
const saveRequestSource = computed(() => props.saveRequestSource ?? 'cms');

// 初期値の読み込み（優先順位: localStorage > config.cms > コードデフォルト）
const getInitialCMSValue = <K extends keyof CMSSettings>(key: K): NonNullable<CMSSettings[K]> =>
  resolveCmsSettingDefault(key, config);

// 設定の初期化（デフォルト ON: showSaveConfirm, scrollIntoViewOnPartEdit, showPartDiscoveryOutlines）
const devRightPadding = ref(getInitialCMSValue('devRightPadding'));
const enableContextMenu = ref(getInitialCMSValue('enableContextMenu'));
const showSaveConfirm = ref(getInitialCMSValue('showSaveConfirm'));
const scrollIntoViewOnPartEdit = ref(getInitialCMSValue('scrollIntoViewOnPartEdit'));
const showPartDiscoveryOutlines = ref(getInitialCMSValue('showPartDiscoveryOutlines'));
const showAddBetweenButtons = ref(getInitialCMSValue('showAddBetweenButtons'));
const showReorderStructureLabels = ref(getInitialCMSValue('showReorderStructureLabels'));
const devRightPaddingValue = computed(() => devRightPadding.value);

// 保存確認ダイアログの状態
const showSaveConfirmDialog = ref(false);
const saveConfirmDialogRef = ref<HTMLElement | null>(null);
useModalA11y(
  () => showSaveConfirmDialog.value,
  () => cancelSave(),
  saveConfirmDialogRef
);

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
const savedAllowDynamicContentInteraction = getInitialCMSValue('allowDynamicContentInteraction');
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

const fieldErrors = ref<Record<string, string>>({});

type SaveResultError = { path?: string; field?: string; message?: string; code?: string };
const lastSaveResultErrors = ref<SaveResultError[]>([]);
const saveErrorBanner = ref<{
  visible: boolean;
  message: string;
  requestId?: string;
  target?: string;
}>({
  visible: false,
  message: ''
});

type EditableField = Parameters<typeof saveFieldEdit>[0];

function handleSaveFieldEdit(field: EditableField) {
  if (field?.fieldName && fieldErrors.value[field.fieldName]) {
    const next = { ...fieldErrors.value };
    delete next[field.fieldName];
    fieldErrors.value = next;
  }
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

function dispatchEvent(eventName: string, detail: unknown) {
  const hostElement = getHostElement();
  if (hostElement) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true
    });
    hostElement.dispatchEvent(event);
    return;
  }

  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    composed: true
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
  }
}

function createRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getHostElement(): HTMLElement | null {
  // コンテナ要素から取得を試みる
  if (containerRef.value) {
    const root = containerRef.value.getRootNode();
    if (root instanceof ShadowRoot && root.host) {
      return root.host as HTMLElement;
    }
    // Light DOM の場合
    const host =
      containerRef.value.closest?.('zcode-cms') ||
      containerRef.value.closest?.('zcode-editor') ||
      containerRef.value.closest?.('zcode-studio');
    if (host) {
      return host as HTMLElement;
    }
  }

  // フォールバック: getCurrentInstance から取得
  const instance = getCurrentInstance();
  if (instance) {
    const el = instance.vnode.el;

    if (el instanceof HTMLElement) {
      const root = el.getRootNode();
      if (root instanceof ShadowRoot && root.host) {
        return root.host as HTMLElement;
      }
      const host =
        el.closest?.('zcode-cms') || el.closest?.('zcode-editor') || el.closest?.('zcode-studio');
      if (host) {
        return host as HTMLElement;
      }
      return null;
    }

    if (el instanceof Node) {
      const root = el.getRootNode();
      if (root instanceof ShadowRoot && root.host) {
        return root.host as HTMLElement;
      }
    }
  }

  return null;
}

type SaveResultDetail = {
  requestId?: string;
  target?: string;
  ok?: boolean;
  errors?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSaveResultErrors(input: unknown): SaveResultError[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((e): e is Record<string, unknown> => isObject(e))
    .map((e) => ({
      path: typeof e.path === 'string' ? e.path : undefined,
      field: typeof e.field === 'string' ? e.field : undefined,
      message: typeof e.message === 'string' ? e.message : undefined,
      code: typeof e.code === 'string' ? e.code : undefined
    }));
}

function applyFieldErrorsForPath(path: string | null) {
  if (!path) {
    fieldErrors.value = {};
    return;
  }
  const next: Record<string, string> = {};
  for (const err of lastSaveResultErrors.value) {
    const errPath = typeof err?.path === 'string' ? err.path : null;
    const field = typeof err?.field === 'string' ? err.field : null;
    const message = typeof err?.message === 'string' ? err.message : null;
    if (!field || !message) continue;
    if (errPath && errPath !== path) continue;
    next[field] = message;
  }
  fieldErrors.value = next;
}

function handleSaveResult(e: Event) {
  const detail = (e as CustomEvent<unknown>).detail;
  if (!isObject(detail)) return;

  const d = detail as SaveResultDetail;

  if (d.ok === true) {
    saveErrorBanner.value.visible = false;
    saveErrorBanner.value.message = '';
    lastSaveResultErrors.value = [];
    fieldErrors.value = {};
    return;
  }

  if (d.ok !== false) {
    return;
  }

  const errors = parseSaveResultErrors(d.errors);
  lastSaveResultErrors.value = errors;

  const count = errors.length;
  const firstMessage =
    typeof errors[0]?.message === 'string' && errors[0].message ? errors[0].message : null;

  saveErrorBanner.value.visible = true;
  saveErrorBanner.value.requestId = typeof d.requestId === 'string' ? d.requestId : undefined;
  saveErrorBanner.value.target = typeof d.target === 'string' ? d.target : undefined;
  saveErrorBanner.value.message = firstMessage
    ? t('editor.saveFailedWithMessage', { count, message: firstMessage })
    : t('editor.saveFailedWithCount', { count });

  applyFieldErrorsForPath(editingComponentPath.value || null);
}

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

  const host = getHostElement();
  if (host) {
    host.addEventListener('save-result', handleSaveResult);
  }
});

onUnmounted(() => {
  cleanupEventListeners();
  cleanupContextMenu();
  const host = getHostElement();
  if (host) {
    host.removeEventListener('save-result', handleSaveResult);
  }
});

watch(
  () => editingComponentPath.value,
  (path) => {
    applyFieldErrorsForPath(path || null);
  }
);

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

// devRightPaddingの変更をlocalStorageに保存
watch(devRightPadding, (newValue) => {
  saveCMSSettings({ devRightPadding: newValue });
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
  saveCMSSettings({ enableContextMenu: newValue });
  if (newValue) {
    nextTick(() => {
      setupContextMenu();
    });
  } else {
    cleanupContextMenu();
  }
});

watch(showSaveConfirm, (newValue) => {
  saveCMSSettings({ showSaveConfirm: newValue });
});

watch(scrollIntoViewOnPartEdit, (newValue) => {
  saveCMSSettings({ scrollIntoViewOnPartEdit: newValue });
});

watch(showPartDiscoveryOutlines, (newValue) => {
  saveCMSSettings({ showPartDiscoveryOutlines: newValue });
  nextTick(() => {
    syncManageOutlines();
  });
});

watch(showAddBetweenButtons, (newValue) => {
  saveCMSSettings({ showAddBetweenButtons: newValue });
});

watch(showReorderStructureLabels, (newValue) => {
  saveCMSSettings({ showReorderStructureLabels: newValue });
  nextTick(() => {
    syncStructureLabels();
  });
});

function resetToolbarSettings() {
  const defaults = resolveCmsSettingsDefaultsAfterClear(TOOLBAR_CMS_SETTING_KEYS, config);
  devRightPadding.value = defaults.devRightPadding!;
  enableContextMenu.value = defaults.enableContextMenu!;
  showPartDiscoveryOutlines.value = defaults.showPartDiscoveryOutlines!;
  scrollIntoViewOnPartEdit.value = defaults.scrollIntoViewOnPartEdit!;
  allowDynamicContentInteraction.value = defaults.allowDynamicContentInteraction!;
  savedAllowDynamicContentInteractionForPreview = defaults.allowDynamicContentInteraction!;
}

function resetAddPanelOptions() {
  setAddInsertBeforeUserOption(false);
  editAfterAdd.value = false;
  const defaults = resolveCmsSettingsDefaultsAfterClear(ADD_PANEL_CMS_SETTING_KEYS, config);
  showAddBetweenButtons.value = defaults.showAddBetweenButtons!;
}

function resetReorderPanelOptions() {
  const defaults = resolveCmsSettingsDefaultsAfterClear(REORDER_PANEL_CMS_SETTING_KEYS, config);
  showReorderStructureLabels.value = defaults.showReorderStructureLabels!;
}

function resetDeletePanelOptions() {
  continueDeleteAfter.value = false;
}

// 保存ボタンクリック時の処理
function handleSave() {
  // 設定を確認
  if (!showSaveConfirm.value) {
    // 確認をスキップして直接保存
    executeSave();
    return;
  }

  // 確認ダイアログを表示
  showSaveConfirmDialog.value = true;
}

// 保存を実行する関数
function executeSave() {
  const requestId = createRequestId();
  dispatchEvent('save-request', {
    requestId,
    source: saveRequestSource.value,
    targets: saveTargets,
    timestamp: Date.now()
  });
}

// 保存確認ダイアログで保存を確認した場合
function confirmSave() {
  showSaveConfirmDialog.value = false;
  executeSave();
}

// 保存確認ダイアログでキャンセルした場合
function cancelSave() {
  showSaveConfirmDialog.value = false;
}

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
