import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useReorderMode } from './useReorderMode';
import type { ZeroCodeData } from '../../../types';

const { setActiveOutlineForPath, removeActiveOutlineForPath } = vi.hoisted(() => ({
  setActiveOutlineForPath: vi.fn(),
  removeActiveOutlineForPath: vi.fn()
}));

vi.mock('../../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}));

vi.mock('../../editor/composables/useOutlineManager', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../editor/composables/useOutlineManager')>();
  return {
    ...actual,
    setActiveOutlineForPath,
    removeActiveOutlineForPath,
    removeHoverOutlineForPath: vi.fn(),
    setHoverOutline: vi.fn()
  };
});

vi.mock('../../../core/utils/dom-utils', () => ({
  scrollToElement: vi.fn()
}));

const cmsData = {
  page: [
    { id: 'a', part_id: 'hero' },
    { id: 'b', part_id: 'text' }
  ],
  css: {},
  parts: { common: [], individual: [], special: [] },
  images: { common: [], individual: [], special: [] }
} as unknown as ZeroCodeData;

describe('useReorderMode structure locate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleStructureListLocate は該当パーツへスクロールするだけ', async () => {
    const { scrollToElement } = await import('../../../core/utils/dom-utils');
    const previewArea = ref(document.createElement('div'));
    previewArea.value.innerHTML = `
      <div class="zcode-add-between">
        <button type="button" class="zcode-add-between-btn" data-zcode-add-before data-zcode-path="page.0"></button>
      </div>
      <section data-zcode-id="a" data-zcode-path="page.0" data-zcode-part="hero"></section>
    `;
    const component = previewArea.value.querySelector('[data-zcode-id="a"]') as HTMLElement;
    const { reorderSourcePath, handleStructureListLocate } = useReorderMode(
      cmsData,
      previewArea,
      ref(false)
    );

    handleStructureListLocate('page.0');
    expect(reorderSourcePath.value).toBe('');
    expect(setActiveOutlineForPath).not.toHaveBeenCalled();
    expect(scrollToElement).toHaveBeenCalledWith(component);
  });

  it('handleStructureListLocate は移動元選択中もスクロールのみ', async () => {
    const { scrollToElement } = await import('../../../core/utils/dom-utils');
    const previewArea = ref(document.createElement('div'));
    previewArea.value.innerHTML = `
      <section data-zcode-id="a" data-zcode-path="page.0" data-zcode-part="hero"></section>
      <section data-zcode-id="b" data-zcode-path="page.1" data-zcode-part="text"></section>
    `;
    const { reorderSourcePath, handleStructureListReorderClick, handleStructureListLocate } =
      useReorderMode(cmsData, previewArea, ref(false));

    handleStructureListReorderClick('page.0');
    vi.clearAllMocks();

    handleStructureListLocate('page.1');
    expect(reorderSourcePath.value).toBe('page.0');
    expect(scrollToElement).toHaveBeenCalled();
    expect(setActiveOutlineForPath).not.toHaveBeenCalled();
  });

  it('handleStructureListReorderClick は同じ行で移動元選択を解除する', () => {
    const previewArea = ref(document.createElement('div'));
    const { reorderSourcePath, structureListGroupId, handleStructureListReorderClick } =
      useReorderMode(cmsData, previewArea, ref(false));

    handleStructureListReorderClick('page.0');
    expect(reorderSourcePath.value).toBe('page.0');
    expect(structureListGroupId.value).toBe('page');

    handleStructureListReorderClick('page.0');
    expect(reorderSourcePath.value).toBe('');
    expect(structureListGroupId.value).toBe('page');
    expect(removeActiveOutlineForPath).toHaveBeenCalled();
  });

  it('handleStructureListReorderClick で同階層の insert 並べ替えができる', () => {
    const previewArea = ref(document.createElement('div'));
    const data = structuredClone(cmsData) as ZeroCodeData;
    data.page.push({ id: 'c', part_id: 'text' });
    const { reorderSourcePath, handleStructureListReorderClick } = useReorderMode(
      data,
      previewArea,
      ref(false)
    );

    handleStructureListReorderClick('page.0');
    handleStructureListReorderClick('page.2');

    expect(reorderSourcePath.value).toBe('');
    expect(data.page.map((component) => component.id)).toEqual(['b', 'c', 'a']);
  });

  it('applyReorderHandoff はグループ表示と移動元選択を設定する', () => {
    const previewArea = ref(document.createElement('div'));
    const { reorderSourcePath, structureListGroupId, applyReorderHandoff } = useReorderMode(
      cmsData,
      previewArea,
      ref(false)
    );

    applyReorderHandoff('page.0');
    expect(reorderSourcePath.value).toBe('page.0');
    expect(structureListGroupId.value).toBe('page');
    expect(setActiveOutlineForPath).toHaveBeenCalledWith(previewArea.value, 'page.0', 'reorder');
  });

  it('reorderStructureByDragIndices 成功後はページ選択状態を解除する', async () => {
    const previewArea = ref(document.createElement('div'));
    const { reorderSourcePath, handleStructureListReorderClick, reorderStructureByDragIndices } =
      useReorderMode(cmsData, previewArea, ref(false));

    handleStructureListReorderClick('page.0');
    expect(reorderSourcePath.value).toBe('page.0');

    const success = reorderStructureByDragIndices('page', 0, 1);
    expect(success).toBe(true);
    expect(reorderSourcePath.value).toBe('');
    expect(removeActiveOutlineForPath).toHaveBeenCalled();
  });
});
