import { describe, expect, it } from 'vitest';
import { resolveSaveTargets } from './save-targets';

describe('resolveSaveTargets', () => {
  it('ページ管理ではページと専用画像', () => {
    expect(resolveSaveTargets({ tab: 'edit', fallbackCategory: 'common' })).toEqual([
      'page',
      'images-special'
    ]);
  });

  it('パーツ管理では表示中のカテゴリのパーツと CSS', () => {
    expect(
      resolveSaveTargets({ tab: 'parts', partsCategory: 'individual', fallbackCategory: 'common' })
    ).toEqual(['parts-individual', 'parts-individual-css']);
  });

  it('カテゴリが取れなければ fallbackCategory', () => {
    expect(resolveSaveTargets({ tab: 'parts', fallbackCategory: 'special' })).toEqual([
      'parts-special',
      'parts-special-css'
    ]);
    expect(resolveSaveTargets({ tab: 'images', fallbackCategory: 'common' })).toEqual([
      'images-common'
    ]);
  });

  it('データビューアでは表示中のデータに合わせる', () => {
    const base = { tab: 'data', fallbackCategory: 'common' } as const;
    expect(resolveSaveTargets(base)).toEqual(['page', 'images-special']);
    expect(resolveSaveTargets({ ...base, dataViewerTab: 'page' })).toEqual([
      'page',
      'images-special'
    ]);
    expect(
      resolveSaveTargets({ ...base, dataViewerTab: 'parts', dataViewerCategory: 'special' })
    ).toEqual(['parts-special', 'parts-special-css']);
    expect(
      resolveSaveTargets({ ...base, dataViewerTab: 'images', dataViewerCategory: 'individual' })
    ).toEqual(['images-individual']);
  });
});
