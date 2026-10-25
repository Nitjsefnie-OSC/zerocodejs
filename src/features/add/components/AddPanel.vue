<template>
  <div v-if="addTargetPath" class="zcode-add-panel" @click.stop>
    <div class="zcode-add-panel-header">
      <div class="zcode-panel-header-title" role="heading" aria-level="3">
        {{ $t('addPanel.title') }}
      </div>
      <div class="zcode-add-panel-header-actions">
        <div ref="addOptionsAnchorRef" class="zcode-add-panel-options-anchor">
          <button
            type="button"
            class="zcode-add-panel-options-trigger"
            :class="{ 'is-active': optionsPopoverOpen }"
            :aria-expanded="optionsPopoverOpen"
            :aria-label="$t('addPanel.optionsAriaLabel')"
            :title="$t('addPanel.optionsAriaLabel')"
            @click.stop="toggleOptionsPopover"
          >
            <Settings :size="18" />
          </button>
          <div
            v-show="optionsPopoverOpen"
            class="zcode-add-panel-options-popover"
            role="region"
            :aria-label="$t('addPanel.optionsPopoverTitle')"
            tabindex="-1"
          >
            <div class="zcode-add-panel-options-popover-title">
              {{ $t('addPanel.optionsPopoverTitle') }}
            </div>
            <label class="zcode-add-option-label">
              <input
                type="checkbox"
                :checked="addInsertBefore"
                class="zcode-keep-adding-checkbox"
                @change="
                  $emit('update:add-insert-before', ($event.target as HTMLInputElement).checked)
                "
              />
              <span>{{ $t('addPanel.insertBefore') }}</span>
            </label>
            <label class="zcode-add-option-label">
              <input
                type="checkbox"
                :checked="editAfterAdd"
                class="zcode-keep-adding-checkbox"
                @change="
                  $emit('update:edit-after-add', ($event.target as HTMLInputElement).checked)
                "
              />
              <span>{{ $t('addPanel.editAfterAdd') }}</span>
            </label>
            <label class="zcode-add-option-label">
              <input
                type="checkbox"
                :checked="showAddBetweenButtons"
                class="zcode-keep-adding-checkbox"
                @change="
                  $emit(
                    'update:show-add-between-buttons',
                    ($event.target as HTMLInputElement).checked
                  )
                "
              />
              <span>{{ $t('addPanel.showInsertMarkers') }}</span>
            </label>
            <button type="button" class="zcode-panel-options-reset" @click="$emit('reset-options')">
              {{ $t('addPanel.resetOptions') }}
            </button>
          </div>
        </div>
        <button class="zcode-close-btn" :aria-label="$t('common.close')" @click="$emit('cancel')">
          <X :size="18" />
        </button>
      </div>
    </div>

    <!-- 親要素選択ボタン -->
    <div v-if="canSelectParent" class="zcode-parent-selector">
      <button class="zcode-parent-select-btn" @click="$emit('select-parent')">
        <ChevronUp :size="16" />
        <span>{{ $t('addPanel.selectParent') }}</span>
      </button>
    </div>

    <div class="zcode-add-panel-category-toolbar">
      <div class="zcode-part-category-tabs">
        <button
          v-for="category in categoryTabs"
          :key="category"
          :class="{ active: addPartCategory === category && addTypeTab !== 'selected' }"
          class="zcode-category-tab"
          @click="$emit('category-tab-click', category as 'common' | 'individual' | 'special')"
        >
          {{
            category === 'common'
              ? $t('addPanel.category.common')
              : category === 'individual'
                ? $t('addPanel.category.individual')
                : $t('dataViewer.special')
          }}
        </button>
        <button
          :class="{ active: addTypeTab === 'selected' }"
          class="zcode-category-tab"
          @click="$emit('type-tab-click', 'selected')"
        >
          {{ $t('addPanel.category.selected') }}
        </button>
      </div>
    </div>

    <!-- Typeタブ（選択したパーツタブがアクティブでない場合のみ表示） -->
    <div v-if="availablePartTypes.length > 0 && addTypeTab !== 'selected'" class="zcode-type-tabs">
      <button
        :class="{ active: addTypeTab === 'all' }"
        class="zcode-type-tab"
        @click="$emit('type-tab-click', 'all')"
      >
        all
      </button>
      <button
        v-for="type in availablePartTypes"
        :key="type"
        :class="{ active: addTypeTab === type }"
        class="zcode-type-tab"
        @click="$emit('type-tab-click', type)"
      >
        {{ type }}
      </button>
    </div>

    <div class="zcode-add-panel-content">
      <!-- パーツ一覧（typeをセクション、partをボタンとして表示） -->
      <div class="zcode-part-list">
        <!-- 選択したパーツタブがアクティブな場合のみ表示 -->
        <div v-show="addTypeTab === 'selected'" class="zcode-part-type-section">
          <div class="zcode-type-section-title" role="heading" aria-level="3">
            {{ $t('addPanel.activeParts') }}
          </div>
          <div class="zcode-type-section-description">
            {{ $t('addPanel.activePartsDescription') }}
          </div>
          <div
            v-if="clickedComponent && addSelectedPart && addSelectedType"
            class="zcode-module-buttons"
          >
            <div
              class="zcode-module-preview zcode-module-preview--duplicate"
              role="button"
              tabindex="0"
              :aria-label="$t('addPanel.duplicateSelectedAria')"
              @click="$emit('duplicate-selected')"
              @keydown.enter.prevent="$emit('duplicate-selected')"
              @keydown.space.prevent="$emit('duplicate-selected')"
            >
              <div class="zcode-module-preview-header">
                <div class="zcode-module-preview-label zcode-module-preview-label-header">
                  {{ $t('addPanel.activeParts') }}
                </div>
                <button
                  type="button"
                  class="zcode-module-preview-icon-btn"
                  :aria-label="$t('common.preview')"
                  @click.stop="openPreviewModalForActiveParts()"
                >
                  <ZoomIn :size="14" />
                </button>
              </div>
              <!-- eslint-disable-next-line vue/no-v-html -- 描画処理で無害化済みの HTML -->
              <div class="zcode-module-preview-content" v-html="getClickedComponentPreviewHtml()" />
            </div>
            <div class="zcode-duplicate-selected-hint">
              {{ $t('addPanel.duplicateSelectedHint') }}
            </div>
          </div>
          <div v-else class="zcode-empty-parts">
            <div class="zcode-empty-parts-text">
              {{ $t('addPanel.clickPartInPreview') }}
            </div>
          </div>
        </div>
        <div v-show="addTypeTab !== 'selected'">
          <div
            v-for="typeGroup in groupedPartsByType"
            :key="typeGroup.type"
            class="zcode-part-type-section"
          >
            <div class="zcode-type-section-title" role="heading" aria-level="3">
              {{ typeGroup.type }}
            </div>
            <div v-if="typeGroup.description" class="zcode-type-section-description">
              {{ typeGroup.description }}
            </div>
            <div class="zcode-module-buttons">
              <div
                v-for="part in typeGroup.parts"
                :key="part.title"
                class="zcode-module-preview"
                @click="$emit('select-part', typeGroup.typeData, part)"
              >
                <div class="zcode-module-preview-header">
                  <div class="zcode-module-preview-label zcode-module-preview-label-header">
                    {{ part.title }}
                  </div>
                  <button
                    type="button"
                    class="zcode-module-preview-icon-btn"
                    :aria-label="$t('common.preview')"
                    @click.stop="openPreviewModal(typeGroup.typeData, part)"
                  >
                    <ZoomIn :size="14" />
                  </button>
                </div>
                <!-- eslint-disable vue/no-v-html -- 描画処理で無害化済みの HTML -->
                <div
                  class="zcode-module-preview-content"
                  v-html="getPartPreviewHtml(typeGroup.typeData, part)"
                />
                <!-- eslint-enable vue/no-v-html -->
              </div>
            </div>
          </div>
          <div
            v-if="groupedPartsByType.length === 0 && addTypeTab !== 'selected'"
            class="zcode-empty-parts"
          >
            <div class="zcode-empty-parts-text">
              {{ $t('addPanel.noPartsAvailable') }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- パーツ拡大プレビューモーダル（追加パネル用） -->
    <Teleport :to="teleportTo">
      <div
        v-if="showPreviewModal && previewTarget"
        class="zcode-preview-modal"
        @click="closePreviewModal"
      >
        <div ref="previewModalContentRef" class="zcode-preview-modal-content" @click.stop>
          <div class="zcode-preview-modal-header">
            <div class="zcode-preview-modal-header-title" role="heading" aria-level="4">
              {{ $t('common.preview') }}:
              {{
                previewTarget.isActiveParts ? $t('addPanel.activeParts') : previewTarget.part.title
              }}
            </div>
            <button class="zcode-close-btn" @click="closePreviewModal">
              <X :size="18" />
            </button>
          </div>
          <!-- eslint-disable vue/no-v-html -- 描画処理で無害化済みの HTML -->
          <div
            class="zcode-preview-modal-body"
            v-html="
              previewTarget.isActiveParts
                ? getClickedComponentPreviewHtml()
                : getPartPreviewHtml(previewTarget.type, previewTarget.part)
            "
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useZcodeTeleportTo } from '../../../core/composables/useZcodeTeleportTo';
import { usePanelOptionsPopover } from '../../editor/composables/usePanelOptionsPopover';
import { useModalA11y } from '../../../core/composables/useModalA11y';
import type { TypeData, PartData, ComponentData, CMSConfig } from '../../../types';
import { X, ChevronUp, ZoomIn, Settings } from '../../../core/icons';

