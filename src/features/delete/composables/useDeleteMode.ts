import { ref, unref, type Ref } from 'vue';
import type { ZeroCodeData, ComponentData, TypeData } from '../../../types';
import {
  findTypeAndPartByPartId,
  getComponentByPath,
  generateId
} from '../../../core/utils/path-utils';
import { extractFieldsFromTemplate } from '../../../core/utils/field-extractor';
import { logger } from '../../../core/utils/logger';
import {
  setActiveOutlineForPath,
  removeActiveOutlineForPath,
  findScrollTargetByZcodePath
} from '../../editor/composables/useOutlineManager';
import { scrollToElement } from '../../../core/utils/dom-utils';
import {
  resolveNextSelectionPathAfterDelete,
  resolveSlotFirstChildPath
} from '../utils/delete-sibling-path';

export function useDeleteMode(
  cmsData: ZeroCodeData,
  previewArea: Ref<HTMLElement | null>,
  switchModeBase: (mode: 'add' | 'edit' | 'reorder' | 'delete') => void,
  nextTick: (fn: () => void) => void,
  scrollIntoViewOnPartEdit: Ref<boolean> = ref(false)
) {
  const deleteConfirmComponent = ref<ComponentData | null>(null);
  const deleteConfirmPath = ref<string>('');
  const continueDeleteAfter = ref(false);

  function handleDeleteClick(path: string, component: ComponentData) {
    if (deleteConfirmPath.value === path) {
      cancelDelete();
      return;
    }

    if (deleteConfirmPath.value && previewArea.value) {
      removeActiveOutlineForPath(previewArea.value, deleteConfirmPath.value);
    }

    selectDeleteTarget(path, component);
  }

  function selectDeleteTarget(path: string, component: ComponentData) {
    deleteConfirmComponent.value = component;
    deleteConfirmPath.value = path;

    nextTick(() => {
      if (previewArea.value && deleteConfirmPath.value === path) {
        setActiveOutlineForPath(previewArea.value, path, 'delete');
        if (unref(scrollIntoViewOnPartEdit)) {
          const firstElement = findScrollTargetByZcodePath(previewArea.value, path);
          if (firstElement) {
            scrollToElement(firstElement);
          }
        }
      }
    });
  }

  function clearDeleteSelection(options: { restoreScroll?: boolean } = {}) {
    const { restoreScroll = false } = options;
    const path = deleteConfirmPath.value;

    if (path && previewArea.value) {
      removeActiveOutlineForPath(previewArea.value, path);
      if (restoreScroll && unref(scrollIntoViewOnPartEdit)) {
        const firstElement = findScrollTargetByZcodePath(previewArea.value, path);
        if (firstElement) {
          scrollToElement(firstElement);
        }
      }
    }

    deleteConfirmComponent.value = null;
    deleteConfirmPath.value = '';
  }

  function confirmDelete() {
    if (!deleteConfirmPath.value) {
      return;
    }

    const path = deleteConfirmPath.value;
    const continueAfter = continueDeleteAfter.value;
    const nextPath = continueAfter ? resolveNextSelectionPathAfterDelete(path, cmsData) : null;
    const pathParts = path.split('.');

    let parentPath: string | null = null;
    let slotName: string | null = null;

    if (pathParts.length === 2 && pathParts[0] === 'page') {
      const index = parseInt(pathParts[1], 10);
      if (!Number.isNaN(index) && index >= 0 && index < cmsData.page.length) {
        cmsData.page.splice(index, 1);
      }
    } else if (pathParts.length > 2 && pathParts[0] === 'page') {
      const topIndex = parseInt(pathParts[1], 10);
      if (Number.isNaN(topIndex) || topIndex < 0 || topIndex >= cmsData.page.length) {
        logger.error('Invalid top-level index:', topIndex);
        clearDeleteSelection();
        return;
      }

      let current: unknown = cmsData.page[topIndex];
      const fieldPath = pathParts.slice(2);

      if (fieldPath.length >= 3 && fieldPath[0] === 'slots') {
        slotName = fieldPath[1];
        parentPath = `page.${topIndex}`;
      }

      for (let i = 0; i < fieldPath.length - 1; i++) {
        if (!current || typeof current !== 'object') {
          logger.error('Invalid path:', path);
          clearDeleteSelection();
          return;
        }
        current = (current as Record<string, unknown>)[fieldPath[i]];
      }

      const lastField = fieldPath[fieldPath.length - 1];
      if (current && typeof current === 'object') {
        if (Array.isArray(current)) {
          const index = parseInt(lastField, 10);
          if (!Number.isNaN(index) && index >= 0 && index < current.length) {
            current.splice(index, 1);
          } else {
            logger.error('Invalid array index:', lastField);
          }
        } else if (lastField in current) {
          delete (current as Record<string, unknown>)[lastField];
        } else {
          logger.error('Field not found:', path);
        }
      } else {
        logger.error('Invalid current object:', path);
      }
    }

    clearDeleteSelection();

    const advanceToNextTarget = () => {
      if (!continueAfter) {
        return;
      }

      let targetPath = nextPath;
      if (!targetPath && parentPath && slotName) {
        targetPath = resolveSlotFirstChildPath(parentPath, slotName, cmsData);
      }
      if (!targetPath) {
        return;
      }

      const component = getComponentByPath(targetPath, cmsData);
      if (component) {
        selectDeleteTarget(targetPath, component);
      }
    };

    if (cmsData.page.length === 0) {
      nextTick(() => {
        switchModeBase('add');
      });
      return;
    }

    if (parentPath && slotName) {
      nextTick(() => {
        ensureInitialSlotComponent(parentPath!, slotName!);
        nextTick(advanceToNextTarget);
      });
      return;
    }

    nextTick(advanceToNextTarget);
  }

  function ensureInitialSlotComponent(parentPath: string, slotName: string) {
    const parentComponent = getComponentByPath(parentPath, cmsData);
    if (!parentComponent) {
      return;
    }

    const slots = parentComponent.slots;
    if (!slots || !Array.isArray(slots[slotName])) {
      return;
    }

    const slotArray = slots[slotName] as ComponentData[];

    if (slotArray.length === 0) {
      const parent = findTypeAndPartByPartId(parentComponent.part_id, cmsData.parts);
      if (!parent) {
        return;
      }

      const slotConfig = parent.part.slots?.[slotName];

      if (slotConfig) {
        const allowedPartIds = slotConfig.allowedParts;
        if (allowedPartIds && allowedPartIds.length === 1) {
          const allowedPartId = allowedPartIds[0];
          const child = findTypeAndPartByPartId(allowedPartId, cmsData.parts);

          if (child) {
            const childComponent = createInitialComponentFromPart(child.type, child.part.id);
            slotArray.push(childComponent);
          }
        }
      }
    }
  }

  function createInitialComponentFromPart(type: TypeData, partId?: string): ComponentData {
    const part = partId ? type.parts.find((p) => p.id === partId) || type.parts[0] : type.parts[0];
    if (!part) {
      throw new Error(`Part not found for type: ${type.type}`);
    }

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
          const child = findTypeAndPartByPartId(allowedPartId, cmsData.parts);

          if (child) {
            const childType = child.type;
            const childPart = child.part;
            const childComponent = createInitialComponentFromPart(childType, childPart.id);
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

  function cancelDelete() {
    clearDeleteSelection({ restoreScroll: true });
  }

  return {
    deleteConfirmComponent,
    deleteConfirmPath,
    continueDeleteAfter,
    handleDeleteClick,
    confirmDelete,
    cancelDelete
  };
}
