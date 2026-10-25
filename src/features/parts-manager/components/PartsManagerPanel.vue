<template>
  <div class="zcode-parts-manager">
    <!-- 共通/個別タブ ＋ 新規作成ボタン（右上にコンパクト配置） -->
    <div class="zcode-parts-category-tabs">
      <div v-if="!fixedCategory && categoryTabs.length > 0" class="zcode-parts-category-tab-group">
        <button
          v-for="category in categoryTabs"
          :key="category"
          :class="{ active: activeCategory === category }"
          class="zcode-category-tab"
          @click="activeCategory = category as 'common' | 'individual' | 'special'"
        >
          {{
            category === 'common'
              ? $t('dataViewer.common')
              : category === 'individual'
                ? $t('dataViewer.individual')
                : $t('dataViewer.special')
          }}
        </button>
        <button
          class="zcode-help-btn"
          :title="$t('dataViewer.categoryInfo.title')"
          @click="showCategoryInfoModal = true"
        >
          <HelpCircle :size="14" />
        </button>
      </div>
      <div v-if="isActiveCategoryFileManaged" class="zcode-parts-file-managed-note" role="note">
        <Info :size="14" aria-hidden="true" />
        <span>{{ $t('partsManager.fileManagedNote') }}</span>
      </div>
      <div v-else class="zcode-parts-add-wrapper">
        <button class="zcode-btn-primary zcode-parts-new-btn" @click="startCreating">
          <Plus :size="14" />
          <span>{{ $t('partsManager.createType') }}</span>
        </button>
      </div>
    </div>

    <div class="zcode-parts-manager-content">
      <!-- パーツ一覧（全体表示） -->
      <div class="zcode-parts-items">
        <!-- タイプ別にグループ化 -->
        <div
          v-for="typeGroup in groupedPartsByType"
          :key="typeGroup.type"
          class="zcode-part-type-group"
        >
          <div class="zcode-part-type-title" role="heading" aria-level="5">
            {{ typeGroup.type }}
            <div v-if="!isActiveCategoryFileManaged" class="zcode-part-type-actions">
              <button
                v-if="typeGroup.parts.length > 0"
                class="zcode-part-type-edit-btn"
                :title="$t('partsManager.editTypeButton')"
                @click.stop="startEditingType(typeGroup.parts[0] as TypeData)"
              >
                <Edit :size="14" />
              </button>
              <button
                class="zcode-action-btn"
                :class="{ active: reorderSourceType === typeGroup.type }"
                :title="$t('partsManager.reorderType')"
                @click.stop="startReorderType(typeGroup.type)"
              >
                <ArrowUpDown :size="14" />
              </button>
              <button
                class="zcode-action-btn zcode-delete-btn"
                :title="$t('partsManager.deleteTypeButton')"
                @click.stop="deletePartType(typeGroup.type)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <div class="zcode-part-type-items">
            <div
              v-for="(type, typeIndex) in typeGroup.parts"
              :key="`${typeGroup.type}-${typeIndex}`"
              :class="getPartItemClass(type, type._partIndex ?? 0)"
              @click="startEditingPart(type, type._partIndex ?? 0)"
            >
              <!-- 並べ替え中の移動元インジケーター -->
              <div
                v-if="
                  reorderSourcePart &&
                  reorderSourcePart.type === type.type &&
                  reorderSourcePart.partIndex === (type._partIndex ?? 0)
                "
                class="zcode-reorder-source-indicator"
              >
                {{ $t('partsManager.source') }}
              </div>
              <div class="zcode-part-item-header">
                <span class="zcode-part-type">{{ type._displayPart?.title || type.type }}</span>
                <!-- アクションボタン -->
                <div class="zcode-part-item-actions">
                  <button
                    class="zcode-action-btn"
                    :title="
                      isActiveCategoryFileManaged
                        ? $t('partsManager.viewPartButton')
                        : $t('partsManager.editPartButton')
                    "
                    @click.stop="startEditingPart(type, type._partIndex ?? 0)"
                  >
                    <Eye v-if="isActiveCategoryFileManaged" :size="14" />
                    <Edit v-else :size="14" />
                  </button>
                  <button
                    v-if="!isActiveCategoryFileManaged"
                    class="zcode-action-btn"
                    :class="{
                      active:
                        reorderSourcePart?.type === type.type &&
                        reorderSourcePart?.partIndex === (type._partIndex ?? 0)
                    }"
                    :title="$t('partsManager.reorderPart')"
                    @click.stop="handleReorderClick(type, type._partIndex ?? 0)"
                  >
                    <ArrowUpDown :size="14" />
                  </button>
                  <button
                    v-if="!isActiveCategoryFileManaged"
                    class="zcode-action-btn zcode-delete-btn"
                    :title="$t('partsManager.deletePartButton')"
                    @click.stop="handleDelete({ ...type, _partIndex: type._partIndex ?? 0 })"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
              <!-- 本文エリア -->
              <div class="zcode-part-item-content">
                <div
                  class="zcode-part-description"
                  :class="{
                    'zcode-description-empty': !type._displayPart?.description && !type.description
                  }"
                >
                  {{
                    type._displayPart?.description ||
                    type.description ||
                    $t('partsManager.noDescription')
                  }}
                </div>
                <div class="zcode-part-modules">
                  {{
                    $t('partsManager.partNumber', {
                      current: (type._partIndex ?? 0) + 1,
                      total: type.parts.length
                    })
                  }}
                </div>
                <!-- プレビュー表示 -->
                <div v-if="type._displayPart" class="zcode-part-preview">
                  <!-- eslint-disable vue/no-v-html -- 描画処理で無害化済みの HTML -->
                  <div
                    class="zcode-part-preview-content"
                    v-html="getPartPreviewHtml(type, type._displayPart)"
                  />
                  <!-- eslint-enable vue/no-v-html -->
                </div>
              </div>
            </div>
            <!-- パーツ追加ボタン -->
            <div
              v-if="typeGroup.parts.length > 0 && !isActiveCategoryFileManaged"
              class="zcode-part-item zcode-part-item-add"
              @click.stop="addPartToType(typeGroup.parts[0] as TypeData)"
            >
              <div class="zcode-part-item-add-content">
                <Plus :size="20" />
                <span>{{ $t('partsManager.addPart') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- タイプ全体編集モーダル（新規作成・編集共通） -->
      <Teleport :to="teleportTo">
        <div
          v-if="editingType && (editingLevel === 'type' || isCreatingNew)"
          class="zcode-part-modal"
          @click.self="cancelEditingType"
        >
          <div ref="typeEditModalRef" class="zcode-part-modal-content" @click.stop>
            <div class="zcode-part-editor-header">
              <div class="zcode-part-editor-header-title" role="heading" aria-level="4">
                {{ isCreatingNew ? $t('partsManager.createType') : $t('partsManager.editType') }}
              </div>
              <button
                class="zcode-close-btn"
                :aria-label="$t('common.close')"
                @click="cancelEditingType"
              >
                <X :size="18" />
              </button>
            </div>

            <div class="zcode-part-editor-form">
              <div class="zcode-form-field">
                <label
                  >{{ $t('partsManager.typeName') }} <span class="zcode-required">*</span></label
                >
                <input
                  v-model="editingType.type"
                  type="text"
                  :placeholder="$t('partsManager.typeNamePlaceholder')"
                  class="zcode-text-input"
                  required
                />
              </div>

              <div class="zcode-form-field">
                <label>{{ $t('partsManager.typeDescription') }}</label>
                <input
                  v-model="editingType.description"
                  type="text"
                  :placeholder="$t('partsManager.typeDescriptionPlaceholder')"
                  class="zcode-text-input"
                />
              </div>
            </div>

            <div class="zcode-part-editor-actions">
              <button
                class="zcode-btn-primary zcode-part-editor-actions-btn zcode-part-editor-actions-btn-primary"
                @click="saveType"
              >
                <Check :size="16" />
                <span>{{ $t('common.confirm') }}</span>
              </button>
              <button
                class="zcode-btn-cancel zcode-part-editor-actions-btn"
                @click="cancelEditingType"
              >
                <X :size="16" />
                <span>{{ $t('common.cancel') }}</span>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- パーツ編集モーダル -->
      <Teleport :to="teleportTo">
        <div
          v-if="editingPart && editingLevel === 'part'"
          class="zcode-part-modal"
          @click.self="handleCancelPart"
        >
          <div ref="partEditModalRef" class="zcode-part-modal-content" @click.stop>
            <div class="zcode-part-editor-header">
              <div class="zcode-part-editor-header-title" role="heading" aria-level="4">
                {{
                  isActiveCategoryFileManaged
                    ? $t('partsManager.viewPart', { title: editingPart.part.title })
                    : $t('partsManager.editPart', { title: editingPart.part.title })
                }}
              </div>
              <div ref="partOptionsRef" class="zcode-part-editor-header-actions">
                <button
                  type="button"
                  class="zcode-part-editor-options-btn"
                  :title="$t('partsManager.options')"
                  :aria-expanded="showPartOptionsPopover"
                  aria-haspopup="dialog"
                  @click="showPartOptionsPopover = !showPartOptionsPopover"
                >
                  <SlidersHorizontal :size="18" />
                </button>
                <div
                  v-if="showPartOptionsPopover"
                  class="zcode-part-editor-options-popover"
                  role="dialog"
                  :aria-label="$t('partsManager.options')"
                  @click.stop
                >
                  <div class="zcode-part-editor-options-popover-title">
                    {{ $t('partsManager.options') }}
                  </div>
                  <div class="zcode-part-editor-options-popover-body">
                    <div class="zcode-part-editor-options-row">
                      <label class="zcode-part-editor-options-label">{{
                        $t('partsManager.outlinePosition')
                      }}</label>
                      <select
                        :value="editingPart.part.outlinePosition === 'inner' ? 'inner' : 'outer'"
                        class="zcode-part-editor-options-select"
                        :disabled="isActiveCategoryFileManaged"
                        @change="
                          editingPart.part.outlinePosition =
                            ($event.target as HTMLSelectElement).value === 'inner'
                              ? 'inner'
                              : undefined
                        "
                      >
                        <option value="outer">{{ $t('partsManager.outlinePositionOuter') }}</option>
                        <option value="inner">{{ $t('partsManager.outlinePositionInner') }}</option>
                      </select>
                    </div>
                    <div
                      class="zcode-part-editor-options-row zcode-part-editor-options-row--column"
                    >
                      <label class="zcode-part-editor-options-check-label">
                        <input
                          type="checkbox"
                          :checked="editingPart.part.slotOnly === true"
                          :disabled="isActiveCategoryFileManaged"
                          @change="
                            editingPart.part.slotOnly = ($event.target as HTMLInputElement).checked
                              ? true
                              : undefined
                          "
                        />
                        <span>{{ $t('partsManager.slotOnly') }}</span>
                      </label>
                      <p class="zcode-part-editor-options-hint">
                        {{ $t('partsManager.slotOnlyDescription') }}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  class="zcode-close-btn"
                  :aria-label="$t('common.close')"
                  @click="handleCancelPart"
                >
                  <X :size="18" />
                </button>
              </div>
            </div>

            <div class="zcode-part-editor-form">
              <div class="zcode-part-editor-topbar">
                <div class="zcode-part-editor-topfields">
                  <div class="zcode-form-field">
                    <label
                      >{{ $t('partsManager.partTitle') }}
                      <span class="zcode-required">*</span></label
                    >
                    <input
                      v-model="editingPart.part.title"
                      type="text"
                      class="zcode-text-input"
                      :readonly="isActiveCategoryFileManaged"
                      required
                    />
                  </div>
                  <div class="zcode-form-field">
                    <label>{{ $t('partsManager.partDescription') }}</label>
                    <input
                      v-model="editingPart.part.description"
                      type="text"
                      class="zcode-text-input"
                      :readonly="isActiveCategoryFileManaged"
                      :placeholder="$t('partsManager.partDescriptionPlaceholder')"
                    />
                  </div>
                </div>
              </div>

              <div class="zcode-part-editor-main">
                <div class="zcode-part-editor-pane zcode-part-editor-pane--code">
                  <div class="zcode-part-editor-pane-header">
                    <div
                      class="zcode-template-tabs"
                      role="tablist"
                      :aria-label="$t('partsManager.codeEdit')"
                    >
                      <button
                        type="button"
                        class="zcode-template-tab"
                        :class="{ active: codeTab === 'html' }"
                        role="tab"
                        :aria-selected="codeTab === 'html'"
                        @click="codeTab = 'html'"
                      >
                        HTML
                      </button>
                      <button
                        type="button"
                        class="zcode-template-tab"
                        :class="{ active: codeTab === 'css' }"
                        role="tab"
                        :aria-selected="codeTab === 'css'"
                        @click="codeTab = 'css'"
                      >
                        CSS
                      </button>
                      <button
                        v-if="hasSlotsInTemplate"
                        type="button"
                        class="zcode-template-tab"
                        :class="{ active: codeTab === 'slots' }"
                        role="tab"
                        :aria-selected="codeTab === 'slots'"
                        @click="codeTab = 'slots'"
                      >
                        {{ $t('partsManager.slotSettings') }}
                      </button>
                    </div>

                    <div class="zcode-part-editor-pane-header-actions">
                      <div v-if="codeTab === 'css'" class="zcode-css-warning-compact">
                        <Info :size="14" class="zcode-css-warning-compact-icon" />
                        <span class="zcode-css-warning-compact-text">{{
                          $t('partsManager.cssEditInfo')
                        }}</span>
                        <button
                          class="zcode-help-btn"
                          type="button"
                          :title="$t('partsManager.cssEditWarning')"
                          @click="openCssWarningModal"
                        >
                          <HelpCircle :size="14" />
                        </button>
                      </div>
                      <button
                        v-if="codeTab === 'html'"
                        class="zcode-help-btn"
                        type="button"
                        :title="$t('partsManager.templateHelpButton')"
                        @click="openTemplateHelp"
                      >
                        <HelpCircle :size="16" />
                      </button>
                    </div>
                  </div>

                  <div class="zcode-part-editor-pane-body">
                    <template v-if="codeTab === 'slots'">
                      <div class="zcode-slots-config zcode-slots-config-in-pane">
                        <div
                          v-for="(_slotConfig, slotName) in editingPart.part.slots || {}"
                          :key="`part-${editingPart.partIndex}-${slotName}`"
                          class="zcode-slot-config-item"
                        >
                          <div class="zcode-slot-config-header">
                            <div class="zcode-slot-config-title">
                              {{ $t('partsManager.slot') }}: {{ slotName }}
                            </div>
                            <button
                              v-if="!isActiveCategoryFileManaged"
                              class="zcode-btn-small"
                              @click="removePartSlot(editingPart.partIndex, slotName)"
                            >
                              <Trash2 :size="12" />
                            </button>
                          </div>
                          <div class="zcode-slot-config-body">
                            <label>{{ $t('partsManager.allowedParts') }}</label>
                            <div class="zcode-checkbox-group">
                              <input
                                v-model="slotPartFilters[slotName]"
                                type="text"
                                :placeholder="$t('partsManager.searchParts')"
                                class="zcode-text-input"
                                style="margin-bottom: 8px"
                              />
                              <label
                                v-for="part in getFilteredParts(slotName)"
                                :key="`allowed-${slotName}-${part.typeName}-${part.id}`"
                                class="zcode-checkbox-item"
                              >
                                <input
                                  type="checkbox"
                                  :checked="getAllowedPartsForSlot(slotName).includes(part.id)"
                                  :disabled="isActiveCategoryFileManaged"
                                  class="zcode-checkbox"
                                  @change="handleAllowedPartChange(slotName, part.id, $event)"
                                />
                                <span>{{ part.title }} ({{ part.typeName }})</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div
                          v-if="availableSlotsForPart.length > 0 && !isActiveCategoryFileManaged"
                          class="zcode-slot-add-section"
                        >
                          <label>{{ $t('partsManager.addSlot') }}</label>
                          <div class="zcode-slot-add-controls">
                            <select v-model="selectedSlotToAdd" class="zcode-select-input">
                              <option value="">
                                {{ $t('partsManager.selectSlot') }}
                              </option>
                              <option
                                v-for="slot in availableSlotsForPart"
                                :key="slot"
                                :value="slot"
                              >
                                {{ slot === 'default' ? $t('partsManager.defaultSlot') : slot }}
                              </option>
                            </select>
                            <button
                              :disabled="!selectedSlotToAdd"
                              class="zcode-btn-secondary"
                              @click="handleAddSelectedSlot"
                            >
                              <Plus :size="16" />
                              <span>{{ $t('common.add') }}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </template>
                    <CodeTextarea
                      v-else-if="codeTab === 'html'"
                      ref="htmlTextareaRef"
                      v-model="editingPart.part.body"
                      label="HTML"
                      :readonly="isActiveCategoryFileManaged"
                    />
                    <CodeTextarea
                      v-else
                      v-model="cssDraft"
                      label="CSS"
                      :readonly="isActiveCategoryFileManaged"
                    />
                  </div>
                </div>

                <div class="zcode-part-editor-pane zcode-part-editor-pane--side">
                  <div
                    class="zcode-part-editor-side-tabs"
                    role="tablist"
                    :aria-label="$t('partsManager.preview')"
                  >
                    <button
                      type="button"
                      class="zcode-part-editor-side-tab"
                      :class="{ active: sidePaneTab === 'preview' }"
                      role="tab"
                      :aria-selected="sidePaneTab === 'preview'"
                      @click="sidePaneTab = 'preview'"
                    >
                      {{ $t('partsManager.displayPreview') }}
                    </button>
                    <button
                      type="button"
                      class="zcode-part-editor-side-tab"
                      :class="{ active: sidePaneTab === 'editPanel' }"
                      role="tab"
                      :aria-selected="sidePaneTab === 'editPanel'"
                      @click="sidePaneTab = 'editPanel'"
                    >
                      {{ $t('partsManager.editPanelPreview') }}
                    </button>
                    <button
                      v-if="codeTab === 'html'"
                      type="button"
                      class="zcode-part-editor-side-tab"
                      :class="{ active: sidePaneTab === 'imageRef' }"
                      role="tab"
                      :aria-selected="sidePaneTab === 'imageRef'"
                      @click="sidePaneTab = 'imageRef'"
                    >
                      {{ $t('partsManager.imageIdReference') }}
                    </button>
                  </div>
                  <div class="zcode-part-editor-pane-body">
                    <template v-if="sidePaneTab === 'preview'">
                      <!-- eslint-disable vue/no-v-html -- 描画処理で無害化済みの HTML -->
                      <div
                        class="zcode-part-editor-preview-tab"
                        @click="showPreviewModal = true"
                        v-html="displayPreviewHtml"
                      />
                      <!-- eslint-enable vue/no-v-html -->
                      <div class="zcode-part-editor-preview-hint">
                        {{ $t('partsManager.clickToEnlarge') }}
                      </div>
                    </template>
                    <template v-else-if="sidePaneTab === 'imageRef'">
                      <div class="zcode-image-id-reference">
                        <div class="zcode-image-id-reference-header">
                          {{ $t('partsManager.imageIdReferenceDesc') }}
                        </div>
                        <div
                          v-if="allImagesForRef.length > 0"
                          class="zcode-image-id-reference-list"
                        >
                          <div
                            v-for="img in allImagesForRef"
                            :key="img.id"
                            class="zcode-image-id-item"
                          >
                            <img :src="img.url" :alt="img.name" class="zcode-image-id-thumb" />
                            <div class="zcode-image-id-info">
                              <code class="zcode-image-id-code">{{ img.id }}</code>
                              <span class="zcode-image-id-name">{{ img.name }}</span>
                            </div>
                            <div class="zcode-image-id-actions">
                              <button
                                type="button"
                                class="zcode-btn-small"
                                @click="copyImageId(img.id)"
                              >
                                {{ $t('common.copy') }}
                              </button>
                              <button
                                v-if="!isActiveCategoryFileManaged"
                                type="button"
                                class="zcode-btn-small"
                                @click="insertImageIdAtCursor(img.id)"
                              >
                                {{ $t('partsManager.insert') }}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div v-else class="zcode-image-id-empty">
                          {{ $t('partsManager.noImagesRegistered') }}
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div class="zcode-edit-panel-preview-heading">
                        {{ $t('partsManager.editPanelPreview') }}
                      </div>
                      <div class="zcode-edit-panel-preview-desc">
                        {{ $t('partsManager.editPanelPreviewDesc') }}
                      </div>
                      <div class="zcode-edit-panel-preview-wrap">
                        <EditPanel
                          v-if="editPanelPreviewComponent"
                          :editing-component="editPanelPreviewComponent"
                          :editing-available-fields="editPanelPreviewFields"
                          current-mode="edit"
                          :can-select-parent="false"
                          :cms-data="cmsData"
                          :preview-mode="true"
                          @save-field="handleEditPanelPreviewSaveField"
                          @close="() => {}"
                          @add-image="() => {}"
                          @delete-image="() => {}"
                        />
                        <div v-else class="zcode-edit-panel-preview-empty">
                          {{ $t('partsManager.editPanelPreviewNoFields') }}
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div class="zcode-part-editor-actions">
              <div
                v-if="isActiveCategoryFileManaged"
                class="zcode-parts-file-managed-note"
                role="note"
              >
                <Info :size="14" aria-hidden="true" />
                <span>{{ $t('partsManager.fileManagedNote') }}</span>
              </div>
              <button
                v-else
                class="zcode-btn-primary zcode-part-editor-actions-btn zcode-part-editor-actions-btn-primary"
                @click="handleSavePart"
              >
                <Check :size="16" />
                <span>{{ $t('common.confirm') }}</span>
              </button>
              <button
                class="zcode-btn-cancel zcode-part-editor-actions-btn"
                @click="handleCancelPart"
              >
                <X :size="16" />
                <span>{{
                  isActiveCategoryFileManaged ? $t('common.close') : $t('common.cancel')
                }}</span>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <PartZoomPreviewModal
        :show="showPreviewModal && !!editingPart"
        :title="editingPart?.part.title ?? ''"
        :html="displayPreviewHtml"
        @close="showPreviewModal = false"
      />

      <CssWarningModal
        v-model:dont-show-again="dontShowCssWarningAgainParts"
        :show="showCssWarningModal"
        :active-category="activeCategory"
        @close="closeCssWarningModal"
      />

      <CategoryInfoModal :show="showCategoryInfoModal" @close="showCategoryInfoModal = false" />

      <TemplateHelpModal :show="showTemplateHelp" @close="closeTemplateHelp" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onBeforeUnmount, nextTick, inject, type Ref } from 'vue';
import { useZcodeTeleportTo } from '../../../core/composables/useZcodeTeleportTo';
import { useModalA11y } from '../../../core/composables/useModalA11y';
import { useZeroCodeHost } from '../../../core/composables/useZeroCodeHost';
import { zcodeTeleportTargetKey } from '../../../core/injectionKeys';
import { useI18n } from '../../../i18n';
import type { ZeroCodeData, TypeData, CMSConfig, ComponentData } from '../../../types';
import { usePartsManager } from '../composables/usePartsManager';
import { getAvailableFieldsFromPart } from '../../../core/utils/edit-panel-fields';
import { findFirstComponentWithPartId } from '../../../core/utils/path-utils';
import EditPanel from '../../editor/components/EditPanel.vue';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  ArrowUpDown,
  HelpCircle,
  Info,
  Eye,
  SlidersHorizontal
} from '../../../core/icons';
import CodeTextarea from './CodeTextarea.vue';
import PartZoomPreviewModal from './PartZoomPreviewModal.vue';
import CssWarningModal from './CssWarningModal.vue';
import CategoryInfoModal from './CategoryInfoModal.vue';
import TemplateHelpModal from './TemplateHelpModal.vue';
import { getCssWarningPartsSetting, setCssWarningPartsSetting } from '../../../core/utils/storage';

