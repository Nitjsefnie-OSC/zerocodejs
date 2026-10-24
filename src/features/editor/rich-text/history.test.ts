// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { RichTextHistory } from './history';
import { deserializeSelection, serializeSelection } from './selection';

const entry = (html: string) => ({ html, selection: null });

describe('RichTextHistory', () => {
  it('記録・元に戻す・やり直す', () => {
    const history = new RichTextHistory();
    history.reset(entry('a'));
    history.record(entry('b'));
    history.record(entry('c'));
    expect(history.undo()?.html).toBe('b');
    expect(history.undo()?.html).toBe('a');
    expect(history.undo()).toBeNull();
    expect(history.redo()?.html).toBe('b');
  });

  it('戻した後に記録すると、やり直しの履歴を捨てる', () => {
    const history = new RichTextHistory();
    history.reset(entry('a'));
    history.record(entry('b'));
    history.undo();
    history.record(entry('x'));
    expect(history.canRedo).toBe(false);
    expect(history.undo()?.html).toBe('a');
  });

  it('内容が同じなら新しい履歴を作らない', () => {
    const history = new RichTextHistory();
    history.reset(entry('a'));
    expect(history.record(entry('a'))).toBe(false);
    expect(history.canUndo).toBe(false);
  });

  it('上限を超えた古い履歴を捨てる', () => {
    const history = new RichTextHistory(3);
    history.reset(entry('0'));
    ['1', '2', '3'].forEach((html) => history.record(entry(html)));
    expect(history.undo()?.html).toBe('2');
    expect(history.undo()?.html).toBe('1');
    expect(history.undo()).toBeNull();
  });
});

describe('選択位置のシリアライズ', () => {
  it('内容を作り直しても同じ位置に戻せる', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>ab</p><ul><li>cd</li></ul>';
    const range = document.createRange();
    range.setStart(root.querySelector('p')!.firstChild!, 1);
    range.setEnd(root.querySelector('li')!.firstChild!, 2);
    const serialized = serializeSelection(root, range);

    root.innerHTML = '<p>ab</p><ul><li>cd</li></ul>';
    const points = deserializeSelection(root, serialized)!;
    const restored = document.createRange();
    restored.setStart(points.startNode, points.startOffset);
    restored.setEnd(points.endNode, points.endOffset);
    expect(restored.toString()).toBe('bcd');
  });
});