const props = defineProps<{
  addTargetPath: string | null;
  addPartCategory: 'common' | 'individual' | 'special';
  addTypeTab: string | 'all' | 'selected' | null;
  addSelectedPart: PartData | null;
  addSelectedType: TypeData | null;
  clickedComponent: ComponentData | null;
  availablePartTypes: string[];
  groupedPartsByType: Array<{
    type: string;
    description?: string;
    typeData: TypeData;
    parts: PartData[];
  }>;
  canSelectParent: boolean;
  getPartPreviewHtml: (type: TypeData, part: PartData) => string;
  getClickedComponentPreviewHtml: () => string;
  addInsertBefore: boolean;
  editAfterAdd: boolean;
  showAddBetweenButtons: boolean;
  hasSpecialParts: boolean;
  config?: Partial<CMSConfig>;
}>();

const teleportTo = useZcodeTeleportTo();

const categoryOrder = computed(() => props.config?.categoryOrder || 'common');

const categoryTabs = computed(() => {
  const tabs: Array<'common' | 'individual' | 'special'> = [];

  if (categoryOrder.value === 'individual') {
    tabs.push('individual', 'common', 'special');
  } else if (categoryOrder.value === 'special') {
    tabs.push('special', 'common', 'individual');
  } else {
    tabs.push('common', 'individual', 'special');
  }
  return tabs as readonly ('common' | 'individual' | 'special')[];
});