const { t } = useI18n();

const teleportTo = useZcodeTeleportTo();
const zcodeTeleportTarget = inject<Ref<HTMLElement | null> | null>(zcodeTeleportTargetKey, null);

const props = defineProps<{
  cmsData: ZeroCodeData;
  config?: Partial<CMSConfig>;
  fixedCategory?: 'common' | 'individual' | 'special';
}>();

const showPreviewModal = ref(false);
const showPartOptionsPopover = ref(false);
const partOptionsRef = ref<HTMLElement | null>(null);
const showTemplateHelp = ref(false);
const showCssWarningModal = ref(false);
const showCategoryInfoModal = ref(false);
const dontShowCssWarningAgainParts = ref(getCssWarningPartsSetting());
const codeTab = ref<'html' | 'css' | 'slots'>('html');
const sidePaneTab = ref<'preview' | 'editPanel' | 'imageRef'>('preview');
const htmlTextareaRef = ref<InstanceType<typeof CodeTextarea> | null>(null);
const cssDraft = ref('');
const cssDraftInitial = ref('');

const MODAL_PREVIEW_CSS_STYLE_IDS = {
  common: 'zcode-css-style-parts-manager-preview-common',
  individual: 'zcode-css-style-parts-manager-preview-individual',
  special: 'zcode-css-style-parts-manager-preview-special'
};
const modalPreviewCssStyleEls: Map<string, HTMLStyleElement> = new Map();

