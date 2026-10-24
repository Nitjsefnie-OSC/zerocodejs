import { describe, expect, it, vi } from 'vitest';
import { usePartsManager } from './usePartsManager';
import type { ZeroCodeData, TypeData } from '../../../types';

vi.mock('../../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}));

function makeType(id: string, typeName: string): TypeData {
  return {
    id,
    type: typeName,
    description: '',
    parts: [{ id: `${id}.default`, title: 'part_1', description: '', body: '<div>hi</div>' }]
  };
}

function makeCmsData(): ZeroCodeData {
  return {
    page: [],
    css: { common: '', individual: '', special: '' },
    parts: {
      common: [makeType('common-1', 'common-type')],
      individual: [makeType('individual-1', 'individual-type')],
      special: [makeType('special-1', 'special-type')]
    },
    images: { common: [], individual: [], special: [] }
  } as unknown as ZeroCodeData;
}

describe('usePartsManager: hiddenCategories 未指定（デフォルト挙動）', () => {
  it('全カテゴリが visibleCategories に含まれ、activeCategory は common', () => {
    const { visibleCategories, activeCategory, currentTypes } = usePartsManager(makeCmsData());
    expect(visibleCategories).toEqual(['common', 'individual', 'special']);
    expect(activeCategory.value).toBe('common');
    expect(currentTypes.value).toHaveLength(1);
  });

  it('startCreating でタイプの新規作成を開始できる', () => {
    const { startCreating, editingType, editingLevel } = usePartsManager(makeCmsData());
    startCreating();
    expect(editingType.value).not.toBeNull();
    expect(editingLevel.value).toBe('type');
  });
});

describe('usePartsManager: hiddenCategories 指定時', () => {
  it('非表示カテゴリは visibleCategories から除外される', () => {
    const { visibleCategories } = usePartsManager(makeCmsData(), {
      hiddenCategories: ['common']
    });
    expect(visibleCategories).toEqual(['individual', 'special']);
  });

  it('activeCategory の初期値は非表示でない最初のカテゴリになる', () => {
    const { activeCategory } = usePartsManager(makeCmsData(), {
      hiddenCategories: ['common']
    });
    expect(activeCategory.value).toBe('individual');
  });

  it('非表示カテゴリの currentTypes は空配列になる', () => {
    const { activeCategory, currentTypes } = usePartsManager(makeCmsData(), {
      hiddenCategories: ['common']
    });
    activeCategory.value = 'common';
    expect(currentTypes.value).toEqual([]);
  });

  it('非表示カテゴリでは startCreating が何もしない', () => {
    const { activeCategory, startCreating, editingType } = usePartsManager(makeCmsData(), {
      hiddenCategories: ['common']
    });
    activeCategory.value = 'common';
    startCreating();
    expect(editingType.value).toBeNull();
  });

  it('非表示カテゴリでは startEditingType が何もしない', () => {
    const data = makeCmsData();
    const { activeCategory, startEditingType, editingType } = usePartsManager(data, {
      hiddenCategories: ['common']
    });
    activeCategory.value = 'common';
    startEditingType(data.parts.common[0]);
    expect(editingType.value).toBeNull();
  });

  it('非表示カテゴリでは saveType が cmsData を変更しない', async () => {
    const data = makeCmsData();
    const { activeCategory, startCreating, editingType, saveType } = usePartsManager(data, {
      hiddenCategories: ['individual']
    });
    // individual が非表示でも common（可視）側で新規作成した状態を作り、
    // activeCategory を非表示側へ切り替えてから保存を試みる
    startCreating();
    expect(editingType.value).not.toBeNull();
    activeCategory.value = 'individual';
    const beforeCount = data.parts.individual.length;
    await saveType();
    expect(data.parts.individual).toHaveLength(beforeCount);
  });

  it('非表示カテゴリでは deletePartType が何も削除しない', () => {
    const data = makeCmsData();
    const { activeCategory, deletePartType } = usePartsManager(data, {
      hiddenCategories: ['common']
    });
    activeCategory.value = 'common';
    const beforeCount = data.parts.common.length;
    deletePartType('common-type');
    expect(data.parts.common).toHaveLength(beforeCount);
  });

  it('可視カテゴリでは従来通り操作できる', () => {
    vi.stubGlobal('confirm', () => true);
    const data = makeCmsData();
    const { activeCategory, deletePartType } = usePartsManager(data, {
      hiddenCategories: ['common']
    });
    expect(activeCategory.value).toBe('individual');
    deletePartType('individual-type');
    expect(data.parts.individual).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it('全カテゴリ非表示のとき visibleCategories は空配列', () => {
    const { visibleCategories, activeCategory } = usePartsManager(makeCmsData(), {
      hiddenCategories: ['common', 'individual', 'special']
    });
    expect(visibleCategories).toEqual([]);
    // フォールバックとして 'common' のままだが currentTypes は空になる
    expect(activeCategory.value).toBe('common');
  });
});
