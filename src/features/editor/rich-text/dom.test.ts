// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ZWSP,
  cleanupPlaceholders,
  clearMarks,
  currentBlockTag,
  ensureBlocks,
  getLinkAt,
  insertHorizontalRule,
  isMarkActive,
  removeLink,
  setBlockType,
  setLink,
  toggleList,
  toggleMark
} from './dom';

let root: HTMLElement;

function editor(html: string): HTMLElement {
  root = document.createElement('div');
  root.innerHTML = html;
  document.body.replaceChildren(root);
  return root;
}

function findText(needle: string): [Text, number] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const index = n.data.indexOf(needle);
    if (index >= 0) return [n, index];
  }
  throw new Error(`text not found: ${needle}`);
}

/** from の先頭から to の末尾までを選択する（to 省略時は from のみ） */
function select(from: string, to = from): Range {
  const [startNode, startIndex] = findText(from);
  const [endNode, endIndex] = findText(to);
  const range = document.createRange();
  range.setStart(startNode, startIndex);
  range.setEnd(endNode, endIndex + to.length);
  return range;
}

function caret(needle: string, after = 0): Range {
  const [node, index] = findText(needle);
  const range = document.createRange();
  range.setStart(node, index + after);
  range.collapse(true);
  return range;
}

const html = () => root.innerHTML;

beforeEach(() => editor('<p><br></p>'));

describe('toggleMark', () => {
  it('選択した文字だけを装飾する', () => {
    editor('<p>hello world</p>');
    toggleMark(root, select('world'), 'strong');
    expect(html()).toBe('<p>hello <strong>world</strong></p>');
  });

  it('見出しの中でも計算済みスタイルに関係なくタグで装飾する', () => {
    editor('<h2>見出し</h2>');
    toggleMark(root, select('見出し'), 'strong');
    expect(html()).toBe('<h2><strong>見出し</strong></h2>');
  });

  it('すべて装飾済みなら解除し、部分選択では残りの装飾を保つ', () => {
    editor('<p><strong>abcdef</strong></p>');
    toggleMark(root, select('cd'), 'strong');
    expect(html()).toBe('<p><strong>ab</strong>cd<strong>ef</strong></p>');
  });

  it('一部だけ装飾済みの範囲には装飾を付け、隣り合うマークは結合する', () => {
    editor('<p>ab<strong>cd</strong>ef</p>');
    toggleMark(root, select('ab', 'ef'), 'strong');
    expect(html()).toBe('<p><strong>abcdef</strong></p>');
  });

  it('入れ子の装飾を保ったまま外側の装飾だけ解除する', () => {
    editor('<p><strong>a<em>bc</em>d</strong></p>');
    toggleMark(root, select('bc'), 'strong');
    expect(html()).toBe('<p><strong>a</strong><em>bc</em><strong>d</strong></p>');
  });

  it('複数ブロックにまたがる選択はブロックごとに装飾する', () => {
    editor('<p>one</p><ul><li>two</li></ul>');
    toggleMark(root, select('one', 'two'), 'em');
    expect(html()).toBe('<p><em>one</em></p><ul><li><em>two</em></li></ul>');
  });

  it('上付きと下付きは排他的に切り替わる', () => {
    editor('<p>x<sub>2</sub></p>');
    toggleMark(root, select('2'), 'sup', ['sub']);
    expect(html()).toBe('<p>x<sup>2</sup></p>');
  });

  it('キャレットのみの場合は ZWSP 入りのマークを置き、その後ろにキャレットを返す', () => {
    editor('<p>ab</p>');
    const points = toggleMark(root, caret('ab', 1), 'strong');
    expect(html()).toBe(`<p>a<strong>${ZWSP}</strong>b</p>`);
    expect(points?.startNode.textContent).toBe(ZWSP);
    expect(points?.startOffset).toBe(1);
  });

  it('装飾の中のキャレットで解除するとマークを分割する', () => {
    editor('<p><strong>abcd</strong></p>');
    toggleMark(root, caret('abcd', 2), 'strong');
    expect(html()).toBe(`<p><strong>ab</strong>${ZWSP}<strong>cd</strong></p>`);
  });

  it('戻り値の範囲は装飾した文字全体を指す', () => {
    editor('<p>hello world</p>');
    const points = toggleMark(root, select('llo wo'), 'strong');
    const range = document.createRange();
    range.setStart(points!.startNode, points!.startOffset);
    range.setEnd(points!.endNode, points!.endOffset);
    expect(range.toString()).toBe('llo wo');
  });
});

describe('isMarkActive', () => {
  it('選択範囲の文字がすべて装飾されているときだけ true', () => {
    editor('<p><strong>ab</strong>cd</p>');
    expect(isMarkActive(root, select('ab'), 'strong')).toBe(true);
    expect(isMarkActive(root, select('ab', 'cd'), 'strong')).toBe(false);
    expect(isMarkActive(root, caret('ab', 1), 'strong')).toBe(true);
  });
});

describe('clearMarks / cleanupPlaceholders', () => {
  it('リンク以外の装飾を外す', () => {
    editor('<p><strong><a href="https://e.com/">a<em>b</em></a></strong></p>');
    clearMarks(root, select('a', 'b'));
    expect(html()).toBe('<p><a href="https://e.com/">ab</a></p>');
  });

  it('キャレットのないテキストの ZWSP と空になったマークを取り除く', () => {
    editor(`<p>a<strong>${ZWSP}</strong>b</p>`);
    cleanupPlaceholders(root, null);
    expect(html()).toBe('<p>ab</p>');
  });
});

