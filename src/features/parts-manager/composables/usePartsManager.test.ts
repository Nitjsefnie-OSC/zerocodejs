import { describe, expect, it, vi } from 'vitest';
import { nextTick, reactive } from 'vue';
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

describe('usePartsManager: fileManagedCategories 未指定（デフォルト挙動）', () => {
  it('activeCategory は common で、どのカテゴリも編集できる', () => {
    const { activeCategory, currentTypes, isActiveCategoryFileManaged } =
      usePartsManager(makeCmsData());
    expect(activeCategory.value).toBe('common');
    expect(currentTypes.value).toHaveLength(1);
    expect(isActiveCategoryFileManaged.value).toBe(false);
  });

  it('startCreating でタイプの新規作成を開始できる', () => {
    const { startCreating, editingType, editingLevel } = usePartsManager(makeCmsData());
    startCreating();
    expect(editingType.value).not.toBeNull();
    expect(editingLevel.value).toBe('type');
  });
});

describe('usePartsManager: fileManagedCategories 指定時', () => {
  const options = { fileManagedCategories: ['common' as const] };

  it('ファイルで管理するカテゴリも一覧に出し、パーツを開いて内容とプレビューを見られる', () => {
    const data = makeCmsData();
    const {
      currentTypes,
      isActiveCategoryFileManaged,
      startEditingPart,
      editingPart,
      getPartPreviewHtml
    } = usePartsManager(data, options);
    expect(isActiveCategoryFileManaged.value).toBe(true);
    expect(currentTypes.value).toHaveLength(1);
    startEditingPart(data.parts.common[0], 0);
    expect(editingPart.value?.part.id).toBe('common-1.default');
    expect(getPartPreviewHtml(data.parts.common[0], data.parts.common[0].parts[0])).toContain('hi');
  });

  it('タイプの作成・編集はできない', () => {
    const data = makeCmsData();
    const { startCreating, startEditingType, editingType } = usePartsManager(data, options);
    startCreating();
    expect(editingType.value).toBeNull();
    startEditingType(data.parts.common[0]);
    expect(editingType.value).toBeNull();
  });

  it('パーツを開いて本文を変えても、保存しても cmsData は変わらない', async () => {
    const data = makeCmsData();
    const { startEditingPart, editingPart, savePart } = usePartsManager(data, options);
    startEditingPart(data.parts.common[0], 0);
    editingPart.value!.part.body = '<div>changed</div>';
    await savePart();
    expect(data.parts.common[0].parts[0].body).toBe('<div>hi</div>');
  });

  it('パーツの追加・削除・並べ替えとタイプの削除はできない', async () => {
    vi.stubGlobal('confirm', () => true);
    const data = makeCmsData();
    const { addPartToType, deletePart, deletePartType, handleReorderClick, reorderSourcePart } =
      usePartsManager(data, options);
    await addPartToType(data.parts.common[0]);
    deletePart({ ...data.parts.common[0], _partIndex: 0 });
    deletePartType('common-type');
    handleReorderClick(data.parts.common[0], 0);
    expect(data.parts.common).toHaveLength(1);
    expect(data.parts.common[0].parts).toHaveLength(1);
    expect(reorderSourcePart.value).toBeNull();
    vi.unstubAllGlobals();
  });

  it('ほかのカテゴリは従来どおり編集できる', () => {
    vi.stubGlobal('confirm', () => true);
    const data = makeCmsData();
    const { activeCategory, deletePartType, isActiveCategoryFileManaged } = usePartsManager(
      data,
      options
    );
    activeCategory.value = 'individual';
    expect(isActiveCategoryFileManaged.value).toBe(false);
    deletePartType('individual-type');
    expect(data.parts.individual).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});

describe('usePartsManager: ファイルで管理するカテゴリの表示中の更新', () => {
  it('開いているパーツは、元のデータが差し替えられると新しい内容になる', async () => {
    const data = reactive(makeCmsData()) as ZeroCodeData;
    const { startEditingPart, editingPart, isPartDirty } = usePartsManager(data, {
      fileManagedCategories: ['common']
    });
    startEditingPart(data.parts.common[0], 0);

    const next = JSON.parse(JSON.stringify(data.parts.common));
    next[0].parts[0].body = '<div>from file</div>';
    data.parts.common = next;
    await nextTick();

    expect(editingPart.value?.part.body).toBe('<div>from file</div>');
    expect(isPartDirty.value).toBe(false);
  });

  it('編集できるカテゴリでは、開いているパーツを差し替えない', async () => {
    const data = reactive(makeCmsData()) as ZeroCodeData;
    const { startEditingPart, editingPart } = usePartsManager(data);
    startEditingPart(data.parts.common[0], 0);
    editingPart.value!.part.body = '<div>editing</div>';

    const next = JSON.parse(JSON.stringify(data.parts.common));
    next[0].parts[0].body = '<div>from file</div>';
    data.parts.common = next;
    await nextTick();

    expect(editingPart.value?.part.body).toBe('<div>editing</div>');
  });
});