defineEmits<{
  cancel: [];
  'select-parent': [];
  'category-tab-click': [category: 'common' | 'individual' | 'special'];
  'type-tab-click': [type: string | 'all' | 'selected'];
  'select-part': [type: TypeData, part: PartData];
  'duplicate-selected': [];
  'update:add-insert-before': [value: boolean];
  'update:edit-after-add': [value: boolean];
  'update:show-add-between-buttons': [value: boolean];
  'reset-options': [];
}>();

const showPreviewModal = ref(false);
const previewTarget = ref<{ type: TypeData; part: PartData; isActiveParts?: boolean } | null>(null);

const addOptionsAnchorRef = ref<HTMLElement | null>(null);
const { optionsPopoverOpen, toggleOptionsPopover } = usePanelOptionsPopover(addOptionsAnchorRef);

function openPreviewModal(type: TypeData, part: PartData) {
  previewTarget.value = { type, part, isActiveParts: false };
  showPreviewModal.value = true;
}

function openPreviewModalForActiveParts() {
  if (props.addSelectedType && props.addSelectedPart) {
    previewTarget.value = {
      type: props.addSelectedType,
      part: props.addSelectedPart,
      isActiveParts: true
    };
    showPreviewModal.value = true;
  }
}

function closePreviewModal() {
  showPreviewModal.value = false;
  previewTarget.value = null;
}

const previewModalContentRef = ref<HTMLElement | null>(null);
useModalA11y(() => showPreviewModal.value, closePreviewModal, previewModalContentRef);
</script>
