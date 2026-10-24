import { ref, unref, type Ref, nextTick } from 'vue';
import { useI18n } from '../../../i18n';
import type { ZeroCodeData } from '../../../types';
import {
  getComponentByPath,
  getParentPath,
  traverseComponents
} from '../../../core/utils/path-utils';
import {
  setActiveOutlineForPath,
  removeActiveOutlineForPath,
  removeHoverOutlineForPath,
  findComponentElementsByZcodePath
} from '../../editor/composables/useOutlineManager';
import { scrollToElement } from '../../../core/utils/dom-utils';
import { resolveReorderTargetPath } from '../utils/reorder-target-path';
import {
  canReorderSiblingPaths,
  findComponentPathById,
  moveStructureGroupByIndex,
  reorderSiblingsByPath,
  resolveStructureSortableGroupFromPath
} from '../utils/page-reorder';

export function useReorderMode(
  cmsData: ZeroCodeData,
  previewArea: Ref<HTMLElement | null>,
  scrollIntoViewOnPartEdit: Ref<boolean> = ref(false)
) {
  const { t } = useI18n();
  // 状態管理
  const reorderSourcePath = ref<string>('');
  const reorderSourceComponentId = ref<string | null>(null);
  const structureListHoveredPath = ref<string | null>(null);
  const structureListGroupId = ref<string | null>(null);
  let initialScrollTop: number | null = null;

  function setStructureListHoveredPath(path: string | null) {
    structureListHoveredPath.value = path;
  }

  function clearStructureListHoveredPath() {
    structureListHoveredPath.value = null;
  }

  function setStructureListGroupFromPath(path: string) {
    const group = resolveStructureSortableGroupFromPath(path);
    if (!group) {
      return;
    }
    structureListGroupId.value = group.groupId;
  }

  function leaveReorderStructureList() {
    structureListGroupId.value = null;
    clearStructureListHoveredPath();
  }

  function closeReorderPanel() {
    cancelReorder({ restoreScroll: false });
    structureListGroupId.value = null;
  }

  function findPreviewComponentElement(path: string): HTMLElement | undefined {
    if (!previewArea.value || !path) {
      return undefined;
    }
    return findComponentElementsByZcodePath(previewArea.value, path)[0];
  }

  function scrollPreviewFromStructureList(path: string) {
    const element = findPreviewComponentElement(path);
    if (element) {
      scrollToElement(element);
    }
  }

  function selectReorderSource(path: string, options: { recordInitialScroll?: boolean } = {}) {
    if (options.recordInitialScroll && typeof window !== 'undefined') {
      initialScrollTop = window.scrollY;
    }
    const parentPath = getParentPath(path);
    if (parentPath && previewArea.value) {
      removeHoverOutlineForPath(previewArea.value, parentPath);
    }

    reorderSourcePath.value = path;
    const component = getComponentByPath(path, cmsData);
    reorderSourceComponentId.value = component?.id ?? null;

    if (previewArea.value) {
      setActiveOutlineForPath(previewArea.value, path, 'reorder');
    }
  }

  function applyReorderHandoff(path: string) {
    if (!path) {
      return;
    }
    setStructureListGroupFromPath(path);
    selectReorderSource(path);
  }

  function handleStructureListLocate(path: string) {
    if (!path) {
      return;
    }
    scrollPreviewFromStructureList(path);
  }

  function finishReorderMove(sourceId: string | null) {
    let targetScrollPath: string | null = null;
    if (sourceId) {
      const found = traverseComponents<string | undefined>(
        cmsData.page,
        'page',
        (component, componentPath) => {
          if (component.id === sourceId) {
            return componentPath;
          }
          return undefined;
        }
      );
      if (typeof found === 'string') {
        targetScrollPath = found;
      }
    }
    cancelReorder({ restoreScroll: false });
    if (targetScrollPath) {
      nextTick(() => {
        const element = findPreviewComponentElement(targetScrollPath);
        if (element && unref(scrollIntoViewOnPartEdit)) {
          scrollToElement(element);
        }
      });
    }
  }

  function handleReorderPathClick(
    path: string,
    options: { clearStructureListOnSamePathCancel?: boolean } = {}
  ) {
    if (!path) {
      return;
    }

    const { clearStructureListOnSamePathCancel = false } = options;

    if (reorderSourcePath.value === path) {
      cancelReorder();
      if (clearStructureListOnSamePathCancel) {
        structureListGroupId.value = null;
      }
      return;
    }

    setStructureListGroupFromPath(path);

    if (reorderSourcePath.value) {
      const sourceGroup = resolveStructureSortableGroupFromPath(reorderSourcePath.value);
      const clickedGroup = resolveStructureSortableGroupFromPath(path);
      if (!sourceGroup || !clickedGroup || sourceGroup.groupId !== clickedGroup.groupId) {
        cancelReorder({ restoreScroll: false });
        return;
      }

      const targetPath = resolveReorderTargetPath(reorderSourcePath.value, path);
      if (!canReorderWith(reorderSourcePath.value, targetPath)) {
        return;
      }

      const sourceId = reorderSourceComponentId.value;
      const success = reorderComponents(reorderSourcePath.value, targetPath);
      if (!success) {
        alert(t('reorderPanel.reorderFailed'));
        return;
      }
      finishReorderMove(sourceId);
      return;
    }

    selectReorderSource(path, { recordInitialScroll: true });

    if (unref(scrollIntoViewOnPartEdit)) {
      const element = findPreviewComponentElement(path);
      if (element) {
        scrollToElement(element);
      }
    }
  }

  function handleStructureListReorderClick(path: string) {
    handleReorderPathClick(path);
  }

  function scrollPreviewToPath(path: string) {
    if (!previewArea.value || !unref(scrollIntoViewOnPartEdit)) {
      return;
    }
    const element = findPreviewComponentElement(path);
    if (element) {
      scrollToElement(element);
    }
  }

  function reorderStructureByDragIndices(
    groupId: string,
    fromIndex: number,
    toIndex: number
  ): boolean {
    const result = moveStructureGroupByIndex(cmsData, groupId, fromIndex, toIndex);
    if (!result) {
      return false;
    }

    cancelReorder({ restoreScroll: false });
    clearStructureListHoveredPath();

    const movedPath = findComponentPathById(cmsData, result.movedComponentId);
    if (movedPath) {
      nextTick(() => {
        scrollPreviewToPath(movedPath);
      });
    }

    return true;
  }

  function canReorderWith(sourcePath: string, targetPath: string): boolean {
    return canReorderSiblingPaths(sourcePath, targetPath);
  }

  function reorderComponents(fromPath: string, toPath: string): boolean {
    return reorderSiblingsByPath(cmsData, fromPath, toPath) !== null;
  }

  // 並べ替えモード: クリック処理
  function handleReorderClick(path: string) {
    handleReorderPathClick(path, { clearStructureListOnSamePathCancel: true });
  }

  // 並べ替えをキャンセル
  function cancelReorder(options: { restoreScroll?: boolean } = {}) {
    const { restoreScroll = true } = options;
    clearStructureListHoveredPath();
    if (reorderSourcePath.value && previewArea.value) {
      removeActiveOutlineForPath(previewArea.value, reorderSourcePath.value);
    }
    if (restoreScroll && typeof window !== 'undefined' && initialScrollTop !== null) {
      const target = Math.max(0, initialScrollTop);
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: target, behavior: 'smooth' });
      });
    }
    reorderSourcePath.value = '';
    reorderSourceComponentId.value = null;
    initialScrollTop = null;
  }

  return {
    reorderSourcePath,
    structureListHoveredPath,
    structureListGroupId,
    handleReorderClick,
    canReorderWith,
    cancelReorder,
    reorderStructureByDragIndices,
    setStructureListHoveredPath,
    applyReorderHandoff,
    leaveReorderStructureList,
    closeReorderPanel,
    handleStructureListLocate,
    handleStructureListReorderClick
  };
}
