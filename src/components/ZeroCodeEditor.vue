<template>
  <div class="zcode-dev-container">
    <!-- タブ専用ヘッダー（表示/管理どちらでも表示） -->
    <div class="zcode-dev-header">
      <div class="zcode-dev-tabs">
        <button
          :class="{ active: activeTab === 'edit' }"
          class="zcode-dev-tab"
          :aria-pressed="activeTab === 'edit'"
          @click="handleTabClick('edit')"
        >
          <Edit :size="16" aria-hidden="true" />
          <span>{{ $t('editor.pageManagement') }}</span>
        </button>
        <button
          v-if="enablePartsManager"
          :class="{ active: activeTab === 'parts' }"
          class="zcode-dev-tab"
          :aria-pressed="activeTab === 'parts'"
          @click="handleTabClick('parts')"
        >
          <Package :size="16" aria-hidden="true" />
          <span>{{ $t('editor.partsManagement') }}</span>
        </button>
        <button
          v-if="enableImagesManager"
          :class="{ active: activeTab === 'images' }"
          class="zcode-dev-tab"
          :aria-pressed="activeTab === 'images'"
          @click="handleTabClick('images')"
        >
          <Image :size="16" aria-hidden="true" />
          <span>{{ $t('editor.imagesManagement') }}</span>
        </button>
        <button
          :class="{ active: activeTab === 'data' }"
          class="zcode-dev-tab"
          :aria-pressed="activeTab === 'data'"
          @click="handleTabClick('data')"
        >
          <Database :size="16" aria-hidden="true" />
          <span>{{ $t('editor.dataViewer') }}</span>
        </button>
        <button
          class="zcode-dev-tab zcode-dev-settings-btn"
          :title="$t('toolbar.settings')"
          :aria-label="$t('toolbar.settings')"
          @click="devTabsSettingsPanelOpen = true"
        >
          <Settings :size="16" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- ツールバー（ZeroCodeEditor では「編集管理」タブのときのみ表示。表示モードでも維持） -->
    <Toolbar
      v-if="activeTab === 'edit'"
      :current-mode="currentMode"
      :view-mode="viewMode"
      :allow-dynamic-content-interaction="allowDynamicContentInteractionValue"
      @switch-mode="switchMode"
      @switch-view-mode="(mode) => (viewMode = mode)"
      @open-settings="handleOpenSettings"
    />

    <ZeroCodePreview
      v-if="viewMode === 'preview' && cmsData"
      :cms-data="cmsData"
      :allow-dynamic-content-interaction="allowDynamicContentInteractionValue"
    />

    <ZeroCodeCMS
      v-show="viewMode === 'manage' && activeTab === 'edit'"
      ref="cmsRef"
      :locale="props.locale"
      :page="props.page"
      :page-id="props.pageId"
      :css-common="props.cssCommon"
      :css-individual="props.cssIndividual"
      :css-special="props.cssSpecial"
      :parts-common="props.partsCommon"
      :parts-individual="props.partsIndividual"
      :parts-special="props.partsSpecial"
      :images-common="props.imagesCommon"
      :images-individual="props.imagesIndividual"
      :images-special="props.imagesSpecial"
      :config="props.config"
      :endpoints="props.endpoints"
      :backend-data="props.backendData"
      :skip-teleport-target-provide="true"
      hide-toolbar
    />

    <PartsManagerPanel
      v-if="viewMode === 'manage' && enablePartsManager && activeTab === 'parts' && cmsData"
      ref="partsManagerRef"
      :cms-data="cmsData"
      :config="config"
    />
    <div
      v-if="viewMode === 'manage' && enablePartsManager && activeTab === 'parts' && !cmsData"
      class="zcode-loading-message"
    >
      <div class="zcode-loading-message-text">
        {{ $t('editor.loading') }}
      </div>
    </div>

    <ImagesManagerPanel
      v-if="viewMode === 'manage' && enableImagesManager && activeTab === 'images' && cmsData"
      ref="imagesManagerRef"
      :cms-data="cmsData"
      :config="config"
    />
    <div
      v-if="viewMode === 'manage' && enableImagesManager && activeTab === 'images' && !cmsData"
      class="zcode-loading-message"
    >
      <div class="zcode-loading-message-text">
        {{ $t('editor.loading') }}
      </div>
    </div>

    <DataViewer
      v-show="viewMode === 'manage' && activeTab === 'data' && cmsData"
      ref="dataViewerRef"
      :cms-data="cmsData"
      :config="config"
    />

    <SettingsPanel
      v-show="devTabsSettingsPanelOpen"
      :is-open="devTabsSettingsPanelOpen"
      :view-mode="viewMode"
      mode="dev-tabs"
      :show-save-confirm="showSaveConfirm"
      @close="devTabsSettingsPanelOpen = false"
      @toggle-save-confirm="handleToggleSaveConfirm"
    />

    <!-- 保存ボタン（左下固定、管理モードの時のみ表示） -->
    <div v-if="viewMode === 'manage'" class="zcode-save-controls-fixed">
      <button class="zcode-save-btn" :aria-label="$t('common.save')" @click="handleSaveClick">
        <Save :size="16" aria-hidden="true" />
        <span>{{ $t('common.save') }}</span>
      </button>
    </div>

    <!-- 保存確認ダイアログ -->
    <div
      v-if="showSaveConfirmDialog"
      class="zcode-save-confirm-dialog-overlay"
      @click.self="cancelSave"
    >
      <div class="zcode-save-confirm-dialog">
        <div class="zcode-save-confirm-dialog-header">
          <div class="zcode-save-confirm-dialog-title">
            {{ $t('saveConfirm.title') }}
          </div>
        </div>
        <div class="zcode-save-confirm-dialog-body">
          <p>{{ $t('saveConfirm.message') }}</p>
          <ul class="zcode-save-confirm-targets">
            <li v-for="target in pendingSaveTargets" :key="target">
              {{ getTargetLabel(target) }}
            </li>
          </ul>
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

    <div ref="teleportTargetRef" class="zcode-teleport-root" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, provide, nextTick, type Ref } from 'vue';
