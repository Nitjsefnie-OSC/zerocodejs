import type { ImageCategory as Category } from '../../types';

export type DevTab = 'edit' | 'parts' | 'images' | 'data';
export type DataViewerTab = 'page' | 'parts' | 'images';

/** ページを保存するときの対象（ページ本体と、編集中に追加・変更できる専用画像） */
export const PAGE_SAVE_TARGETS = ['page', 'images-special'];

export interface SaveTargetContext {
  tab: DevTab;
  partsCategory?: Category;
  imagesCategory?: Category;
  dataViewerTab?: DataViewerTab;
  dataViewerCategory?: Category;
  /** 表示中のカテゴリが取れなかったときのカテゴリ（Editor は common、Studio は special） */
  fallbackCategory: Category;
}

const partsTargets = (category: Category) => [`parts-${category}`, `parts-${category}-css`];
const imagesTargets = (category: Category) => [`images-${category}`];

/** Editor / Studio で表示中のタブとカテゴリから save-request の targets を決める */
export function resolveSaveTargets(context: SaveTargetContext): string[] {
  const { fallbackCategory } = context;
  switch (context.tab) {
    case 'edit':
      return PAGE_SAVE_TARGETS;
    case 'parts':
      return partsTargets(context.partsCategory ?? fallbackCategory);
    case 'images':
      return imagesTargets(context.imagesCategory ?? fallbackCategory);
    case 'data': {
      const category = context.dataViewerCategory ?? fallbackCategory;
      if (context.dataViewerTab === 'parts') return partsTargets(category);
      if (context.dataViewerTab === 'images') return imagesTargets(category);
      return PAGE_SAVE_TARGETS;
    }
    default:
      return [];
  }
}
