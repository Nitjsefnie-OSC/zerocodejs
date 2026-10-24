import { describe, expect, it } from 'vitest';
import { findScrollTargetByZcodePath } from './useOutlineManager';

describe('findScrollTargetByZcodePath', () => {
  it('同じパスの追加ボタンが先にあってもパーツ本体を返す', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <button class="zcode-add-slot-btn" data-zcode-path="page.1.slots.contents.0"></button>
      <div data-zcode-id="message-1" data-zcode-path="page.1.slots.contents.0"></div>
      <button class="zcode-add-slot-btn" data-zcode-path="page.1.slots.contents.0"></button>
    `;

    expect(findScrollTargetByZcodePath(root, 'page.1.slots.contents.0')?.dataset.zcodeId).toBe(
      'message-1'
    );
  });

  it('パーツ本体がない（挿入位置のみ）ときは追加ボタンを返す', () => {
    const root = document.createElement('div');
    root.innerHTML = `<button class="zcode-add-between-btn" data-zcode-path="page.3"></button>`;

    expect(findScrollTargetByZcodePath(root, 'page.3')?.tagName).toBe('BUTTON');
  });

  it('該当する要素がなければ null', () => {
    expect(findScrollTargetByZcodePath(document.createElement('div'), 'page.0')).toBeNull();
  });
});