import { zcodeRichTextFeaturesKey, zcodeTeleportTargetKey } from '../core/injectionKeys';
import { resolveRichTextFeatures } from '../features/editor/rich-text/features';
import { useI18n } from 'vue-i18n';
import ZeroCodeCMS from './ZeroCodeCMS.vue';
import ZeroCodePreview from './ZeroCodePreview.vue';
import PartsManagerPanel from '../features/parts-manager/components/PartsManagerPanel.vue';
import ImagesManagerPanel from '../features/images-manager/components/ImagesManagerPanel.vue';
import DataViewer from '../features/data-viewer/components/DataViewer.vue';
import Toolbar from '../features/editor/components/Toolbar.vue';
import SettingsPanel from '../features/editor/components/SettingsPanel.vue';
import { Edit, Package, Image, Settings, Save, Database } from 'lucide-vue-next';
import type { ZeroCodeData } from '../types';
import { useZeroCodeData } from '../core/composables/useZeroCodeData';
import { saveDevSettings, loadDevSettings, getCMSSetting } from '../core/utils/storage';
import { logger } from '../core/utils/logger';
import type { CMSConfig, DevSettings } from '../types';

const { t } = useI18n();

const props = defineProps<{
  locale?: string;
  page?: string;
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
  enablePartsManager?: boolean;
  enableImagesManager?: boolean;
}>();

const teleportTargetRef = ref<HTMLElement | null>(null);
provide(zcodeTeleportTargetKey, teleportTargetRef);

const enablePartsManager = computed(() => props.enablePartsManager !== false);
const enableImagesManager = computed(() => props.enableImagesManager !== false);

const viewMode = ref<'preview' | 'manage'>('manage');
const activeTab = ref<'edit' | 'parts' | 'images' | 'data'>('edit');
const cmsRef = ref<InstanceType<typeof ZeroCodeCMS> | null>(null);
const partsManagerRef = ref<InstanceType<typeof PartsManagerPanel> | null>(null);
const imagesManagerRef = ref<InstanceType<typeof ImagesManagerPanel> | null>(null);
const dataViewerRef = ref<InstanceType<typeof DataViewer> | null>(null);
const devTabsSettingsPanelOpen = ref(false);

// 保存確認ダイアログの状態
const showSaveConfirmDialog = ref(false);
const pendingSaveTargets = ref<string[]>([]);

// configをパース
const parseConfig = (configString?: string): Partial<CMSConfig> => {
  if (!configString) return {};
  try {
    return JSON.parse(configString);
  } catch (e) {
    logger.warn('ZeroCodeEditor: Failed to parse config:', e);
    return {};
  }
};

const config = parseConfig(props.config);
provide(zcodeRichTextFeaturesKey, resolveRichTextFeatures(config.richText?.features));

type EditorMode = 'edit' | 'add' | 'reorder' | 'delete';
type Category = 'common' | 'individual' | 'special';
type DataViewerTab = 'page' | 'parts' | 'images';