// 現在のカテゴリのCSSを取得
const currentCSS = computed(() => {
  if (activeCategory.value === 'common') return props.cmsData.css?.common ?? '';
  if (activeCategory.value === 'individual') return props.cmsData.css?.individual ?? '';
  return props.cmsData.css?.special ?? '';
});

function applyModalPreviewPageCSS(cssMap: {
  common?: string;
  individual?: string;
  special?: string;
}) {
  // 順序: common → individual → special
  const order = ['common', 'individual', 'special'] as const;
  order.forEach((category) => {
    const css = cssMap[category];
    if (!css || !css.trim()) {
      const el = modalPreviewCssStyleEls.get(category);
      if (el) {
        el.remove();
        modalPreviewCssStyleEls.delete(category);
      }
      return;
    }

    let styleElement = modalPreviewCssStyleEls.get(category);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = MODAL_PREVIEW_CSS_STYLE_IDS[category];
      styleElement.setAttribute('data-zcode-css', 'true');
      styleElement.setAttribute('data-zcode-css-parts-preview', 'true');
      styleElement.setAttribute('data-zcode-css-category', category);
      if (!styleElement.parentNode) {
        const host = zcodeTeleportTarget?.value;
        if (host) {
          const root = host.getRootNode();
          if (root instanceof ShadowRoot) {
            root.appendChild(styleElement);
          } else {
            document.head.appendChild(styleElement);
          }
        } else {
          document.head.appendChild(styleElement);
        }
      }
      modalPreviewCssStyleEls.set(category, styleElement);
    }

    styleElement.textContent = css;
  });
}