describe('setBlockType', () => {
  it('段落ごとに見出しへ変換する（1つの見出しに結合しない）', () => {
    editor('<p>one</p><p>two</p>');
    setBlockType(root, select('one', 'two'), 'h2');
    expect(html()).toBe('<h2>one</h2><h2>two</h2>');
  });

  it('すべて同じ種類なら段落に戻す', () => {
    editor('<h3>one</h3><h3>two</h3>');
    setBlockType(root, select('one', 'two'), 'h3');
    expect(html()).toBe('<p>one</p><p>two</p>');
  });

  it('リスト項目を見出しにするとリストを前後に分割する', () => {
    editor('<ul><li>a</li><li>b</li><li>c</li></ul>');
    setBlockType(root, select('b'), 'blockquote');
    expect(html()).toBe('<ul><li>a</li></ul><blockquote>b</blockquote><ul><li>c</li></ul>');
  });

  it('現在のブロックの種類を返す', () => {
    editor('<blockquote>q</blockquote><ol><li>x</li></ol>');
    expect(currentBlockTag(root, caret('q'))).toBe('blockquote');
    expect(currentBlockTag(root, caret('x'))).toBe('ol');
  });
});

describe('toggleList', () => {
  it('選択した段落を1つのリストにまとめる', () => {
    editor('<p>one</p><p>two</p><p>three</p>');
    toggleList(root, select('one', 'two'), 'ul');
    expect(html()).toBe('<ul><li>one</li><li>two</li></ul><p>three</p>');
  });

  it('同じ種類のリストなら段落に戻し、残りの項目でリストを分割する', () => {
    editor('<ol><li>a</li><li>b</li><li>c</li></ol>');
    toggleList(root, select('b'), 'ol');
    expect(html()).toBe('<ol><li>a</li></ol><p>b</p><ol><li>c</li></ol>');
  });

  it('リスト要素を境界とする選択（リスト作成直後の選択）でも切り替えられる', () => {
    editor('<ul><li>a</li><li>b</li></ul>');
    const ul = root.firstChild as HTMLElement;
    const range = document.createRange();
    range.setStart(ul, 0);
    range.setEnd(ul, 2);
    toggleList(root, range, 'ol');
    expect(html()).toBe('<ol><li>a</li><li>b</li></ol>');
  });

  it('別の種類のリストに切り替える', () => {
    editor('<ul><li>a</li><li>b</li></ul>');
    toggleList(root, select('a', 'b'), 'ol');
    expect(html()).toBe('<ol><li>a</li><li>b</li></ol>');
  });

  it('li 内の段落（旧 Tiptap の出力）は改行でつないだ項目にする', () => {
    editor('<ul><li><p>a</p><p>b</p></li></ul>');
    toggleList(root, select('a'), 'ul');
    expect(html()).toBe('<p>a<br>b</p>');
  });

  it('構造を変えても選択していたテキストノードの位置を返す', () => {
    editor('<p>one</p>');
    const points = toggleList(root, select('ne'), 'ul');
    expect(points?.startNode.textContent).toBe('one');
    expect(points?.startOffset).toBe(1);
  });
});

describe('insertHorizontalRule', () => {
  it('ブロックの後ろに水平線と空段落を入れる', () => {
    editor('<p>a</p>');
    const points = insertHorizontalRule(root, caret('a'));
    expect(html()).toBe('<p>a</p><hr><p><br></p>');
    expect(points?.startNode).toBe(root.lastChild);
  });

  it('リスト項目内ではリストの後ろに入れ、既存の段落にキャレットを移す', () => {
    editor('<ul><li>a</li></ul><p>b</p>');
    insertHorizontalRule(root, caret('a'));
    expect(html()).toBe('<ul><li>a</li></ul><hr><p>b</p>');
  });
});

describe('リンク', () => {
  it('選択範囲をリンクにし、新しいタブ指定で rel を付ける', () => {
    editor('<p>see docs here</p>');
    setLink(root, select('docs'), { href: 'https://e.com/', newTab: true });
    expect(html()).toBe(
      '<p>see <a href="https://e.com/" target="_blank" rel="noopener noreferrer">docs</a> here</p>'
    );
  });

  it('リンク内のキャレットでは属性だけを更新する', () => {
    editor('<p><a href="https://old/" target="_blank" rel="noopener noreferrer">x</a></p>');
    setLink(root, caret('x'), { href: 'https://new/', newTab: false });
    expect(html()).toBe('<p><a href="https://new/">x</a></p>');
  });

  it('リンクの状態を読み取る', () => {
    editor('<p><a href="https://e.com/" target="_blank">x</a></p>');
    expect(getLinkAt(root, caret('x'))).toEqual({ href: 'https://e.com/', newTab: true });
  });

  it('選択範囲にかかるリンクを丸ごと解除する', () => {
    editor('<p><a href="https://e.com/">abc</a></p>');
    removeLink(root, select('b'));
    expect(html()).toBe('<p>abc</p>');
  });
});

describe('ensureBlocks', () => {
  it('ルート直下のテキストを段落で包み、空のブロックに br を入れる', () => {
    editor('text<b>x</b><p></p>');
    ensureBlocks(root);
    expect(html()).toBe('<p>text<b>x</b></p><p><br></p>');
  });

  it('ZWSP だけの段落は空にしない', () => {
    editor(`<p><strong>${ZWSP}</strong></p>`);
    ensureBlocks(root);
    expect(html()).toBe(`<p><strong>${ZWSP}</strong></p>`);
  });

  it('中身がなければ空段落を作る', () => {
    editor('');
    ensureBlocks(root);
    expect(html()).toBe('<p><br></p>');
  });
});