type ZeroCodeCMSApi = {
  cmsData: ZeroCodeData;
  currentMode: Ref<EditorMode>;
  switchMode: (mode: EditorMode) => void;
  addTargetPath: Ref<string | null>;
  allowDynamicContentInteraction: Ref<boolean>;
  settingsPanelOpen: Ref<boolean>;
  setData: (pathOrData: string | Record<string, unknown>, value?: unknown) => unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCategory(value: unknown): value is Category {
  return value === 'common' || value === 'individual' || value === 'special';
}

function isDataViewerTab(value: unknown): value is DataViewerTab {
  return value === 'page' || value === 'parts' || value === 'images';
}

function unwrapRefValue(maybeRef: unknown): unknown {
  if (!isObject(maybeRef)) return undefined;
  if (!('value' in maybeRef)) return undefined;
  return (maybeRef as Record<string, unknown>).value;
}

function readExposedRef<T>(maybeRef: unknown): T | undefined {
  const unwrapped = unwrapRefValue(maybeRef);
  if (unwrapped !== undefined) {
    return unwrapped as T;
  }
  return maybeRef as T;
}

function readBooleanValue(maybeRef: unknown): boolean | undefined {
  const value = readExposedRef<boolean>(maybeRef);
  return typeof value === 'boolean' ? value : undefined;
}

function readStringValue(maybeRef: unknown): string | undefined {
  const value = readExposedRef<string>(maybeRef);
  return typeof value === 'string' ? value : undefined;
}

function setBooleanValue(maybeRef: unknown, value: boolean): boolean {
  if (isObject(maybeRef) && 'value' in maybeRef) {
    (maybeRef as Record<string, unknown>).value = value;
    return true;
  }
  return false;
}

function readExposedValue(instance: unknown, key: string): unknown {
  if (!isObject(instance)) return undefined;
  return instance[key];
}

function readCategoryFromInstance(instance: unknown): Category | undefined {
  const raw = readExposedValue(instance, 'activeCategory');
  if (isCategory(raw)) return raw;
  const fromRef = unwrapRefValue(raw);
  return isCategory(fromRef) ? fromRef : undefined;
}

function readDataViewerTabFromInstance(instance: unknown): DataViewerTab | undefined {
  const raw = readExposedValue(instance, 'internalActiveTab');
  if (isDataViewerTab(raw)) return raw;
  const fromRef = unwrapRefValue(raw);
  return isDataViewerTab(fromRef) ? fromRef : undefined;
}

function getCmsApi(): ZeroCodeCMSApi | null {
  const raw: unknown = cmsRef.value;
  if (!isObject(raw)) return null;

  if (
    !('cmsData' in raw) ||
    !('currentMode' in raw) ||
    !('switchMode' in raw) ||
    !('allowDynamicContentInteraction' in raw) ||
    !('settingsPanelOpen' in raw) ||
    !('setData' in raw)
  ) {
    return null;
  }

  return raw as unknown as ZeroCodeCMSApi;
}

// Dev設定の初期値の読み込みロジック（優先順位: localStorage > config.dev > デフォルト値）
const getInitialDevValue = <K extends keyof DevSettings>(
  key: K,
  defaultValue: NonNullable<DevSettings[K]>,
  configValue?: boolean
): NonNullable<DevSettings[K]> => {
  const stored = loadDevSettings();
  // localStorageに値があればそれを使用（ユーザーが変更した値）
  if (stored[key] !== undefined) {
    return stored[key] as NonNullable<DevSettings[K]>;
  }
  // localStorageに値がなければ、config.devの値を使用（初期設定）
  if (configValue !== undefined) {
    return configValue as NonNullable<DevSettings[K]>;
  }
  // それもなければデフォルト値
  return defaultValue;
};

// ローカルストレージから設定を読み込み（ZeroCodeEditor専用の設定のみ）
const showDataViewer = ref(getInitialDevValue('showDataViewer', false, config.dev?.showDataViewer));
const showSaveConfirm = ref(
  getInitialDevValue('showSaveConfirm', true, config.dev?.showSaveConfirm)
);

const { cmsData: devCmsData, loadDataFromProps: loadDevDataFromProps } = useZeroCodeData(props);

const cmsData = computed<ZeroCodeData>(() => {
  const api = getCmsApi();
  if (api) return api.cmsData;
  return devCmsData;
});

const currentMode = computed(() => {
  const api = getCmsApi();
  const fromApi = api ? readStringValue(api.currentMode) : undefined;
  return (fromApi as EditorMode) ?? 'edit';
});

const switchMode = (mode: 'edit' | 'add' | 'reorder' | 'delete') => {
  if (viewMode.value === 'preview') {
    viewMode.value = 'manage';
    nextTick(() => {
      cmsRef.value?.switchMode?.(mode);
    });
    return;
  }
  cmsRef.value?.switchMode?.(mode);
};

function handleTabClick(tab: 'edit' | 'parts' | 'images' | 'data') {
  activeTab.value = tab;
  if (tab === 'parts' || tab === 'images' || tab === 'data') {
    viewMode.value = 'manage';
  }
}

function handleOpenSettings() {
  const api = getCmsApi();
  if (api && !setBooleanValue(api.settingsPanelOpen, true)) {
    (api as Record<string, unknown>).settingsPanelOpen = true;
  }
}

// 動的コンテンツの許可状態（ZeroCodeCMS側で管理、previewモードでは常にtrue）
const allowDynamicContentInteractionValue = computed(() => {
  if (viewMode.value === 'preview') {
    return true;
  }
  const api = getCmsApi();
  if (api) {
    const value = readBooleanValue(api.allowDynamicContentInteraction);
    if (value !== undefined) return value;
  }
  // ZeroCodeCMSが表示されていない場合は、localStorageから読み込む（デフォルトはfalse）
  return getCMSSetting('allowDynamicContentInteraction', false);
});

function getData(path?: string): unknown {
  // 常にcomputedのcmsDataを使用（パーツ管理の変更も反映される）
  const data = cmsData.value;
  if (!path) {
    return data;
  }
  // パス指定の場合
  const keys = path.split('.');
  let result: unknown = data as unknown;
  for (const key of keys) {
    if (!isObject(result)) return undefined;
    result = result[key];
    if (result === undefined) return undefined;
  }
  return result;
}

function setData(path: string | Record<string, unknown>, value?: unknown): unknown {
  const api = getCmsApi();
  if (!api) return false;
  return api.setData(path, value);
}

onMounted(() => {
  loadDevDataFromProps();
});

watch(
  [
    () => props.page,
    () => props.partsCommon,
    () => props.partsIndividual,
    () => props.partsSpecial,
    () => props.imagesCommon,
    () => props.imagesIndividual,
    () => props.imagesSpecial,
    () => props.cssCommon,
    () => props.cssIndividual,
    () => props.cssSpecial
  ],
  () => {
    loadDevDataFromProps();
  }
);

// 設定変更時にローカルストレージに保存（ZeroCodeEditor専用の設定のみ）
watch(showDataViewer, (value) => {
  saveDevSettings({ showDataViewer: value });
});

watch(showSaveConfirm, (value) => {
  saveDevSettings({ showSaveConfirm: value });
});

// 表示モード変更イベントを発火
watch(viewMode, (newMode, oldMode) => {
  dispatchEvent('view-mode-changed', {
    mode: newMode,
    previousMode: oldMode
  });
});

function handleToggleSaveConfirm(enabled: boolean) {
  showSaveConfirm.value = enabled;
}

// イベント発火（Web Component経由）
function dispatchEvent(eventName: string, detail: unknown) {
  const hostElement = document.querySelector('zcode-editor');
  if (hostElement) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true
    });
    hostElement.dispatchEvent(event);
    return;
  }

  // フォールバック: windowに発火
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