function cleanupModalPreviewPageCSS() {
  modalPreviewCssStyleEls.forEach((el) => {
    el.remove();
  });
  modalPreviewCssStyleEls.clear();
}

function openTemplateHelp() {
  showTemplateHelp.value = true;
}

function closeTemplateHelp() {
  showTemplateHelp.value = false;
}

const allImagesForRef = computed(() => {
  const common = props.cmsData.images?.common ?? [];
  const individual = props.cmsData.images?.individual ?? [];
  const special = props.cmsData.images?.special ?? [];
  return [...common, ...individual, ...special];
});

async function copyImageId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
  } catch {
    // フォールバック: テキストエリア経由でコピー
    const textarea = document.createElement('textarea');
    textarea.value = id;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function insertImageIdAtCursor(id: string) {
  htmlTextareaRef.value?.insertTextAtCursor(id);
}

function openCssWarningModal() {
  if (
    activeCategory.value === 'common' ||
    activeCategory.value === 'individual' ||
    activeCategory.value === 'special'
  ) {
    showCssWarningModal.value = true;
  }
}

function closeCssWarningModal() {
  showCssWarningModal.value = false;
  setCssWarningPartsSetting(dontShowCssWarningAgainParts.value);
}

// codeTabがhtml以外に切り替わったとき、imageRefタブを表示中ならpreviewに戻す
watch(codeTab, (newTab) => {
  if (newTab !== 'html' && sidePaneTab.value === 'imageRef') {
    sidePaneTab.value = 'preview';
  }
});

function closePartOptionsPopoverOnClickOutside(e: MouseEvent) {
  if (partOptionsRef.value && !partOptionsRef.value.contains(e.target as Node)) {
    showPartOptionsPopover.value = false;
    document.removeEventListener('click', closePartOptionsPopoverOnClickOutside);
  }
}

watch(showPartOptionsPopover, (open) => {
  if (open) {
    nextTick(() => {
      document.addEventListener('click', closePartOptionsPopoverOnClickOutside);
    });
  } else {
    document.removeEventListener('click', closePartOptionsPopoverOnClickOutside);
  }
});

// タブの順序を制御
const categoryOrder = computed(() => props.config?.categoryOrder || 'common');

const host = useZeroCodeHost();

const {
  // 非表示カテゴリ
  isActiveCategoryFileManaged,
  setActiveCategoryCss,

  // 並べ替え
  reorderSourcePart,
  handleReorderClick,

  // 既存
  activeCategory,
  editingType,
  editingPart,
  isPartDirty,
  editingLevel,
  isCreatingNew,
  groupedPartsByType,
  startCreating,
  startEditingType,
  startEditingPart,
  addPartToType,
  saveType: saveTypeInternal,
  savePart: savePartInternal,
  deletePart,
  checkTypeUsage,
  cancelEditingType,
  cancelEditingPart,
  getPartPreviewHtml,
  getPartPreviewHtmlWithComponent,
  createTempComponentFromType,
  addPartSlot,
  removePartSlot,
  updatePartSlotAllowedParts,
  getAvailableSlotsForPart,
  extractSlotsFromTemplate,
  reorderSourceType,
  startReorderType,
  deletePartType
} = usePartsManager(props.cmsData, {
  beforeSavePart: (body) => host.hooks.value.beforeSavePart?.(body) ?? body,
  sanitize: props.config?.studio?.sanitizePartTemplate,
  fileManagedCategories: props.config?.studio?.fileManagedCategories
});

// タブとして表示するカテゴリの順序
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

const editPanelPreviewComponent = ref<ComponentData | null>(null);

watch(
  () => editingPart.value,
  (part) => {
    if (!part) {
      editPanelPreviewComponent.value = null;
      showPartOptionsPopover.value = false;
      return;
    }
    const temp = createTempComponentFromType(part.type, part.part);
    editPanelPreviewComponent.value = reactive({
      ...temp,
      type: part.type.type
    }) as ComponentData;
  },
  { deep: true }
);

const editPanelPreviewFields = computed(() => {
  const part = editingPart.value;
  const comp = editPanelPreviewComponent.value;
  if (!part || !comp) return [];
  return getAvailableFieldsFromPart(part.part, comp);
});

const displayPreviewHtml = ref('');
let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function updateDisplayPreviewHtml() {
  const part = editingPart.value;
  if (!part) {
    displayPreviewHtml.value = '';
    return;
  }
  const comp = editPanelPreviewComponent.value;
  if (comp) {
    displayPreviewHtml.value = getPartPreviewHtmlWithComponent(part.part, comp);
  } else {
    displayPreviewHtml.value = getPartPreviewHtml(part.type, part.part);
  }
}

watch(
  () =>
    [
      editingPart.value?.part.body,
      editingPart.value?.part.id,
      editPanelPreviewComponent.value
    ] as const,
  () => {
    if (previewDebounceTimer) {
      clearTimeout(previewDebounceTimer);
    }
    previewDebounceTimer = setTimeout(() => {
      updateDisplayPreviewHtml();
      previewDebounceTimer = null;
    }, 300);
  },
  { immediate: true }
);

function handleEditPanelPreviewSaveField(field: { fieldName: string; currentValue: unknown }) {
  const comp = editPanelPreviewComponent.value;
  if (comp) {
    comp[field.fieldName] = field.currentValue;
  }
  const partId = editingPart.value?.part.id;
  if (partId && props.cmsData?.page?.length) {
    const pageComp = findFirstComponentWithPartId(props.cmsData.page, partId);
    if (pageComp) {
      pageComp[field.fieldName] = field.currentValue;
    }
  }
  updateDisplayPreviewHtml();
}

// fixedCategory が指定されていればそれを使用、そうでなければ categoryOrder に基づいて設定
if (props.fixedCategory) {
  activeCategory.value = props.fixedCategory;
} else if (props.config?.categoryOrder === 'individual') {
  activeCategory.value = 'individual';
} else if (props.config?.categoryOrder === 'special') {
  activeCategory.value = 'special';
}

const isPartEditModalOpen = computed(() => {
  return editingLevel.value === 'part' && !!editingPart.value;
});

const isTypeEditModalOpen = computed(() => {
  return !!editingType.value && (editingLevel.value === 'type' || isCreatingNew.value);
});

const typeEditModalRef = ref<HTMLElement | null>(null);
const partEditModalRef = ref<HTMLElement | null>(null);
useModalA11y(
  () => isTypeEditModalOpen.value,
  () => cancelEditingType(),
  typeEditModalRef
);
useModalA11y(
  () => isPartEditModalOpen.value,
  () => {
    // モーダル内のオプションポップオーバーが開いている場合は、それだけを閉じる
    if (showPartOptionsPopover.value) {
      showPartOptionsPopover.value = false;
      return;
    }
    handleCancelPart();
  },
  partEditModalRef
);

watch(
  () => isPartEditModalOpen.value,
  (isOpen) => {
    if (!isOpen) {
      cleanupModalPreviewPageCSS();
      return;
    }
    nextTick(() => {
      const current = currentCSS.value;
      cssDraftInitial.value = current;
      cssDraft.value = current;
      // モーダルプレビューでは3つのCSSをすべて適用
      applyModalPreviewPageCSS({
        common: props.cmsData.css?.common,
        individual: props.cmsData.css?.individual,
        special: props.cmsData.css?.special
      });
    });
  },
  { immediate: true }
);

// ファイルで管理するカテゴリは、開いている間に元の CSS が差し替えられたら追従する
watch(
  () => currentCSS.value,
  (css) => {
    if (!isPartEditModalOpen.value || !isActiveCategoryFileManaged.value) return;
    cssDraftInitial.value = css;
    cssDraft.value = css;
  }
);

// activeCategoryが変更されたときにCSSを更新
watch(
  () => activeCategory.value,
  () => {
    if (isPartEditModalOpen.value) {
      nextTick(() => {
        const current = currentCSS.value;
        cssDraftInitial.value = current;
        cssDraft.value = current;
      });
    }
  }
);

watch(
  [() => cssDraft.value, () => isPartEditModalOpen.value, () => activeCategory.value],
  ([css, isOpen, category]) => {
    if (!isOpen) return;
    nextTick(() => {
      // 現在のカテゴリのCSSのみを更新し、他のカテゴリのCSSは保持
      const cssMap = {
        common: props.cmsData.css?.common,
        individual: props.cmsData.css?.individual,
        special: props.cmsData.css?.special
      };
      if (category === 'common') {
        cssMap.common = css ?? '';
      } else if (category === 'individual') {
        cssMap.individual = css ?? '';
      } else {
        cssMap.special = css ?? '';
      }
      applyModalPreviewPageCSS(cssMap);
    });
  }
);

async function handleSavePart() {
  await savePartInternal();
  if (!editingPart.value) {
    setActiveCategoryCss(cssDraft.value);
    cssDraftInitial.value = cssDraft.value;
  }
}

function handleCancelPart() {
  if (isPartDirty.value && !confirm(t('partsManager.discardPartChangesConfirm'))) {
    return;
  }
  cssDraft.value = cssDraftInitial.value;
  cleanupModalPreviewPageCSS();
  showPreviewModal.value = false;
  cancelEditingPart();
}

onBeforeUnmount(() => {
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = null;
  }
  cleanupModalPreviewPageCSS();
});

