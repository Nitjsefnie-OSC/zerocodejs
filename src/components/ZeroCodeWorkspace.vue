<template>
  <div class="zcode-dev-container">
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

    <!-- ツールバーはページ管理タブのときのみ（表示モードでも維持） -->
    <Toolbar
      v-if="activeTab === 'edit'"
      :current-mode="currentMode"
      :view-mode="viewMode"
      :allow-dynamic-content-interaction="allowDynamicContentInteraction"
      @switch-mode="switchMode"
      @switch-view-mode="(mode) => (viewMode = mode)"
      @open-settings="openCmsSettings"
    />

    <ZeroCodePreview
      v-if="viewMode === 'preview' && cmsData"
      :cms-data="cmsData"
      :allow-dynamic-content-interaction="allowDynamicContentInteraction"
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
      embedded
    />

    <template v-if="viewMode === 'manage' && enablePartsManager && activeTab === 'parts'">
      <PartsManagerPanel
        v-if="cmsData"
        ref="partsManagerRef"
        :cms-data="cmsData"
        :config="config"
        :fixed-category="fixedCategory"
      />
      <div v-else class="zcode-loading-message">
        <div class="zcode-loading-message-text">{{ $t('editor.loading') }}</div>
      </div>
    </template>

    <template v-if="viewMode === 'manage' && enableImagesManager && activeTab === 'images'">
      <ImagesManagerPanel
        v-if="cmsData"
        ref="imagesManagerRef"
        :cms-data="cmsData"
        :config="config"
        :fixed-category="fixedCategory"
      />
      <div v-else class="zcode-loading-message">
        <div class="zcode-loading-message-text">{{ $t('editor.loading') }}</div>
      </div>
    </template>

    <DataViewer
      v-show="viewMode === 'manage' && activeTab === 'data' && cmsData"
      ref="dataViewerRef"
      :cms-data="cmsData"
      :config="config"
      :fixed-category="fixedCategory"
    />

    <SettingsPanel
      v-show="devTabsSettingsPanelOpen"
      :is-open="devTabsSettingsPanelOpen"
      :view-mode="viewMode"
      mode="dev-tabs"
      :show-save-confirm="showSaveConfirm"
      @close="devTabsSettingsPanelOpen = false"
      @toggle-save-confirm="showSaveConfirm = $event"
    />

    <div v-if="viewMode === 'manage'" class="zcode-save-controls-fixed">
      <button class="zcode-save-btn" :aria-label="$t('common.save')" @click="requestSave">
        <Save :size="16" aria-hidden="true" />
        <span>{{ $t('common.save') }}</span>
      </button>
    </div>

    <SaveConfirmDialog
      :show="showSaveConfirmDialog"
      :targets="pendingSaveTargets"
      @confirm="confirmSave"
      @cancel="cancelSave"
    />

    <div ref="teleportTargetRef" class="zcode-teleport-root" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, provide, nextTick } from 'vue';
import { zcodeRichTextConfigKey, zcodeTeleportTargetKey } from '../core/injectionKeys';
import { resolveRichTextConfig } from '../features/editor/rich-text/features';
import ZeroCodeCMS from './ZeroCodeCMS.vue';
import ZeroCodePreview from './ZeroCodePreview.vue';
import PartsManagerPanel from '../features/parts-manager/components/PartsManagerPanel.vue';
import ImagesManagerPanel from '../features/images-manager/components/ImagesManagerPanel.vue';
import DataViewer from '../features/data-viewer/components/DataViewer.vue';
import Toolbar from '../features/editor/components/Toolbar.vue';
import SettingsPanel from '../features/editor/components/SettingsPanel.vue';
import SaveConfirmDialog from '../features/editor/components/SaveConfirmDialog.vue';
import { Edit, Package, Image, Settings, Save, Database } from '../core/icons';
import type { CMSConfig, ImageCategory, ZeroCodeData } from '../types';
import type { ZeroCodeDataProps } from './props';
import { provideZeroCodeHost } from '../core/composables/useZeroCodeHost';
import { useZeroCodeData } from '../core/composables/useZeroCodeData';
import { useHostEvents } from '../core/composables/useHostEvents';
import { useSaveRequest } from '../features/editor/composables/useSaveRequest';
import { getCMSSetting, getDevSetting, saveDevSettings } from '../core/utils/storage';
import { parseConfig } from '../core/utils/config';
import { resolveSaveTargets, type DataViewerTab, type DevTab } from '../core/utils/save-targets';

type EditorMode = 'edit' | 'add' | 'reorder' | 'delete';