// 保存対象を計算する関数
function calculateSaveTargets(): string[] {
  if (!cmsData.value) return [];

  // 現在のタブに応じて適切なターゲットを決定
  let primaryTarget: string;
  if (activeTab.value === 'edit') {
    primaryTarget = 'page';
  } else if (activeTab.value === 'parts') {
    // PartsManagerPanelからactiveCategoryを取得
    if (!partsManagerRef.value) {
      logger.warn('partsManagerRefが設定されていません。デフォルトで"common"を使用します。');
      primaryTarget = 'parts-common';
    } else {
      const activeCategory = readCategoryFromInstance(partsManagerRef.value as unknown);

      if (activeCategory === undefined || activeCategory === null) {
        logger.warn('parts activeCategoryが取得できません。デフォルトで"common"を使用します。');
        primaryTarget = 'parts-common';
      } else if (activeCategory === 'common') {
        primaryTarget = 'parts-common';
      } else if (activeCategory === 'individual') {
        primaryTarget = 'parts-individual';
      } else {
        primaryTarget = 'parts-special';
      }
    }
  } else if (activeTab.value === 'images') {
    // ImagesManagerPanelからactiveCategoryを取得
    if (!imagesManagerRef.value) {
      logger.warn('imagesManagerRefが設定されていません。デフォルトで"common"を使用します。');
      primaryTarget = 'images-common';
    } else {
      const activeCategory = readCategoryFromInstance(imagesManagerRef.value as unknown);

      if (activeCategory === undefined || activeCategory === null) {
        logger.warn('images activeCategoryが取得できません。デフォルトで"common"を使用します。');
        primaryTarget = 'images-common';
      } else if (activeCategory === 'common') {
        primaryTarget = 'images-common';
      } else if (activeCategory === 'individual') {
        primaryTarget = 'images-individual';
      } else {
        primaryTarget = 'images-special';
      }
    }
  } else if (activeTab.value === 'data') {
    // DataViewerからinternalActiveTabとactiveCategoryを取得
    if (!dataViewerRef.value) {
      logger.warn('dataViewerRefが設定されていません。デフォルトで"page"を使用します。');
      primaryTarget = 'page';
    } else {
      const internalActiveTab = readDataViewerTabFromInstance(dataViewerRef.value as unknown);
      const activeCategory = readCategoryFromInstance(dataViewerRef.value as unknown);

      if (internalActiveTab === undefined || internalActiveTab === null) {
        logger.warn(
          'dataViewer internalActiveTabが取得できません。デフォルトで"page"を使用します。'
        );
        primaryTarget = 'page';
      } else if (internalActiveTab === 'page') {
        primaryTarget = 'page';
      } else if (internalActiveTab === 'parts') {
        if (activeCategory === undefined || activeCategory === null) {
          logger.warn(
            'dataViewer parts activeCategoryが取得できません。デフォルトで"common"を使用します。'
          );
          primaryTarget = 'parts-common';
        } else if (activeCategory === 'common') {
          primaryTarget = 'parts-common';
        } else if (activeCategory === 'individual') {
          primaryTarget = 'parts-individual';
        } else {
          primaryTarget = 'parts-special';
        }
      } else if (internalActiveTab === 'images') {
        if (activeCategory === undefined || activeCategory === null) {
          logger.warn(
            'dataViewer images activeCategoryが取得できません。デフォルトで"common"を使用します。'
          );
          primaryTarget = 'images-common';
        } else if (activeCategory === 'common') {
          primaryTarget = 'images-common';
        } else if (activeCategory === 'individual') {
          primaryTarget = 'images-individual';
        } else {
          primaryTarget = 'images-special';
        }
      } else {
        logger.warn(`dataViewer 不明なinternalActiveTab: ${internalActiveTab}`);
        return [];
      }
    }
  } else {
    return [];
  }

  let targets: string[];
  if (primaryTarget === 'page') {
    targets = ['page', 'images-special'];
  } else if (primaryTarget === 'parts-common') {
    targets = [primaryTarget, 'parts-common-css'];
  } else if (primaryTarget === 'parts-individual') {
    targets = [primaryTarget, 'parts-individual-css'];
  } else if (primaryTarget === 'parts-special') {
    targets = [primaryTarget, 'parts-special-css'];
  } else {
    targets = [primaryTarget];
  }

  return targets;
}

