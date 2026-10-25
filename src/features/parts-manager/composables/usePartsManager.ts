import { ref, computed, reactive, toRaw, nextTick, watch } from 'vue';
import { useI18n } from '../../../i18n';
import type { ZeroCodeData, TypeData, PartData, ComponentData } from '../../../types';
import { findPartById, findTypeAndPartByPartId, generateId } from '../../../core/utils/path-utils';
import { useZeroCodeRenderer } from '../../../core/composables/useZeroCodeRenderer';
import { extractFieldsFromTemplate } from '../../../core/utils/field-extractor';
import { logger } from '../../../core/utils/logger';
import { processTemplateWithDOM } from '../../../core/utils/template-processor';
import { sanitizePartTemplate } from '../../../core/utils/sanitize';
type EditingLevel = 'type' | 'part' | null;

type EditingPart = {
  type: TypeData;
  partIndex: number;
  part: PartData;
  isNewPart?: boolean;
};

export interface PartsManagerOptions {
  beforeSavePart?: (body: string) => string | Promise<string>;
  sanitize?: boolean;
  /**
   * パーツの定義をファイル（プロダクトのリポジトリ）で管理するカテゴリ。
   * 一覧・プレビュー・パーツの内容の表示はできるが、追加・保存・削除・並べ替えはできない。
   * UI で操作を出さないことに加え、各操作関数の入口でもガードする。
   */
  fileManagedCategories?: Array<'common' | 'individual' | 'special'>;
}