watch(
  () => editingPart.value,
  (v) => {
    if (v) {
      codeTab.value = 'html';
    }
  }
);

watch(
  () => codeTab.value,
  (newTab) => {
    if (
      newTab === 'css' &&
      isPartEditModalOpen.value &&
      (activeCategory.value === 'common' ||
        activeCategory.value === 'individual' ||
        activeCategory.value === 'special') &&
      !dontShowCssWarningAgainParts.value
    ) {
      nextTick(() => {
        openCssWarningModal();
      });
    }
  }
);

// activeCategoryをexpose
defineExpose({
  activeCategory
});

async function saveType() {
  // 新規タイプ作成 / 既存タイプ編集とも、保存ロジックとバリデーションは usePartsManager に委譲
  await saveTypeInternal();
}

// 利用可能なスロット（既に設定済みのものを除外）
const availableSlotsForPart = computed(() => {
  if (!editingPart.value) return [];

  return getAvailableSlotsForPart(editingPart.value.partIndex);
});

// テンプレートにz-slotが含まれているか、または既にスロットが設定されているかを判定
const hasSlotsInTemplate = computed(() => {
  if (!editingPart.value) return false;

  const template = editingPart.value.part.body;
  const hasSlotsInBody = template ? extractSlotsFromTemplate(template).length > 0 : false;
  const hasConfiguredSlots =
    editingPart.value.part.slots && Object.keys(editingPart.value.part.slots).length > 0;

  return hasSlotsInBody || hasConfiguredSlots;
});

