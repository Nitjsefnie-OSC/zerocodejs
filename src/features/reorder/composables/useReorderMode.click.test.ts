import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useReorderMode } from './useReorderMode';
import type { ZeroCodeData } from '../../../types';

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
    setActiveOutlineForPath: vi.fn(),
    removeActiveOutlineForPath: vi.fn(),
    removeHoverOutlineForPath: vi.fn(),
    setHoverOutline: vi.fn()
  };
});

vi.mock('../../../core/utils/dom-utils', () => ({
  scrollToElement: vi.fn()
}));

const nestedCmsData = {
  page: [
    {
      id: 'parent',
      part_id: 'hero',
      slots: {
        main: [
          { id: 'child-a', part_id: 'text' },
          { id: 'child-b', part_id: 'text' }
        ]
      }
    },
    { id: 'sibling', part_id: 'text' }
  ],
  css: {},
  parts: { common: [], individual: [], special: [] },
  images: { common: [], individual: [], special: [] }
} as unknown as ZeroCodeData;

const threeItemCmsData = {
  page: [
    { id: 'a', part_id: 'hero' },
    { id: 'b', part_id: 'text' },
    { id: 'c', part_id: 'text' }
  ],
  css: {},
  parts: { common: [], individual: [], special: [] },
  images: { common: [], individual: [], special: [] }
} as unknown as ZeroCodeData;

describe('useReorderMode handleReorderClick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('移動元選択中に別階層のパーツをクリックすると選択を解除する', () => {
    const previewArea = ref(document.createElement('div'));
    const { reorderSourcePath, structureListGroupId, handleReorderClick } = useReorderMode(
      nestedCmsData,
      previewArea,
      ref(false)
    );

    handleReorderClick('page.0');
    expect(reorderSourcePath.value).toBe('page.0');
    expect(structureListGroupId.value).toBe('page');

    handleReorderClick('page.0.slots.main.0');
    expect(reorderSourcePath.value).toBe('');
    expect(structureListGroupId.value).toBe('page.0.slots.main');
  });

  it('同じパーツを再クリックすると移動元選択とパネルを解除する', () => {
    const previewArea = ref(document.createElement('div'));
    const { reorderSourcePath, structureListGroupId, handleReorderClick } = useReorderMode(
      nestedCmsData,
      previewArea,
      ref(false)
    );

    handleReorderClick('page.0');
    expect(reorderSourcePath.value).toBe('page.0');
    expect(structureListGroupId.value).toBe('page');

    handleReorderClick('page.0');
    expect(reorderSourcePath.value).toBe('');
    expect(structureListGroupId.value).toBeNull();
  });

  it('同階層の別パーツクリックでは insert 移動で並べ替えできる', () => {
    const previewArea = ref(document.createElement('div'));
    const data = structuredClone(threeItemCmsData);
    const { reorderSourcePath, handleReorderClick } = useReorderMode(data, previewArea, ref(false));

    handleReorderClick('page.0');
    handleReorderClick('page.2');

    expect(reorderSourcePath.value).toBe('');
    expect(data.page.map((component) => component.id)).toEqual(['b', 'c', 'a']);
  });
});