export function usePartsManager(cmsData: ZeroCodeData, options?: PartsManagerOptions) {
  const { t } = useI18n();

  const fileManagedCategorySet = new Set(options?.fileManagedCategories ?? []);
  function isCategoryFileManaged(category: 'common' | 'individual' | 'special'): boolean {
    return fileManagedCategorySet.has(category);
  }

  // ========================================
  // 状態管理
  // ========================================
  const activeCategory = ref<'common' | 'individual' | 'special'>('common');
  const isActiveCategoryFileManaged = computed(() => isCategoryFileManaged(activeCategory.value));
  const selectedType = ref<TypeData | null>(null);
  const editingType = ref<TypeData | null>(null);
  const editingPart = ref<EditingPart | null>(null);
  const editingPartSnapshot = ref<string | null>(null);
  const editingLevel = ref<EditingLevel>(null);
  const isCreatingNew = ref(false);

  // 並べ替え用の状態
  const reorderSourcePart = ref<{ type: string; partIndex: number } | null>(null);
  const reorderSourceType = ref<string | null>(null);

  // レンダラーを初期化（プレビュー用、編集属性は無効）
  const { renderComponentToHtml } = useZeroCodeRenderer(cmsData, false);

  // ========================================
  // Computed Properties
  // ========================================
  const currentTypes = computed(() => {
    const parts = cmsData.parts;
    if (activeCategory.value === 'common') {
      return parts.common;
    } else if (activeCategory.value === 'individual') {
      return parts.individual;
    } else {
      return parts.special;
    }
  });

  const groupedPartsByType = computed(() => {
    const types = currentTypes.value;
    const typeMap = new Map<string, Array<{ type: TypeData; partIndex: number }>>();

    types.forEach((type) => {
      if (!typeMap.has(type.type)) {
        typeMap.set(type.type, []);
      }

      type.parts.forEach((_, partIndex) => {
        typeMap.get(type.type)!.push({ type, partIndex });
      });
    });

    return Array.from(typeMap.entries()).map(([typeName, entries]) => ({
      type: typeName,
      parts: entries.map((entry) => ({
        ...entry.type,
        _partIndex: entry.partIndex,
        _displayPart: entry.type.parts[entry.partIndex]
      }))
    }));
  });

  // ========================================
  // ヘルパー関数
  // ========================================
  function getTargetArray() {
    const parts = cmsData.parts;
    if (activeCategory.value === 'common') {
      return parts.common;
    } else if (activeCategory.value === 'individual') {
      return parts.individual;
    } else {
      return parts.special;
    }
  }

  function findTypeByType(type: string): TypeData | null {
    return currentTypes.value.find((t) => t.type === type) || null;
  }

  function getPartSlots(partIndex: number): Record<string, any> | null {
    if (editingPart.value && editingPart.value.partIndex === partIndex) {
      return editingPart.value.part.slots || null;
    }
    return null;
  }

  function updatePartSlots(
    partIndex: number,
    slotName: string,
    updater: (slots: Record<string, any>) => void
  ): boolean {
    void slotName;
    if (editingPart.value && editingPart.value.partIndex === partIndex) {
      const part = editingPart.value.part;
      if (!part.slots) {
        part.slots = {};
      }
      updater(part.slots);
      return true;
    }

    return false;
  }

  function createDefaultFieldValues(
    fieldInfos: ReturnType<typeof extractFieldsFromTemplate>
  ): Record<string, any> {
    const defaults: Record<string, any> = {};

    fieldInfos.forEach((field) => {
      if (field.optional) {
        defaults[field.fieldName] = undefined;
      } else {
        switch (field.type) {
          case 'text':
            defaults[field.fieldName] = field.defaultValue || '';
            break;
          case 'radio':
            defaults[field.fieldName] = field.options?.[0]?.value || '';
            break;
          case 'checkbox':
            defaults[field.fieldName] = [];
            break;
          case 'boolean':
            defaults[field.fieldName] = true;
            break;
          case 'rich':
            defaults[field.fieldName] = field.defaultValue
              ? `<p>${field.defaultValue}</p>`
              : '<p></p>';
            break;
          case 'image':
            defaults[field.fieldName] = field.defaultValue || '';
            break;
        }
      }
    });

    return defaults;
  }

  // ========================================
  // タイプ管理関数
  // ========================================
  function selectType(type: TypeData) {
    selectedType.value = type;
    editingType.value = null;
    isCreatingNew.value = false;
  }

  function startCreating() {
    if (isActiveCategoryFileManaged.value) {
      logger.warn(
        `usePartsManager: category "${activeCategory.value}" is file-managed; startCreating blocked`
      );
      return;
    }
    editingType.value = reactive({
      id: generateId(),
      type: '',
      description: '',
      parts: [
        {
          id: generateId(),
          title: 'part_1',
          description: '',
          body: '<div>{$content:コンテンツを入力}</div>'
        }
      ]
    });
    editingLevel.value = 'type';
    isCreatingNew.value = true;
    selectedType.value = null;
  }

  function startEditingType(type: TypeData) {
    if (isActiveCategoryFileManaged.value) {
      logger.warn(
        `usePartsManager: category "${activeCategory.value}" is file-managed; startEditingType blocked`
      );
      return;
    }
    editingType.value = reactive(JSON.parse(JSON.stringify(type)));
    editingLevel.value = 'type';
    isCreatingNew.value = false;
    selectedType.value = type;
  }

  // ファイルで管理するカテゴリは編集できないため、開いているパーツも元のデータの更新
  // （ファイルを保存してホストが setData で差し替えたとき）に追従させる
  watch(currentTypes, (types) => {
    const open = editingPart.value;
    if (!open || !isActiveCategoryFileManaged.value) return;
    for (const type of types) {
      const partIndex = type.parts.findIndex((part) => part.id === open.part.id);
      if (partIndex !== -1) {
        startEditingPart(type, partIndex);
        return;
      }
    }
  });

  function startEditingPart(type: TypeData, partIndex: number) {
    const part = type.parts[partIndex];
    if (!part) return;

    const partCopy = JSON.parse(JSON.stringify(part));
    if (!partCopy.slots) {
      partCopy.slots = {};
    }

    editingPart.value = {
      type: reactive(JSON.parse(JSON.stringify(type))),
      partIndex,
      part: reactive(partCopy)
    };
    editingPartSnapshot.value = JSON.stringify(partCopy);
    editingLevel.value = 'part';
  }

  async function addPartToType(type: TypeData) {
    if (isActiveCategoryFileManaged.value) {
      logger.warn(
        `usePartsManager: category "${activeCategory.value}" is file-managed; addPartToType blocked`
      );
      return;
    }
    const originalType = findTypeByType(type.type);
    if (!originalType) return;

    const typeCopy = reactive(JSON.parse(JSON.stringify(originalType)));
    const newPart: PartData = {
      id: generateId(),
      title: `part_${typeCopy.parts.length + 1}`,
      description: '',
      body: '<div>{$content:コンテンツを入力}</div>'
    };

    typeCopy.parts.push(newPart);
    const newPartIndex = typeCopy.parts.length - 1;

    await nextTick();
    editingPart.value = {
      type: typeCopy,
      partIndex: newPartIndex,
      part: reactive(JSON.parse(JSON.stringify(newPart))),
      isNewPart: true
    };
    editingPartSnapshot.value = JSON.stringify(newPart);
    editingLevel.value = 'part';
  }

  const isPartDirty = computed(() => {
    if (!editingPart.value || editingPartSnapshot.value === null) return false;
    return JSON.stringify(toRaw(editingPart.value.part)) !== editingPartSnapshot.value;
  });

  async function saveType() {
    if (!editingType.value) return;
    if (isActiveCategoryFileManaged.value) {
      logger.warn(
        `usePartsManager: category "${activeCategory.value}" is file-managed; saveType blocked`
      );
      return;
    }

    const validation = validateType(editingType.value);
    if (!validation.valid) {
      alert(t('partsManager.validationError') + '\n' + validation.errors.join('\n'));
      return;
    }

    const typeData = JSON.parse(JSON.stringify(toRaw(editingType.value)));
    const targetArray = getTargetArray();

    if (isCreatingNew.value) {
      targetArray.push(typeData);
    } else {
      const index = targetArray.findIndex((t) => t.id === editingType.value!.id);
      if (index !== -1) {
        targetArray[index] = typeData;
      }
    }

    await nextTick();
    // 強制的に再計算
    void currentTypes.value;
    void groupedPartsByType.value;

    editingType.value = null;
    editingLevel.value = null;
    isCreatingNew.value = false;
  }

  function validateTemplateHtml(html: string): { hasWarning: boolean; messages: string[] } {
    const messages: string[] = [];
    const lower = html.toLowerCase();

    const dangerousTags = ['script', 'iframe', 'object', 'embed'];
    const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur'];

    dangerousTags.forEach((tag) => {
      if (lower.includes(`<${tag}`)) {
        messages.push(t('partsManager.dangerousTagWarning', { tag }));
      }
    });

    dangerousAttrs.forEach((attr) => {
      if (lower.includes(`${attr}=`)) {
        messages.push(t('partsManager.dangerousAttrWarning', { attr }));
      }
    });

    return {
      hasWarning: messages.length > 0,
      messages
    };
  }

  async function savePart() {
    if (!editingPart.value) return;
    if (isActiveCategoryFileManaged.value) {
      logger.warn(
        `usePartsManager: category "${activeCategory.value}" is file-managed; savePart blocked`
      );
      return;
    }

    let body = editingPart.value.part.body || '';
    const validation = validateTemplateHtml(body);
    if (validation.hasWarning) {
      const proceed = confirm(
        `テンプレートにセキュリティ上注意が必要な記述が含まれています。\n\n${validation.messages.join(
          '\n'
        )}\n\nこのまま保存しますか？`
      );
      if (!proceed) return;
    }

    if (options?.sanitize) {
      body = sanitizePartTemplate(body);
      editingPart.value.part.body = body;
    }

    if (options?.beforeSavePart) {
      try {
        body = await options.beforeSavePart(body);
        editingPart.value.part.body = body;
      } catch (e) {
        logger.error('beforeSavePart hook failed:', e);
        return;
      }
    }

    const targetArray = getTargetArray();
    const typeIndex = targetArray.findIndex((t) => t.id === editingPart.value!.type.id);
    if (typeIndex === -1) return;

    const targetType = targetArray[typeIndex];
    const savedPart = JSON.parse(JSON.stringify(toRaw(editingPart.value.part)));

    if (editingPart.value.isNewPart) {
      targetType.parts.push(savedPart);
    } else {
      targetType.parts[editingPart.value.partIndex] = savedPart;
    }

    await nextTick();
    void currentTypes.value;
    void groupedPartsByType.value;

    editingPart.value = null;
    editingPartSnapshot.value = null;
    editingLevel.value = null;
  }

  function deletePart(type: TypeData & { _partIndex?: number }) {
    if (isActiveCategoryFileManaged.value) return;
    const targetType = currentTypes.value.find((t) => t.id === type.id);
    if (!targetType) return;

    if (type._partIndex !== undefined && type._partIndex !== null) {
      if (targetType.parts.length > 1) {
        targetType.parts.splice(type._partIndex, 1);
      } else {
        const index = currentTypes.value.findIndex((t) => t.id === type.id);
        if (index !== -1) {
          currentTypes.value.splice(index, 1);
        }
      }
    } else {
      const index = currentTypes.value.findIndex((t) => t.id === type.id);
      if (index !== -1) {
        currentTypes.value.splice(index, 1);
      }
    }

    selectedType.value = null;
    editingType.value = null;
  }

  function checkTypeUsage(typeName: string): Array<{ path: string; component: ComponentData }> {
    const usages: Array<{ path: string; component: ComponentData }> = [];

    const checkComponent = (component: ComponentData, path: string) => {
      const found = findTypeAndPartByPartId(component.part_id, cmsData.parts);
      if (found && found.type.type === typeName) {
        usages.push({ path, component });
      }

      if (component.slots) {
        Object.entries(component.slots).forEach(([slotName, slotData]) => {
          if (Array.isArray(slotData)) {
            slotData.forEach((child, index) => {
              checkComponent(child, `${path}.slots.${slotName}.${index}`);
            });
          }
        });
      }
    };

    cmsData.page.forEach((component, index) => {
      checkComponent(component, `page.${index}`);
    });

    return usages;
  }

  // ========================================
  // プレビュー関連
  // ========================================
  function createTempComponentFromType(type: TypeData, part: PartData): ComponentData {
    const fieldInfos = extractFieldsFromTemplate(part.body);
    const defaults = createDefaultFieldValues(fieldInfos);

    const component: ComponentData = {
      id: 'preview',
      part_id: part.id,
      ...defaults
    };

    // 循環参照を防ぐため、処理済みパーツを追跡するSetを作成
    const processedParts = new Set<string>();
    processedParts.add(`${type.id}:${part.id}`);

    // スロットの初期値を設定（パーツのslots設定を使用）
    const slotConfigs = part.slots;
    if (slotConfigs) {
      const slots: Record<string, ComponentData[]> = {};

      Object.entries(slotConfigs).forEach(([slotName, slotConfig]) => {
        const allowedPartIds = slotConfig.allowedParts;
        if (allowedPartIds && allowedPartIds.length > 0) {
          // 複数選択されている場合は最後のパーツを表示
          const allowedPartId = allowedPartIds[allowedPartIds.length - 1];
          const child = findTypeAndPartByPartId(allowedPartId, cmsData.parts);

          if (child) {
            const childComponent = createTempComponentFromTypeRecursive(
              child.type,
              child.part.id,
              processedParts
            );
            slots[slotName] = [childComponent];
          } else {
            slots[slotName] = [];
          }
        } else {
          slots[slotName] = [];
        }
      });

      if (Object.keys(slots).length > 0) {
        component.slots = slots;
      }
    }

    return component;
  }

  // 再帰的にコンポーネントを作成（初期スロットも設定、プレビュー用）
  function createTempComponentFromTypeRecursive(
    type: TypeData,
    partId?: string,
    processedParts: Set<string> = new Set()
  ): ComponentData {
    // 使用するパーツを決定
    const part = partId ? type.parts.find((p) => p.id === partId) || type.parts[0] : type.parts[0];

    if (!part) {
      throw new Error(`Part not found for type: ${type.type}`);
    }

    // 循環参照を防ぐため、同じパーツが2回以上処理されないようにする
    const partKey = `${type.id}:${part.id}`;
    if (processedParts.has(partKey)) {
      // 循環参照が検出された場合は、スロットなしでコンポーネントを作成
      const fieldInfos = extractFieldsFromTemplate(part.body);
      const defaults = createDefaultFieldValues(fieldInfos);
      return {
        id: 'preview',
        part_id: part.id,
        ...defaults
      };
    }
    processedParts.add(partKey);

    const fieldInfos = extractFieldsFromTemplate(part.body);
    const defaults = createDefaultFieldValues(fieldInfos);

    const component: ComponentData = {
      id: 'preview',
      part_id: part.id,
      ...defaults
    };

    // スロットの初期値を設定（パーツのslots設定を使用）
    const slotConfigs = part.slots;
    if (slotConfigs) {
      const slots: Record<string, ComponentData[]> = {};

      Object.entries(slotConfigs).forEach(([slotName, slotConfig]) => {
        const allowedPartIds = slotConfig.allowedParts;
        if (allowedPartIds && allowedPartIds.length > 0) {
          // 複数選択されている場合は最後のパーツを表示
          const allowedPartId = allowedPartIds[allowedPartIds.length - 1];
          const child = findTypeAndPartByPartId(allowedPartId, cmsData.parts);

          if (child) {
            const childComponent = createTempComponentFromTypeRecursive(
              child.type,
              child.part.id,
              processedParts
            );
            slots[slotName] = [childComponent];
          } else {
            slots[slotName] = [];
          }
        } else {
          slots[slotName] = [];
        }
      });

      if (Object.keys(slots).length > 0) {
        component.slots = slots;
      }
    }

    return component;
  }

  function findPartForPreview(partId: string): PartData | null {
    return findPartById(partId, cmsData.parts);
  }

  function getPartPreviewHtml(type: TypeData, part: PartData): string {
    if (!part) return '';
    const tempComponent = createTempComponentFromType(type, part);
    return getPartPreviewHtmlWithComponent(part, tempComponent);
  }

  function getPartPreviewHtmlWithComponent(part: PartData, component: ComponentData): string {
    if (!part) return '';
    return processTemplateWithDOM(
      part.body,
      component,
      '',
      findPartForPreview,
      (childComponent: ComponentData, path: string) => renderComponentToHtml(childComponent, path),
      false,
      cmsData.images.common,
      cmsData.images.individual,
      cmsData.images.special
    );
  }

  // ========================================
  // スロット管理関数
  // ========================================
  function extractSlotsFromTemplate(template: string): string[] {
    const slots: string[] = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<template>${template}</template>`, 'text/html');
      const templateEl = doc.querySelector('template');
      if (!templateEl) return slots;

      const slotElements = templateEl.content.querySelectorAll('[z-slot]');
      slotElements.forEach((el) => {
        const slotName = el.getAttribute('z-slot') || 'default';
        if (!slots.includes(slotName)) {
          slots.push(slotName);
        }
      });
    } catch (error) {
      logger.error('Failed to parse template:', error);
    }
    return slots;
  }

  function getAvailableSlotsForPart(partIndex: number): string[] {
    if (editingPart.value && editingPart.value.partIndex === partIndex) {
      const template = editingPart.value.part.body;
      const allSlots = extractSlotsFromTemplate(template);
      const configuredSlots = Object.keys(editingPart.value.part.slots || {});
      return allSlots.filter((slot) => !configuredSlots.includes(slot));
    }

    return [];
  }

  function addPartSlot(partIndex: number, slotName?: string) {
    if (isActiveCategoryFileManaged.value) return;
    let selectedSlotName: string | null = slotName || null;

    if (!selectedSlotName) {
      selectedSlotName = prompt('スロット名を入力してください:');
      if (!selectedSlotName?.trim()) return;
    }

    const success = updatePartSlots(partIndex, selectedSlotName.trim(), (slots) => {
      if (slots[selectedSlotName.trim()]) {
        alert('このスロット名は既に存在します');
        return;
      }
      slots[selectedSlotName.trim()] = {};
    });

    if (!success) {
      alert('パーツが見つかりません');
    }
  }

  function removePartSlot(partIndex: number, slotName: string) {
    if (isActiveCategoryFileManaged.value) return;
    const slots = getPartSlots(partIndex);
    if (!slots?.[slotName]) return;

    if (!confirm(`スロット「${slotName}」を削除しますか？`)) return;

    updatePartSlots(partIndex, slotName, (slots) => {
      delete slots[slotName];
    });
  }

  function updatePartSlotAllowedParts(partIndex: number, slotName: string, value: string[]) {
    if (isActiveCategoryFileManaged.value) return;
    const success = updatePartSlots(partIndex, slotName, (slots) => {
      if (slots[slotName]) {
        slots[slotName].allowedParts = value;
      }
    });

    if (!success) {
      logger.warn(`Failed to update allowed parts for slot ${slotName}`);
    }
  }

  // ========================================
  // 並べ替え関数
  // ========================================
  function handleReorderClick(type: TypeData, partIndex: number) {
    if (isActiveCategoryFileManaged.value) return;
    // 1回目のクリック: 移動元を選択
    if (!reorderSourcePart.value) {
      reorderSourcePart.value = { type: type.type, partIndex };
      return;
    }

    // 同じ要素をクリック: キャンセル
    if (
      reorderSourcePart.value.type === type.type &&
      reorderSourcePart.value.partIndex === partIndex
    ) {
      cancelReorder();
      return;
    }

    // 2回目のクリック: 並べ替え実行
    const source = reorderSourcePart.value;
    const target = { type: type.type, partIndex };

    if (!canReorderParts(source, target)) {
      alert('同じタイプ内のパーツのみ並べ替えできます');
      cancelReorder();
      return;
    }

    // 並べ替え実行
    reorderParts(source, target);
    cancelReorder();
  }

  function canReorderParts(
    source: { type: string; partIndex: number },
    target: { type: string; partIndex: number }
  ): boolean {
    // 同じタイプ内のみ並べ替え可能
    if (source.type !== target.type) {
      return false;
    }
    // 同じパーツは不可
    if (source.partIndex === target.partIndex) {
      return false;
    }
    return true;
  }

  function reorderParts(
    source: { type: string; partIndex: number },
    target: { type: string; partIndex: number }
  ) {
    if (isActiveCategoryFileManaged.value) {
      logger.warn(
        `usePartsManager: category "${activeCategory.value}" is file-managed; reorderParts blocked`
      );
      return;
    }
    const targetArray = getTargetArray();
    const typeIndex = targetArray.findIndex((t) => t.type === source.type);

    if (typeIndex === -1) return;

    const type = targetArray[typeIndex];
    const parts = type.parts;

    // 配列の順序を入れ替え
    const [removed] = parts.splice(source.partIndex, 1);
    parts.splice(target.partIndex, 0, removed);
  }

  function cancelReorder() {
    reorderSourcePart.value = null;
  }

  // ========================================
  // タイプ削除・タイプ並べ替え
  // ========================================
  function deletePartType(type: string) {
    if (isActiveCategoryFileManaged.value) {
      logger.warn(
        `usePartsManager: category "${activeCategory.value}" is file-managed; deletePartType blocked`
      );
      return;
    }
    const targetArray = getTargetArray();
    const usages = checkTypeUsage(type);

    if (usages.length > 0) {
      if (!confirm(`タイプ「${type}」は${usages.length}箇所で使用されています。削除しますか？`)) {
        return;
      }
    } else {
      if (!confirm(`タイプ「${type}」を削除しますか？`)) {
        return;
      }
    }

    for (let i = targetArray.length - 1; i >= 0; i--) {
      if (targetArray[i].type === type) {
        targetArray.splice(i, 1);
      }
    }
  }

  function reorderPartTypes(sourceType: string, targetType: string) {
    if (sourceType === targetType) return;
    if (isActiveCategoryFileManaged.value) {
      logger.warn(
        `usePartsManager: category "${activeCategory.value}" is file-managed; reorderPartTypes blocked`
      );
      return;
    }

    const targetArray = getTargetArray();

    // type ごとにブロックを構成
    const typeMap = new Map<string, TypeData[]>();
    const typeOrder: string[] = [];

    targetArray.forEach((type) => {
      if (!typeMap.has(type.type)) {
        typeMap.set(type.type, []);
        typeOrder.push(type.type);
      }
      typeMap.get(type.type)!.push(type);
    });

    const blocks = typeOrder.map((t) => ({
      type: t,
      types: typeMap.get(t)!
    }));

    const sourceIndex = blocks.findIndex((b) => b.type === sourceType);
    const targetIndex = blocks.findIndex((b) => b.type === targetType);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = blocks.splice(sourceIndex, 1);
    blocks.splice(targetIndex, 0, moved);

    // 新しい順序で targetArray を再構成
    targetArray.splice(0, targetArray.length);
    blocks.forEach((b) => {
      b.types.forEach((t) => targetArray.push(t));
    });
  }

  function startReorderType(type: string) {
    if (isActiveCategoryFileManaged.value) {
      logger.warn(
        `usePartsManager: category "${activeCategory.value}" is file-managed; startReorderType blocked`
      );
      return;
    }
    // 1回目のクリックで移動元タイプをセット
    if (!reorderSourceType.value) {
      reorderSourceType.value = type;
      return;
    }

    // 同じタイプを再度クリックでキャンセル
    if (reorderSourceType.value === type) {
      reorderSourceType.value = null;
      return;
    }

    // 2回目のクリックで並べ替え実行
    reorderPartTypes(reorderSourceType.value, type);
    reorderSourceType.value = null;
  }

  // ========================================
  // その他の関数
  // ========================================
  function cancelEditingType() {
    editingType.value = null;
    editingLevel.value = null;
    isCreatingNew.value = false;
  }

  function cancelEditingPart() {
    editingPart.value = null;
    editingPartSnapshot.value = null;
    editingLevel.value = null;
  }

  function validateType(type: TypeData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!type.type || type.type.trim() === '') {
      errors.push('タイプ名は必須です');
    } else if (isCreatingNew.value) {
      const exists = getTargetArray().some((t) => t.type === type.type.trim());
      if (exists) {
        errors.push(`タイプ「${type.type}」は既に存在します`);
      }
    }

    if (!type.parts || type.parts.length === 0) {
      errors.push('最低1つのパーツが必要です');
    } else {
      type.parts.forEach((part, index) => {
        if (!part.title || part.title.trim() === '') {
          errors.push(`パーツ ${index + 1} のタイトルは必須です`);
        }
        if (!part.body || part.body.trim() === '') {
          errors.push(`パーツ ${index + 1} のテンプレートは必須です`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ========================================
  // エクスポート
  // ========================================
  return {
    // ファイルで管理するカテゴリ
    isActiveCategoryFileManaged,

    // 並べ替え
    reorderSourcePart,
    handleReorderClick,
    canReorderParts,
    cancelReorder,

    // 既存のexport
    activeCategory,
    selectedType,
    editingType,
    editingPart,
    isPartDirty,
    editingLevel,
    isCreatingNew,
    currentTypes,
    groupedPartsByType,
    selectType,
    startCreating,
    startEditingType,
    startEditingPart,
    addPartToType,
    saveType,
    savePart,
    deletePart,
    checkTypeUsage,
    cancelEditingType,
    cancelEditingPart,
    getPartPreviewHtml,
    getPartPreviewHtmlWithComponent,
    createTempComponentFromType,
    validateType,
    addPartSlot,
    removePartSlot,
    updatePartSlotAllowedParts,
    getAvailableSlotsForPart,
    extractSlotsFromTemplate,
    // タイプ単位の削除・並べ替え
    reorderSourceType,
    startReorderType,
    deletePartType
  };
}