// 保存ボタンクリック時の処理
function handleSaveClick() {
  // 設定を確認
  if (!showSaveConfirm.value) {
    // 確認をスキップして直接保存
    executeSave();
    return;
  }

  // 保存対象を計算
  const targets = calculateSaveTargets();
  if (targets.length === 0) {
    logger.warn(String(t('editor.noSaveTargets')));
    return;
  }

  pendingSaveTargets.value = targets;
  showSaveConfirmDialog.value = true;
}

// 保存を実行する関数
function executeSave() {
  const targets = calculateSaveTargets();
  if (targets.length === 0) {
    logger.warn(String(t('editor.noSaveTargets')));
    return;
  }

  dispatchEvent('save-request', {
    requestId: createRequestId(),
    source: 'editor',
    targets,
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
  pendingSaveTargets.value = [];
}

// ターゲットのラベルを取得
function getTargetLabel(target: string): string {
  const labels: Record<string, string> = {
    page: t('saveConfirm.targets.page'),
    'parts-common': t('saveConfirm.targets.parts-common'),
    'parts-individual': t('saveConfirm.targets.parts-individual'),
    'parts-special': t('saveConfirm.targets.parts-special'),
    'images-common': t('saveConfirm.targets.images-common'),
    'images-individual': t('saveConfirm.targets.images-individual'),
    'images-special': t('saveConfirm.targets.images-special'),
    'parts-common-css': t('saveConfirm.targets.parts-common-css'),
    'parts-individual-css': t('saveConfirm.targets.parts-individual-css'),
    'parts-special-css': t('saveConfirm.targets.parts-special-css')
  };
  return labels[target] || target;
}

defineExpose({
  getData,
  setData,
  allowDynamicContentInteraction: allowDynamicContentInteractionValue
});
</script>