watch([() => hasSlotsInTemplate.value, () => codeTab.value], ([hasSlots, tab]) => {
  if (!hasSlots && tab === 'slots') {
    codeTab.value = 'html';
  }
});

const selectedSlotToAdd = ref('');

const handleAddSelectedSlot = () => {
  if (!selectedSlotToAdd.value || !editingPart.value) return;

  addPartSlot(editingPart.value.partIndex, selectedSlotToAdd.value);
  selectedSlotToAdd.value = ''; // リセット
};

// テンプレートが変更されたら選択をリセット
watch(
  () => editingPart.value?.part.body,
  () => {
    selectedSlotToAdd.value = '';
  }
);

// すべてのパーツを取得（共通+個別+専用）
const allParts = computed(() => {
  const parts: Array<{ id: string; title: string; typeName: string; description?: string }> = [];
  const partsData = props.cmsData.parts;
  const allTypes = [...partsData.common, ...partsData.individual, ...(partsData.special || [])];

  allTypes.forEach((type) => {
    type.parts.forEach((part) => {
      parts.push({
        id: part.id,
        title: part.title,
        typeName: type.type,
        description: part.description
      });
    });
  });

  return parts.sort((a, b) => {
    if (a.typeName !== b.typeName) {
      return a.typeName.localeCompare(b.typeName);
    }
    return a.title.localeCompare(b.title);
  });
});

