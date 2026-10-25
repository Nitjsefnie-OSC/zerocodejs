import { ref, nextTick, unref, type Ref } from 'vue';
import type { ZeroCodeData, ComponentData } from '../../../types';
import { findPartById, getComponentByPath } from '../../../core/utils/path-utils';
import {
  getAvailableFieldsFromPart,
  type EditPanelField
} from '../../../core/utils/edit-panel-fields';
import {
  setActiveOutlineForPath,
  removeActiveOutlineForPath,
  findScrollTargetByZcodePath
} from './useOutlineManager';
import { scrollToElement } from '../../../core/utils/dom-utils';
import { isEmptyForZEmpty } from '../../../core/utils/template-processor';

export function useEditMode(
  cmsData: ZeroCodeData,
  previewArea: Ref<HTMLElement | null>,
  scrollIntoViewOnPartEdit: Ref<boolean> = ref(false)
) {
  const editingComponent = ref<ComponentData | null>(null);
  const editingComponentIndex = ref<number>(-1);
  const editingComponentPath = ref<string>('');
  const editingAvailableFields = ref<EditPanelField[]>([]);

  function getAvailableFields(component: ComponentData): EditPanelField[] {
    const part = findPartById(component.part_id, cmsData.parts);
    if (!part) return [];
    return getAvailableFieldsFromPart(part, component);
  }

  function handleEditClick(path: string, component: ComponentData) {
    if (editingComponentPath.value === path) {
      closeEditPanel();
      return;
    }

    const pathParts = path.split('.');
    let index = -1;

    if (pathParts[0] === 'page' && pathParts.length >= 2) {
      index = parseInt(pathParts[1]);
    }
    if (editingComponentPath.value && previewArea.value) {
      removeActiveOutlineForPath(previewArea.value, editingComponentPath.value);
    }

    editingComponent.value = component;
    editingComponentIndex.value = index;
    editingComponentPath.value = path;
    editingAvailableFields.value = getAvailableFields(component);

    nextTick(() => {
      if (previewArea.value && editingComponentPath.value === path) {
        setActiveOutlineForPath(previewArea.value, path, 'edit');
        if (unref(scrollIntoViewOnPartEdit)) {
          const firstElement = findScrollTargetByZcodePath(previewArea.value, path);
          if (firstElement) {
            scrollToElement(firstElement);
          }
        }
      }
    });
  }

  function saveFieldEdit(
    field: Pick<EditPanelField, 'type' | 'fieldName' | 'currentValue' | 'optional'>
  ) {
    if (editingComponent.value && editingComponentPath.value) {
      const component = getComponentByPath(editingComponentPath.value, cmsData);
      if (component) {
        const isEmptyOptional =
          field.optional &&
          (field.currentValue === '' ||
            field.currentValue === null ||
            (field.type === 'rich' && isEmptyForZEmpty(field.currentValue)));

        if (isEmptyOptional) {
          component[field.fieldName] = undefined;
        } else {
          component[field.fieldName] = field.currentValue;
        }
      }
    }
  }

  function closeEditPanel() {
    if (editingComponentPath.value && previewArea.value) {
      const path = editingComponentPath.value;
      removeActiveOutlineForPath(previewArea.value, path);
      if (unref(scrollIntoViewOnPartEdit)) {
        const firstElement = findScrollTargetByZcodePath(previewArea.value, path);
        if (firstElement) {
          scrollToElement(firstElement);
        }
      }
    }

    editingComponent.value = null;
    editingComponentPath.value = '';
    editingAvailableFields.value = [];
  }

  return {
    editingComponent,
    editingComponentIndex,
    editingComponentPath,
    editingAvailableFields,
    handleEditClick,
    saveFieldEdit,
    closeEditPanel
  };
}