const props = withDefaults(
  defineProps<
    ZeroCodeDataProps & {
      source: 'editor' | 'studio';
      /** パーツ管理・画像管理・データビューアで扱うカテゴリを1つに固定する（Studio は special） */
      fixedCategory?: ImageCategory;
      enablePartsManager?: boolean;
      enableImagesManager?: boolean;
    }
  >(),
  { fixedCategory: undefined, enablePartsManager: true, enableImagesManager: true }
);

const teleportTargetRef = ref<HTMLElement | null>(null);
provide(zcodeTeleportTargetKey, teleportTargetRef);

const viewMode = ref<'preview' | 'manage'>('manage');
const activeTab = ref<DevTab>('edit');
const cmsRef = ref<InstanceType<typeof ZeroCodeCMS> | null>(null);
const partsManagerRef = ref<InstanceType<typeof PartsManagerPanel> | null>(null);
const imagesManagerRef = ref<InstanceType<typeof ImagesManagerPanel> | null>(null);
const dataViewerRef = ref<InstanceType<typeof DataViewer> | null>(null);
const devTabsSettingsPanelOpen = ref(false);

const config: Partial<CMSConfig> = parseConfig(props.config, 'ZeroCodeWorkspace');
provide(zcodeRichTextConfigKey, resolveRichTextConfig(config.richText));
provideZeroCodeHost({
  source: props.source,
  hooks: () => props.hooks,
  images: config.images
});

const { dispatchEvent } = useHostEvents();

const showSaveConfirm = ref(getDevSetting('showSaveConfirm', config.dev?.showSaveConfirm ?? true));
watch(showSaveConfirm, (value) => saveDevSettings({ showSaveConfirm: value }));

const { cmsData: ownCmsData, loadDataFromProps } = useZeroCodeData(props);

/** ページ管理の CMS が持つデータ（パーツ管理などの変更も同じデータに入る） */
const cmsData = computed<ZeroCodeData>(() => (cmsRef.value?.cmsData as ZeroCodeData) ?? ownCmsData);

const currentMode = computed<EditorMode>(() => cmsRef.value?.currentMode ?? 'edit');

const allowDynamicContentInteraction = computed({
  get: () => {
    if (viewMode.value === 'preview') return true;
    return (
      cmsRef.value?.allowDynamicContentInteraction ??
      getCMSSetting('allowDynamicContentInteraction', false)
    );
  },
  set: (value: boolean) => {
    if (cmsRef.value) cmsRef.value.allowDynamicContentInteraction = value;
  }
});

function switchMode(mode: EditorMode) {
  if (viewMode.value === 'preview') {
    viewMode.value = 'manage';
    nextTick(() => cmsRef.value?.switchMode(mode));
    return;
  }
  cmsRef.value?.switchMode(mode);
}

function openCmsSettings() {
  if (cmsRef.value) cmsRef.value.settingsPanelOpen = true;
}

function handleTabClick(tab: DevTab) {
  activeTab.value = tab;
  if (tab !== 'edit') {
    viewMode.value = 'manage';
  }
}

function getData(path?: string): unknown {
  const data = cmsData.value;
  if (!path) return data;
  let result: unknown = data;
  for (const key of path.split('.')) {
    if (typeof result !== 'object' || result === null) return undefined;
    result = (result as Record<string, unknown>)[key];
  }
  return result;
}

function setData(path: string | Record<string, unknown>, value?: unknown): unknown {
  return cmsRef.value ? cmsRef.value.setData(path, value) : false;
}

const fallbackCategory: ImageCategory = props.fixedCategory ?? 'common';

const { showSaveConfirmDialog, pendingSaveTargets, requestSave, confirmSave, cancelSave } =
  useSaveRequest({
    source: () => props.source,
    showConfirm: showSaveConfirm,
    dispatchEvent,
    getTargets: () =>
      resolveSaveTargets({
        tab: activeTab.value,
        partsCategory: partsManagerRef.value?.activeCategory,
        imagesCategory: imagesManagerRef.value?.activeCategory,
        dataViewerTab: dataViewerRef.value?.internalActiveTab as DataViewerTab | undefined,
        dataViewerCategory: dataViewerRef.value?.activeCategory,
        fallbackCategory
      })
  });

onMounted(() => {
  loadDataFromProps();
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
    loadDataFromProps();
  }
);

watch(viewMode, (newMode, oldMode) => {
  dispatchEvent('view-mode-changed', { mode: newMode, previousMode: oldMode });
});

defineExpose({
  getData,
  setData,
  allowDynamicContentInteraction
});
</script>