// スロットごとの検索フィルター
const slotPartFilters = ref<Record<string, string>>({});

// フィルターされたパーツ（許可用）
const getFilteredParts = (slotName: string) => {
  const filter = slotPartFilters.value[slotName] || '';
  if (!filter) return allParts.value;
  const lowerFilter = filter.toLowerCase();
  return allParts.value.filter(
    (part) =>
      part.title.toLowerCase().includes(lowerFilter) ||
      part.typeName.toLowerCase().includes(lowerFilter)
  );
};

// スロット設定から許可されるパーツを取得
const getAllowedPartsForSlot = (slotName: string): string[] => {
  if (!editingPart.value) return [];

  const slotConfig = editingPart.value.part.slots?.[slotName];
  if (!slotConfig) return [];

  return slotConfig.allowedParts || [];
};

// 許可されるパーツのチェックボックス変更
const handleAllowedPartChange = (slotName: string, partId: string, event: Event) => {
  if (!editingPart.value) return;

  const checked = (event.target as HTMLInputElement).checked;
  const slotConfig = editingPart.value.part.slots?.[slotName];
  const currentAllowed = slotConfig?.allowedParts || [];

  let newAllowed: string[];
  if (checked) {
    newAllowed = [...currentAllowed, partId];
  } else {
    newAllowed = currentAllowed.filter((p: string) => p !== partId);
  }

  updatePartSlotAllowedParts(editingPart.value.partIndex, slotName, newAllowed);
};

