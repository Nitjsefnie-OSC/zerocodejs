import { ref, computed, nextTick, unref, watch, type Ref } from 'vue';

import type {
  ZeroCodeData,
  ComponentData,
  TypeData,
  PartData,
  SlotConfig,
  CMSConfig
} from '../../../types';
import { getComponentByPath, generateId } from '../../../core/utils/path-utils';
import { extractFieldsFromTemplate } from '../../../core/utils/field-extractor';
import { logger } from '../../../core/utils/logger';
import {
  setActiveOutline,
  removeActiveOutline,
  setActiveOutlineForPath,
  removeActiveOutlineForPath,
  findElementsByZcodePath,
  findScrollTargetByZcodePath
} from '../../editor/composables/useOutlineManager';
import { scrollToElement } from '../../../core/utils/dom-utils';
import { syncAddBetweenButtonCurrentState } from '../../../core/utils/page-add-buttons';
import type { EditorMode } from '../../editor/composables/useEditorMode';

export interface AddModeActions {
  switchMode?: (mode: EditorMode) => void;
  handleEditClick?: (path: string, component: ComponentData) => void;
}

export function useAddMode(
  cmsData: ZeroCodeData,
  previewArea: Ref<HTMLElement | null>,
  renderComponentPreviewHtml: (component: ComponentData, path?: string) => string,
  config?: Partial<CMSConfig>,
  scrollIntoViewOnPartEdit: Ref<boolean> = ref(false),
  actions: AddModeActions = {}
) {
  const addTargetPath = ref<string | null>(null);
  const addSelectedType = ref<TypeData | null>(null);
  const addSelectedPart = ref<PartData | null>(null);
  const addPartCategory = ref<'common' | 'individual' | 'special'>(
    config?.categoryOrder === 'individual'
      ? 'individual'
      : config?.categoryOrder === 'special'
        ? 'special'
        : 'common'
  );
  const addTypeTab = ref<string | 'all' | 'selected' | null>('all');
  const clickedComponent = ref<ComponentData | null>(null);
  const addInsertBefore = ref<boolean>(false);
  const insertBeforeActive = ref<boolean>(false);
  const editAfterAdd = ref<boolean>(false);

  function syncBetweenButtonHighlight() {
    syncAddBetweenButtonCurrentState(
      previewArea.value,
      addTargetPath.value,
      insertBeforeActive.value
    );
  }

  watch([addTargetPath, insertBeforeActive], () => {
    nextTick(syncBetweenButtonHighlight);
  });

  function setAddInsertBeforeUserOption(value: boolean) {
    addInsertBefore.value = value;
    if (addTargetPath.value) {
      insertBeforeActive.value = value;
      nextTick(syncBetweenButtonHighlight);
    }
  }

  function getSlotPath(path: string): string {
    if (path.includes('.slots.')) {
      const pathParts = path.split('.');
      let lastSlotIndex = -1;
      for (let i = pathParts.length - 1; i >= 0; i--) {
        if (pathParts[i] === 'slots') {
          lastSlotIndex = i;
          break;
        }
      }
      if (lastSlotIndex !== -1 && lastSlotIndex + 1 < pathParts.length) {
        return pathParts.slice(0, lastSlotIndex + 2).join('.');
      }
    }
    return path;
  }

  const availablePartTypes = computed(() => {
    const parts = cmsData.parts;
    const targetTypes =
      addPartCategory.value === 'common'
        ? parts.common
        : addPartCategory.value === 'individual'
          ? parts.individual
          : parts.special;

    if (addTargetPath.value && addTargetPath.value.includes('.slots.')) {
      const allTypes = [...parts.common, ...parts.individual, ...parts.special];
      const slotPath = getSlotPath(addTargetPath.value);
      return getAvailableTypesForSlot(slotPath, allTypes, targetTypes);
    }

    const allTypeNames = [...new Set(targetTypes.map((t) => t.type))];
    return allTypeNames;
  });

  function getAvailablePartsForSlot(path: string, allTypesForLookup: TypeData[]): string[] | null {
    const pathParts = path.split('.');

    let lastSlotIndex = -1;
    for (let i = pathParts.length - 1; i >= 0; i--) {
      if (pathParts[i] === 'slots') {
        lastSlotIndex = i;
        break;
      }
    }

    if (lastSlotIndex === -1) {
      return null;
    }

    const parentPath = pathParts.slice(0, lastSlotIndex).join('.');
    const slotName = pathParts[lastSlotIndex + 1];

    const parent = getComponentByPath(parentPath, cmsData);
    if (!parent) {
      return null;
    }

    const partId = parent.part_id;
    let typeData: TypeData | null = null;
    for (const type of allTypesForLookup) {
      if (type.parts.some((p) => p.id === partId)) {
        typeData = type;
        break;
      }
    }

    if (!typeData) {
      return null;
    }

    const part = typeData.parts.find((p) => p.id === partId) || typeData.parts[0];

    const slotConfig = part?.slots?.[slotName];

    if (slotConfig) {
      const allowedParts = slotConfig.allowedParts;
      if (allowedParts && Array.isArray(allowedParts)) {
        return allowedParts;
      }
    }

    return null;
  }

  const groupedPartsByType = computed(() => {
    const parts = cmsData.parts;
    const targetTypes =
      addPartCategory.value === 'common'
        ? parts.common
        : addPartCategory.value === 'individual'
          ? parts.individual
          : parts.special;

    const availableTypes = availablePartTypes.value;
    let filteredTypes = targetTypes.filter((t) => availableTypes.includes(t.type));

    if (addTypeTab.value && addTypeTab.value !== 'all' && addTypeTab.value !== 'selected') {
      filteredTypes = filteredTypes.filter((t) => t.type === addTypeTab.value);
    }

    const allTypes = [...parts.common, ...parts.individual, ...parts.special];
    const availableParts =
      addTargetPath.value && addTargetPath.value.includes('.slots.')
        ? getAvailablePartsForSlot(getSlotPath(addTargetPath.value), allTypes)
        : null;

    const grouped = new Map<string, { type: TypeData; parts: PartData[] }>();

    filteredTypes.forEach((type) => {
      if (!grouped.has(type.type)) {
        grouped.set(type.type, {
          type,
          parts: []
        });
      }
      const group = grouped.get(type.type)!;

      if (availableParts !== null) {
        if (availableParts.length > 0) {
          type.parts.forEach((p) => {
            if (availableParts.includes(p.id)) {
              group.parts.push(p);
            }
          });
        }
      } else {
        type.parts.forEach((p) => {
          if (!p.slotOnly) {
            group.parts.push(p);
          }
        });
      }
    });

    return Array.from(grouped.values()).map((group) => ({
      type: group.type.type,
      description: group.type.description,
      typeData: group.type,
      parts: group.parts
    }));
  });

  // スロット用の利用可能なタイプを取得
  function getAvailableTypesForSlot(
    path: string,
    allTypesForLookup: TypeData[],
    filteredTypes: TypeData[]
  ): string[] {
    // pathから親コンポーネントを取得
    const pathParts = path.split('.');

    // 最後の'slots'セグメントを見つける（ネストされたスロットに対応）
    let lastSlotIndex = -1;
    for (let i = pathParts.length - 1; i >= 0; i--) {
      if (pathParts[i] === 'slots') {
        lastSlotIndex = i;
        break;
      }
    }

    if (lastSlotIndex === -1) {
      // スロットがない場合は全タイプを返す
      return [...new Set(filteredTypes.map((t) => t.type))];
    }

    // 最後の'slots'セグメントまでの親パスを取得
    const parentPath = pathParts.slice(0, lastSlotIndex).join('.');
    const slotName = pathParts[lastSlotIndex + 1];

    const parent = getComponentByPath(parentPath, cmsData);
    if (!parent) {
      return [...new Set(filteredTypes.map((t) => t.type))];
    }

    // タイプデータ側の設定を確認（part_idからパーツを検索）
    const partId = parent.part_id;
    let typeData: TypeData | null = null;
    let partData: PartData | null = null;
    for (const type of allTypesForLookup) {
      const foundPart = type.parts.find((p) => p.id === partId);
      if (foundPart) {
        typeData = type;
        partData = foundPart;
        break;
      }
    }

    if (!typeData || !partData) {
      return [...new Set(filteredTypes.map((t) => t.type))];
    }

    // パーツのslots設定を使用
    const slotConfig = partData?.slots?.[slotName];

    if (slotConfig) {
      const allowedPartIds = slotConfig.allowedParts;
      if (allowedPartIds && Array.isArray(allowedPartIds)) {
        // すべてのタイプから、指定されたパーツIDを含むタイプを取得
        const typesWithAllowedParts = new Set<string>();
        allTypesForLookup.forEach((type) => {
          type.parts.forEach((p) => {
            if (allowedPartIds.includes(p.id)) {
              typesWithAllowedParts.add(type.type);
            }
          });
        });

        let types = Array.from(typesWithAllowedParts);

        // 最後に、filteredTypesに存在するタイプのみを返す（カテゴリフィルタリング）
        types = types.filter((t) => filteredTypes.some((type) => type.type === t));

        return types;
      }
    }

    return [...new Set(filteredTypes.map((t) => t.type))];
  }

  function handleAddClick(
    path: string,
    optionsOrIsParentSelection?:
      | boolean
      | { isParentSelection?: boolean; insertBefore?: boolean; fromInsertMarker?: boolean }
  ) {
    let isParentSelection = false;
    let fromInsertMarker = false;
    let insertBefore = addInsertBefore.value;

    if (typeof optionsOrIsParentSelection === 'boolean') {
      isParentSelection = optionsOrIsParentSelection;
    } else if (optionsOrIsParentSelection) {
      isParentSelection = optionsOrIsParentSelection.isParentSelection ?? false;
      fromInsertMarker = optionsOrIsParentSelection.fromInsertMarker === true;
      if (fromInsertMarker) {
        insertBefore = optionsOrIsParentSelection.insertBefore ?? false;
      }
    }

    void isParentSelection;
    if (addTargetPath.value === path && insertBeforeActive.value === insertBefore) {
      cancelAdd();
      return;
    }

    if (addTargetPath.value && previewArea.value) {
      removeActiveOutlineForPath(previewArea.value, addTargetPath.value);

      const previousSlotElement = previewArea.value.querySelector(
        `[data-zcode-slot-path="${addTargetPath.value}"]`
      ) as HTMLElement;
      if (previousSlotElement) {
        removeActiveOutline(previousSlotElement);
      }
    }

    addTargetPath.value = path;

    addTypeTab.value = 'all';
    addPartCategory.value = 'common';
    addSelectedType.value = null;
    addSelectedPart.value = null;
    insertBeforeActive.value = insertBefore;
    syncBetweenButtonHighlight();

    const component = getComponentByPath(path, cmsData);
    if (component && component.part_id) {
      clickedComponent.value = component;
    } else {
      clickedComponent.value = null;
    }

    const parts = cmsData.parts;
    const commonTypes = parts.common;
    const individualTypes = parts.individual;
    const specialTypes = parts.special;

    let commonAvailableTypes: string[] = [];
    let individualAvailableTypes: string[] = [];
    // specialAvailableTypesは現在未使用（将来の拡張用）
    // let specialAvailableTypes: string[] = [];

    if (path.includes('.slots.')) {
      const allTypes = [...commonTypes, ...individualTypes, ...specialTypes];
      const slotPath = getSlotPath(path);
      commonAvailableTypes = getAvailableTypesForSlot(slotPath, allTypes, commonTypes);
      individualAvailableTypes = getAvailableTypesForSlot(slotPath, allTypes, individualTypes);
      // specialAvailableTypesは現在未使用（将来の拡張用）
      // specialAvailableTypes = getAvailableTypesForSlot(slotPath, allTypes, specialTypes);
    } else {
      commonAvailableTypes = [...new Set(commonTypes.map((t: TypeData) => t.type))];
      individualAvailableTypes = [...new Set(individualTypes.map((t: TypeData) => t.type))];
      // specialAvailableTypesは現在未使用（将来の拡張用）
      // specialAvailableTypes = [...new Set(specialTypes.map((t: TypeData) => t.type))];
    }

    const hasCommonParts = commonAvailableTypes.length > 0;
    const hasIndividualParts = individualAvailableTypes.length > 0;
    const hasSpecialParts = specialTypes.length > 0;

    const categoryOrder = config?.categoryOrder;

    let selectedCategory: 'common' | 'individual' | 'special';

    if (categoryOrder === 'special' && hasSpecialParts) {
      selectedCategory = 'special';
    } else if (categoryOrder === 'individual' && hasIndividualParts) {
      selectedCategory = 'individual';
    } else if (categoryOrder === 'common' && hasCommonParts) {
      selectedCategory = 'common';
    } else if (hasCommonParts) {
      selectedCategory = 'common';
    } else if (hasIndividualParts) {
      selectedCategory = 'individual';
    } else if (hasSpecialParts) {
      selectedCategory = 'special';
    } else {
      selectedCategory = 'common';
    }

    addPartCategory.value = selectedCategory;

    nextTick(() => {
      if (previewArea.value && addTargetPath.value === path) {
        const elements = findElementsByZcodePath(previewArea.value, path);
        if (elements.length > 0) {
          setActiveOutlineForPath(previewArea.value, path, 'add');
          if (unref(scrollIntoViewOnPartEdit)) {
            scrollToElement(findScrollTargetByZcodePath(previewArea.value, path) ?? elements[0]);
          }
        } else {
          const slotPath = getSlotPath(path);
          if (slotPath !== path) {
            const slotElement = previewArea.value.querySelector(
              `[data-zcode-slot-path="${slotPath}"]`
            ) as HTMLElement;
            if (slotElement) {
              setActiveOutline(slotElement, 'add');
              if (unref(scrollIntoViewOnPartEdit)) {
                scrollToElement(slotElement);
              }
            }
          }
        }
        syncBetweenButtonHighlight();
      }
    });
  }

  function handleCategoryTabClick(category: 'common' | 'individual' | 'special') {
    addPartCategory.value = category;
    addTypeTab.value = 'all';
    addSelectedType.value = null;
    addSelectedPart.value = null;
  }

  function handleTypeTabClick(type: string | 'all' | 'selected') {
    addTypeTab.value = type;
    if (type === 'selected' && clickedComponent.value && clickedComponent.value.part_id) {
      const parts = cmsData.parts;
      const allTypes = [...parts.common, ...parts.individual, ...parts.special];
      for (const typeData of allTypes) {
        const part = typeData.parts.find((p) => p.id === clickedComponent.value!.part_id);
        if (part) {
          addSelectedType.value = typeData;
          addSelectedPart.value = part;
          break;
        }
      }
    } else if (type !== 'selected') {
      addSelectedType.value = null;
      addSelectedPart.value = null;
    }
  }

  function getPartPreviewHtml(type: TypeData, part: PartData): string {
    const tempComponent = createTempComponentFromType(type, part);
    return renderComponentPreviewHtml(tempComponent, '');
  }

  function getClickedComponentPreviewHtml(): string {
    if (!clickedComponent.value) {
      return '';
    }
    return renderComponentPreviewHtml(clickedComponent.value, '');
  }

  function createTempComponentFromType(type: TypeData, part: PartData): ComponentData {
    const tempComponent = createComponentFromTypeRecursive(type, false, new Set(), part.id);
    tempComponent.id = 'preview';
    return tempComponent;
  }

  function selectPart(type: TypeData, part: PartData) {
    addSelectedType.value = type;
    addSelectedPart.value = part;
    if (addTypeTab.value === 'selected') {
      addTypeTab.value = 'all';
    }
    confirmAddPart(insertBeforeActive.value ? 'before' : 'after');
  }

  function duplicateSelectedPart() {
    if (
      addTypeTab.value !== 'selected' ||
      !clickedComponent.value ||
      !addSelectedPart.value ||
      !addSelectedType.value ||
      !addTargetPath.value
    ) {
      return;
    }
    confirmAddPart(insertBeforeActive.value ? 'before' : 'after');
  }

  function createComponentFromTypeRecursive(
    type: TypeData,
    useSelectedPart: boolean = false,
    processedParts: Set<string> = new Set(),
    partId?: string
  ): ComponentData {
    const part = partId
      ? type.parts.find((p) => p.id === partId) || type.parts[0]
      : useSelectedPart && addSelectedPart.value
        ? addSelectedPart.value
        : type.parts[0];

    if (!part) {
      throw new Error(`Part not found for type: ${type.type}`);
    }

    const partKey = `${type.id}:${part.id}`;
    if (processedParts.has(partKey)) {
      const fieldInfos = extractFieldsFromTemplate(part.body);
      const defaults: Record<string, unknown> = {};
      fieldInfos.forEach((field) => {
        if (field.optional) {
          defaults[field.fieldName] = undefined;
        } else if (field.type === 'text') {
          defaults[field.fieldName] = field.defaultValue;
        } else if (field.type === 'radio') {
          defaults[field.fieldName] = field.options?.[0]?.value;
        } else if (field.type === 'checkbox') {
          defaults[field.fieldName] = [];
        } else if (field.type === 'boolean') {
          defaults[field.fieldName] = true;
        } else if (field.type === 'rich') {
          defaults[field.fieldName] = field.defaultValue
            ? `<p>${field.defaultValue}</p>`
            : '<p></p>';
        } else if (field.type === 'image') {
          defaults[field.fieldName] = field.defaultValue || '';
        }
      });
      return {
        id: generateId(),
        part_id: part.id,
        ...defaults
      };
    }
    processedParts.add(partKey);

    const fieldInfos = extractFieldsFromTemplate(part.body);
    const defaults: Record<string, unknown> = {};

    fieldInfos.forEach((field) => {
      if (field.optional) {
        defaults[field.fieldName] = undefined;
      } else if (field.type === 'text') {
        defaults[field.fieldName] = field.defaultValue;
      } else if (field.type === 'radio') {
        defaults[field.fieldName] = field.options?.[0]?.value;
      } else if (field.type === 'checkbox') {
        defaults[field.fieldName] = [];
      } else if (field.type === 'boolean') {
        defaults[field.fieldName] = true;
      } else if (field.type === 'rich') {
        defaults[field.fieldName] = field.defaultValue ? `<p>${field.defaultValue}</p>` : '<p></p>';
      } else if (field.type === 'image') {
        defaults[field.fieldName] = field.defaultValue || '';
      }
    });

    const component: ComponentData = {
      id: generateId(),
      part_id: part.id,
      ...defaults
    };

    const slotConfigs = part.slots;
    if (slotConfigs) {
      const slots: Record<string, ComponentData[]> = {};

      Object.entries(slotConfigs).forEach(([slotName, slotConfig]) => {
        const allowedPartIds = slotConfig.allowedParts;
        if (allowedPartIds && allowedPartIds.length === 1) {
          const allowedPartId = allowedPartIds[0];
          const parts = cmsData.parts;
          const allTypes = [...parts.common, ...parts.individual, ...parts.special];
          let childType: TypeData | null = null;
          let childPart: PartData | null = null;

          for (const t of allTypes) {
            const foundPart = t.parts.find((p) => p.id === allowedPartId);
            if (foundPart) {
              childType = t;
              childPart = foundPart;
              break;
            }
          }

          if (childType && childPart) {
            const childComponent = createComponentFromTypeRecursive(
              childType,
              false,
              processedParts,
              childPart.id
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

  function createComponentFromType(type: TypeData): ComponentData {
    return createComponentFromTypeRecursive(type, true);
  }

  function confirmAddPart(position: 'before' | 'after') {
    if (!addSelectedType.value || !addSelectedPart.value || !addTargetPath.value) {
      logger.error('Missing required values:', {
        addSelectedType: addSelectedType.value,
        addSelectedPart: addSelectedPart.value,
        addTargetPath: addTargetPath.value
      });
      return;
    }

    let newComponent: ComponentData;
    if (addTypeTab.value === 'selected' && clickedComponent.value) {
      newComponent = JSON.parse(JSON.stringify(clickedComponent.value));
      newComponent.id = generateId();

      if (newComponent.slots) {
        const updateIds = (components: ComponentData[]) => {
          components.forEach((component) => {
            component.id = generateId();
            if (component.slots) {
              Object.values(component.slots).forEach((slotData) => {
                if (Array.isArray(slotData)) {
                  updateIds(slotData);
                } else if (
                  slotData &&
                  typeof slotData === 'object' &&
                  (slotData as SlotConfig).children
                ) {
                  updateIds((slotData as SlotConfig).children || []);
                }
              });
            }
          });
        };

        Object.values(newComponent.slots).forEach((slotData) => {
          if (Array.isArray(slotData)) {
            updateIds(slotData);
          } else if (
            slotData &&
            typeof slotData === 'object' &&
            (slotData as SlotConfig).children
          ) {
            updateIds((slotData as SlotConfig).children || []);
          }
        });
      }
    } else {
      newComponent = createComponentFromType(addSelectedType.value);
    }

    const targetPath = addTargetPath.value;
    const anchorBeforeInsert = targetPath;
    const pathParts = targetPath.split('.');
    let newComponentPath: string | null = null;

    if (pathParts[0] === 'page' && pathParts.length === 2) {
      const index = parseInt(pathParts[1]);
      if (position === 'before') {
        cmsData.page.splice(index, 0, newComponent);
        newComponentPath = `page.${index}`;
      } else {
        cmsData.page.splice(index + 1, 0, newComponent);
        newComponentPath = `page.${index + 1}`;
      }
    } else if (pathParts.includes('slots')) {
      const slotPath = getSlotPath(targetPath);
      const slotPathParts = slotPath.split('.');

      let lastSlotIndex = -1;
      for (let i = slotPathParts.length - 1; i >= 0; i--) {
        if (slotPathParts[i] === 'slots') {
          lastSlotIndex = i;
          break;
        }
      }

      if (lastSlotIndex === -1 || lastSlotIndex >= slotPathParts.length - 1) {
        logger.error('Invalid slot path:', slotPath);
        return;
      }

      const parentPath = slotPathParts.slice(0, lastSlotIndex).join('.');
      const slotName = slotPathParts[lastSlotIndex + 1];

      const slotItemIndex =
        targetPath !== slotPath ? parseInt(pathParts[pathParts.length - 1]) : -1;

      const parent = getComponentByPath(parentPath, cmsData);
      if (!parent) {
        logger.error('Parent component not found:', parentPath);
        return;
      }

      if (!parent.slots) {
        parent.slots = {};
      }

      const slotData = parent.slots[slotName];
      let children: ComponentData[] = [];

      if (Array.isArray(slotData)) {
        children = slotData;
      } else if (slotData && typeof slotData === 'object' && (slotData as SlotConfig).children) {
        children = (slotData as SlotConfig).children || [];
        if (!(slotData as SlotConfig).children) {
          (slotData as SlotConfig).children = [];
        }
      } else {
        parent.slots[slotName] = [];
        children = parent.slots[slotName] as ComponentData[];
      }

      if (slotItemIndex === -1) {
        children.push(newComponent);
        newComponentPath = `${slotPath}.${children.length - 1}`;
      } else {
        const insertionIndex = position === 'before' ? slotItemIndex : slotItemIndex + 1;
        children.splice(insertionIndex, 0, newComponent);
        newComponentPath = `${slotPath}.${insertionIndex}`;
      }

      if (!Array.isArray(parent.slots[slotName])) {
        (parent.slots[slotName] as SlotConfig).children = children;
      }
    }

    if (!clickedComponent.value) {
      if (addTypeTab.value === 'selected') {
        addTypeTab.value = 'all';
      }
    }

    if (editAfterAdd.value && newComponentPath) {
      const addedComponent = getComponentByPath(newComponentPath, cmsData);
      if (!addedComponent) {
        return;
      }

      cancelAdd({ scrollBack: false });
      nextTick(() => {
        actions.switchMode?.('edit');
        nextTick(() => {
          actions.handleEditClick?.(newComponentPath, addedComponent);
        });
      });
      return;
    }

    addSelectedType.value = null;
    addSelectedPart.value = null;

    if (newComponentPath) {
      addTargetPath.value = newComponentPath;
      insertBeforeActive.value = false;
      const nc = getComponentByPath(newComponentPath, cmsData);
      if (nc) {
        clickedComponent.value = nc;
        if (addTypeTab.value === 'selected' && nc.part_id) {
          const parts = cmsData.parts;
          const allTypes = [...parts.common, ...parts.individual, ...parts.special];
          let synced = false;
          for (const typeData of allTypes) {
            const part = typeData.parts.find((p) => p.id === nc.part_id);
            if (part) {
              addSelectedType.value = typeData;
              addSelectedPart.value = part;
              synced = true;
              break;
            }
          }
          if (!synced) {
            addSelectedType.value = null;
            addSelectedPart.value = null;
          }
        }
      }
    }

    nextTick(() => {
      if (!previewArea.value) return;

      const oldEl = findElementsByZcodePath(previewArea.value, anchorBeforeInsert)[0] ?? null;
      const oldSlot = previewArea.value.querySelector(
        `[data-zcode-slot-path="${anchorBeforeInsert}"]`
      ) as HTMLElement | null;
      if (oldEl) removeActiveOutline(oldEl);
      if (oldSlot) removeActiveOutline(oldSlot);

      const nextPath = addTargetPath.value;
      if (!nextPath) return;

      const newElements = findElementsByZcodePath(previewArea.value, nextPath);
      if (newElements.length > 0) {
        setActiveOutlineForPath(previewArea.value, nextPath, 'add');
        if (unref(scrollIntoViewOnPartEdit)) {
          scrollToElement(
            findScrollTargetByZcodePath(previewArea.value, nextPath) ?? newElements[0]
          );
        }
        syncBetweenButtonHighlight();
        return;
      }

      const slotPathOnly = getSlotPath(nextPath);
      if (slotPathOnly === nextPath) {
        const slotEl = previewArea.value.querySelector(
          `[data-zcode-slot-path="${slotPathOnly}"]`
        ) as HTMLElement | null;
        if (slotEl) {
          setActiveOutline(slotEl, 'add');
        }
      }
      syncBetweenButtonHighlight();
    });
  }

  function cancelAdd(options: { scrollBack?: boolean } = {}) {
    const { scrollBack = true } = options;
    if (addTargetPath.value && previewArea.value) {
      const path = addTargetPath.value;
      removeActiveOutlineForPath(previewArea.value, path);
      if (scrollBack && unref(scrollIntoViewOnPartEdit)) {
        const firstElement = findScrollTargetByZcodePath(previewArea.value, path);
        if (firstElement) {
          scrollToElement(firstElement);
        }
      }
      const slotElement = previewArea.value.querySelector(
        `[data-zcode-slot-path="${addTargetPath.value}"]`
      ) as HTMLElement;
      if (slotElement) {
        removeActiveOutline(slotElement);
        if (scrollBack && unref(scrollIntoViewOnPartEdit)) {
          scrollToElement(slotElement);
        }
      }
    }

    addTargetPath.value = null;
    addSelectedType.value = null;
    addSelectedPart.value = null;
    clickedComponent.value = null;
    addPartCategory.value = 'common';
    addTypeTab.value = 'all';
    insertBeforeActive.value = false;
    syncBetweenButtonHighlight();
  }

  const hasSpecialParts = computed(() => cmsData.parts.special.length > 0);

  return {
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
    confirmAddPart,
    cancelAdd
  };
}