// アイテムのクラスを動的に生成
function getPartItemClass(type: TypeData, partIndex: number) {
  const classes = ['zcode-part-item'];

  // 並べ替えの移動元を強調
  if (
    reorderSourcePart.value &&
    reorderSourcePart.value.type === type.type &&
    reorderSourcePart.value.partIndex === partIndex
  ) {
    classes.push('zcode-reorder-source');
  }

  return classes.join(' ');
}

function handleDelete(typeWithIndex: TypeData & { _partIndex?: number }) {
  // パーツ単位で削除する場合の確認メッセージ
  const partIndex = typeWithIndex._partIndex;
  const isPartDelete = partIndex !== undefined && partIndex !== null;
  const partNumber = isPartDelete && partIndex !== undefined ? partIndex + 1 : 0;
  const totalParts = typeWithIndex.parts.length;

  if (isPartDelete && totalParts > 1) {
    // パーツ単位で削除（タイプには他のパーツが残る）
    if (!confirm(t('partsManager.deletePartConfirm', { number: partNumber }))) {
      return;
    }
  } else {
    // タイプ全体を削除
    const usages = checkTypeUsage(typeWithIndex.type);
    if (usages.length > 0) {
      if (
        !confirm(
          t('partsManager.deleteTypeWithUsagesConfirm', {
            type: typeWithIndex.type,
            count: usages.length
          })
        )
      ) {
        return;
      }
    } else {
      if (!confirm(t('partsManager.deleteTypeConfirm'))) {
        return;
      }
    }
  }

  deletePart(typeWithIndex);
}
</script>
