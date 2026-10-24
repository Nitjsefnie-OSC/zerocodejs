import type { ListTag, MarkTag, TextBlockTag } from './features';

/**
 * リッチテキストエディタの編集操作。
 *
 * document.execCommand は使わない。execCommand の文字装飾は計算済みスタイルで状態を判定し
 * （見出し内の太字で `font-weight: normal` の span を挿入する等）、WebKit では Shadow DOM 内の
 * リスト操作がホスト要素側を書き換えるため、すべての操作をタグに基づいて自前で行う。
 */

export const ZWSP = '​';

const TEXT_BLOCK_NAMES = new Set(['P', 'H2', 'H3', 'H4', 'BLOCKQUOTE']);
const LIST_NAMES = new Set(['UL', 'OL']);
const MARK_NAMES = new Set(['STRONG', 'EM', 'S', 'U', 'SUP', 'SUB', 'A']);

export interface SelectionPoints {
  startNode: Node;
  startOffset: number;
  endNode: Node;
  endOffset: number;
}

export interface LinkState {
  href: string;
  newTab: boolean;
  /** キャレットのみでリンクを挿入するときの文字（省略時は href） */
  text?: string;
}

export function isTextBlock(node: Node | null): node is HTMLElement {
  return !!node && TEXT_BLOCK_NAMES.has(node.nodeName);
}

export function isList(node: Node | null): node is HTMLElement {
  return !!node && LIST_NAMES.has(node.nodeName);
}

export function isMarkElement(node: Node | null): node is HTMLElement {
  return !!node && MARK_NAMES.has(node.nodeName);
}

function isBlockLevel(node: Node): boolean {
  return isTextBlock(node) || isList(node) || node.nodeName === 'HR' || node.nodeName === 'LI';
}

export function closestWithin(
  node: Node | null,
  root: HTMLElement,
  predicate: (el: HTMLElement) => boolean
): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE && predicate(current as HTMLElement)) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
}

const byName = (name: string) => (el: HTMLElement) => el.nodeName === name.toUpperCase();

function hasVisibleContent(node: Node): boolean {
  if ((node.textContent ?? '').replace(new RegExp(ZWSP, 'g'), '') !== '') return true;
  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return false;
  }
  return !!(node as Element | DocumentFragment).querySelector('br, hr');
}

function nodeLength(node: Node): number {
  return node.nodeType === Node.TEXT_NODE ? (node as Text).length : node.childNodes.length;
}

function pointsOf(range: Range): SelectionPoints {
  return {
    startNode: range.startContainer,
    startOffset: range.startOffset,
    endNode: range.endContainer,
    endOffset: range.endOffset
  };
}

function isUsablePoint(root: HTMLElement, node: Node, offset: number): boolean {
  return (node === root || root.contains(node)) && offset <= nodeLength(node);
}

function restoreOr(
  root: HTMLElement,
  saved: SelectionPoints,
  fallback: () => SelectionPoints | null
): SelectionPoints | null {
  if (
    isUsablePoint(root, saved.startNode, saved.startOffset) &&
    isUsablePoint(root, saved.endNode, saved.endOffset)
  ) {
    return saved;
  }
  return fallback();
}

function spanOf(nodes: Node[]): SelectionPoints | null {
  if (!nodes.length) return null;
  const last = nodes[nodes.length - 1];
  return { startNode: nodes[0], startOffset: 0, endNode: last, endOffset: nodeLength(last) };
}

/** ルート直下の段落外にあるテキスト・インライン要素を段落で包む */
export function ensureBlocks(root: HTMLElement): void {
  const doc = root.ownerDocument;
  let run: Node[] = [];
  const flush = (before: Node | null) => {
    if (run.some(hasVisibleContent)) {
      const p = doc.createElement('p');
      root.insertBefore(p, before);
      p.append(...run);
    } else {
      run.forEach((n) => n.parentNode?.removeChild(n));
    }
    run = [];
  };
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE && isBlockLevel(child)) {
      flush(child);
    } else if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.ELEMENT_NODE) {
      run.push(child);
    } else {
      child.parentNode?.removeChild(child);
    }
  }
  flush(null);
  if (!root.firstChild) {
    const p = doc.createElement('p');
    p.append(doc.createElement('br'));
    root.append(p);
  }
  for (const block of Array.from(root.querySelectorAll('p, h2, h3, h4, blockquote, li'))) {
    // ZWSP（キャレット位置の書式の目印）だけの段落は空にしない
    if (!block.textContent && !block.querySelector('br, hr')) {
      block.replaceChildren(doc.createElement('br'));
    }
  }
}

// ---------------------------------------------------------------------------
// 文字装飾（マーク）
// ---------------------------------------------------------------------------

const isEditableBlock = (el: HTMLElement) =>
  TEXT_BLOCK_NAMES.has(el.nodeName) || el.nodeName === 'LI';

/**
 * キャレットが段落・リスト項目の外（例: (ol, 0)）にあれば、その位置の段落・項目の先頭へ移す。
 * 移せる段落がなければ false
 */
function moveCaretIntoBlock(root: HTMLElement, range: Range): boolean {
  if (closestWithin(range.startContainer, root, isEditableBlock)) return true;
  const node = boundaryNode(range.startContainer, range.startOffset, false);
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const block = isEditableBlock(node as HTMLElement)
    ? node
    : (node as Element).querySelector('p, h2, h3, h4, blockquote, li');
  if (!block) return false;
  range.setStart(block, 0);
  range.collapse(true);
  return true;
}

/** 範囲の境界をテキストノードの切れ目に揃える（文字単位の装飾をテキストノード単位で扱うため） */
function splitRangeBoundaries(range: Range): void {
  let { startContainer: sc, startOffset: so, endContainer: ec, endOffset: eo } = range;
  if (ec.nodeType === Node.TEXT_NODE && eo > 0 && eo < (ec as Text).length) {
    (ec as Text).splitText(eo);
  }
  if (sc.nodeType === Node.TEXT_NODE && so > 0 && so < (sc as Text).length) {
    const tail = (sc as Text).splitText(so);
    if (ec === sc) {
      ec = tail;
      eo -= so;
    }
    sc = tail;
    so = 0;
  }
  range.setStart(sc, so);
  range.setEnd(ec, eo);
}

/** 範囲内で実際に選択されている文字を含むテキストノード（ブロック内のもののみ） */
export function textNodesInRange(root: HTMLElement, range: Range): Text[] {
  const result: Text[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (range.intersectsNode(node) && node.length > 0) {
      const startsAfterEnd = node === range.startContainer && range.startOffset >= node.length;
      const endsBeforeStart = node === range.endContainer && range.endOffset === 0;
      const parent = node.parentNode;
      const betweenBlocks = parent === root || isList(parent);
      if (!startsAfterEnd && !endsBeforeStart && !betweenBlocks) {
        result.push(node);
      }
    }
    node = walker.nextNode() as Text | null;
  }
  return result;
}

/** node を ancestor の外に出す（ancestor は node の前後で分割される） */
function liftOutOf(node: Node, ancestor: HTMLElement): void {
  const doc = ancestor.ownerDocument;
  const before = doc.createRange();
  before.setStart(ancestor, 0);
  before.setEndBefore(node);
  const beforeFragment = before.extractContents();
  if (hasVisibleContent(beforeFragment)) {
    const clone = ancestor.cloneNode(false) as HTMLElement;
    clone.append(beforeFragment);
    ancestor.before(clone);
  }
  const after = doc.createRange();
  after.setStartAfter(node);
  after.setEnd(ancestor, ancestor.childNodes.length);
  const afterFragment = after.extractContents();
  if (hasVisibleContent(afterFragment)) {
    const clone = ancestor.cloneNode(false) as HTMLElement;
    clone.append(afterFragment);
    ancestor.after(clone);
  }
  ancestor.replaceWith(...Array.from(ancestor.childNodes));
}

function removeAncestors(node: Node, root: HTMLElement, match: (el: HTMLElement) => boolean) {
  let ancestor = closestWithin(node, root, match);
  while (ancestor) {
    liftOutOf(node, ancestor);
    ancestor = closestWithin(node, root, match);
  }
}

function sameAttributes(a: Element, b: Element): boolean {
  if (a.attributes.length !== b.attributes.length) return false;
  return Array.from(a.attributes).every((attr) => b.getAttribute(attr.name) === attr.value);
}

/** 隣り合う同種のマークを結合し、空のマークを取り除く */
export function tidyMarks(container: ParentNode): void {
  // 外側のマークを結合すると内側に隣り合うマークができるため、変化がなくなるまで繰り返す
  let changed = true;
  while (changed) {
    changed = false;
    for (const el of Array.from(container.querySelectorAll('strong, em, s, u, sup, sub, a'))) {
      if (!container.contains(el)) continue;
      if (!hasVisibleContent(el)) {
        el.remove();
        changed = true;
        continue;
      }
      let next = el.nextSibling;
      while (next && next.nodeType === Node.TEXT_NODE && !next.textContent) {
        const following = next.nextSibling;
        next.parentNode?.removeChild(next);
        next = following;
      }
      while (
        next &&
        next.nodeType === Node.ELEMENT_NODE &&
        next.nodeName === el.nodeName &&
        sameAttributes(el, next as Element)
      ) {
        el.append(...Array.from(next.childNodes));
        const following = next.nextSibling;
        next.parentNode?.removeChild(next);
        next = following;
        changed = true;
      }
    }
  }
}

export function isMarkActive(root: HTMLElement, range: Range, tag: MarkTag): boolean {
  const match = byName(tag);
  if (range.collapsed) {
    return !!closestWithin(range.startContainer, root, match);
  }
  const nodes = textNodesInRange(root, range);
  return nodes.length > 0 && nodes.every((n) => !!closestWithin(n, root, match));
}

/**
 * 文字装飾を切り替える。選択中の文字がすべて装飾済みなら解除、そうでなければ付与する。
 * キャレットのみの場合は ZWSP を置いて、続けて入力する文字に装飾がかかるようにする。
 */
export function toggleMark(
  root: HTMLElement,
  range: Range,
  tag: MarkTag,
  exclusiveWith: MarkTag[] = []
): SelectionPoints | null {
  const doc = root.ownerDocument;
  const match = byName(tag);

  if (range.collapsed) {
    if (!moveCaretIntoBlock(root, range)) return null;
    const placeholder = doc.createTextNode(ZWSP);
    range.insertNode(placeholder);
    if (closestWithin(placeholder, root, match)) {
      removeAncestors(placeholder, root, match);
    } else {
      for (const other of exclusiveWith) removeAncestors(placeholder, root, byName(other));
      const mark = doc.createElement(tag);
      placeholder.before(mark);
      mark.append(placeholder);
    }
    return { startNode: placeholder, startOffset: 1, endNode: placeholder, endOffset: 1 };
  }

  splitRangeBoundaries(range);
  const nodes = textNodesInRange(root, range);
  if (!nodes.length) return null;

  const active = nodes.every((n) => !!closestWithin(n, root, match));
  for (const node of nodes) {
    if (active) {
      removeAncestors(node, root, match);
      continue;
    }
    for (const other of exclusiveWith) removeAncestors(node, root, byName(other));
    if (!closestWithin(node, root, match)) {
      const mark = doc.createElement(tag);
      node.before(mark);
      mark.append(node);
    }
  }
  tidyMarks(root);
  return spanOf(nodes);
}

/** リンク以外の文字装飾をすべて外す */
export function clearMarks(root: HTMLElement, range: Range): SelectionPoints | null {
  if (range.collapsed) return null;
  splitRangeBoundaries(range);
  const nodes = textNodesInRange(root, range);
  const isFormattingMark = (el: HTMLElement) => isMarkElement(el) && el.nodeName !== 'A';
  for (const node of nodes) removeAncestors(node, root, isFormattingMark);
  tidyMarks(root);
  return spanOf(nodes);
}

/** 書式の入っていない入力中の ZWSP を取り除く（キャレットのあるテキストノードは残す） */
export function cleanupPlaceholders(root: HTMLElement, keep: Node | null): void {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (node !== keep && node.data.includes(ZWSP)) targets.push(node);
    node = walker.nextNode() as Text | null;
  }
  for (const text of targets) {
    text.data = text.data.replace(new RegExp(ZWSP, 'g'), '');
    if (!text.data) {
      const parent = text.parentElement;
      text.remove();
      if (parent && isMarkElement(parent) && !hasVisibleContent(parent)) parent.remove();
    }
  }
}

// ---------------------------------------------------------------------------
// リンク
// ---------------------------------------------------------------------------

function applyLinkAttributes(anchor: HTMLElement, link: LinkState): void {
  anchor.setAttribute('href', link.href);
  if (link.newTab) {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  } else {
    anchor.removeAttribute('target');
    anchor.removeAttribute('rel');
  }
}

export function getLinkAt(root: HTMLElement, range: Range): LinkState | null {
  const anchor =
    closestWithin(range.startContainer, root, byName('a')) ??
    (range.collapsed
      ? null
      : (textNodesInRange(root, range)
          .map((n) => closestWithin(n, root, byName('a')))
          .find(Boolean) ?? null));
  if (!anchor) return null;
  return {
    href: anchor.getAttribute('href') ?? '',
    newTab: anchor.getAttribute('target') === '_blank'
  };
}

export function setLink(root: HTMLElement, range: Range, link: LinkState): SelectionPoints | null {
  const doc = root.ownerDocument;
  const isAnchor = byName('a');

  if (range.collapsed) {
    if (!moveCaretIntoBlock(root, range)) return null;
    const existing = closestWithin(range.startContainer, root, isAnchor);
    if (existing) {
      applyLinkAttributes(existing, link);
      return pointsOf(range);
    }
    const anchor = doc.createElement('a');
    applyLinkAttributes(anchor, link);
    anchor.textContent = link.text || link.href;
    range.insertNode(anchor);
    const text = anchor.firstChild as Text;
    return { startNode: text, startOffset: 0, endNode: text, endOffset: text.length };
  }

  splitRangeBoundaries(range);
  const nodes = textNodesInRange(root, range);
  for (const node of nodes) {
    removeAncestors(node, root, isAnchor);
    const anchor = doc.createElement('a');
    applyLinkAttributes(anchor, link);
    node.before(anchor);
    anchor.append(node);
  }
  tidyMarks(root);
  return spanOf(nodes);
}

/** 選択範囲にかかるリンクを丸ごと解除する */
export function removeLink(root: HTMLElement, range: Range): SelectionPoints | null {
  const saved = pointsOf(range);
  const isAnchor = byName('a');
  const anchors = new Set<HTMLElement>();
  const atCaret = closestWithin(range.startContainer, root, isAnchor);
  if (atCaret) anchors.add(atCaret);
  if (!range.collapsed) {
    for (const node of textNodesInRange(root, range)) {
      const anchor = closestWithin(node, root, isAnchor);
      if (anchor) anchors.add(anchor);
    }
  }
  for (const anchor of anchors) anchor.replaceWith(...Array.from(anchor.childNodes));
  return restoreOr(root, saved, () => null);
}

// ---------------------------------------------------------------------------
// ブロック（段落・見出し・引用・リスト・水平線）
// ---------------------------------------------------------------------------

/** 編集単位: ルート直下のブロック、ただしリストは項目（li）単位 */
function unitOf(root: HTMLElement, node: Node): HTMLElement | null {
  let current: Node | null = node;
  while (current && current.parentNode !== root) {
    if (current.nodeName === 'LI' && current.parentNode && current.parentNode.parentNode === root) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  if (!current) return null;
  return current.nodeType === Node.ELEMENT_NODE ? (current as HTMLElement) : null;
}

/** 要素を境界とする位置（例: リスト全体の選択 (ul, 0)〜(ul, 2)）は、その位置の子ノードに置き換える */
function boundaryNode(container: Node, offset: number, isEnd: boolean): Node {
  if (container.nodeType !== Node.ELEMENT_NODE || !container.childNodes.length) return container;
  const index = isEnd ? Math.max(offset - 1, 0) : offset;
  return container.childNodes[Math.min(index, container.childNodes.length - 1)];
}

function unitsInOrder(root: HTMLElement): HTMLElement[] {
  const units: HTMLElement[] = [];
  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (isList(child)) units.push(...(Array.from(child.children) as HTMLElement[]));
    else units.push(child);
  }
  return units;
}

export function unitsInRange(root: HTMLElement, range: Range): HTMLElement[] {
  const first = unitOf(root, boundaryNode(range.startContainer, range.startOffset, false));
  const last = unitOf(root, boundaryNode(range.endContainer, range.endOffset, true));
  if (!first || !last) return [];
  const all = unitsInOrder(root);
  const from = all.indexOf(first);
  const to = all.indexOf(last);
  if (from < 0 || to < 0) return [];
  return all.slice(Math.min(from, to), Math.max(from, to) + 1);
}

/** 単位の中身をインライン要素の列として取り出す（li 内の段落は改行でつなぐ） */
function takeInlineContent(unit: HTMLElement): Node[] {
  const doc = unit.ownerDocument;
  const result: Node[] = [];
  for (const child of Array.from(unit.childNodes)) {
    if (isTextBlock(child)) {
      if (result.length) result.push(doc.createElement('br'));
      result.push(...Array.from(child.childNodes));
    } else {
      result.push(child);
    }
  }
  while (result.length && result[result.length - 1].nodeName === 'BR') result.pop();
  return result;
}

/** 単位を取り除き、その位置を示す目印を返す（li の場合はリストを前後に分割する） */
function detachUnit(unit: HTMLElement): Comment {
  const marker = unit.ownerDocument.createComment('');
  if (unit.nodeName === 'LI' && unit.parentElement && isList(unit.parentElement)) {
    const list = unit.parentElement;
    const rest: Node[] = [];
    for (let n = unit.nextSibling; n; n = n.nextSibling) rest.push(n);
    if (rest.some((n) => n.nodeName === 'LI')) {
      const tail = list.cloneNode(false) as HTMLElement;
      tail.append(...rest);
      list.after(tail);
    }
    list.after(marker);
    unit.remove();
    if (!list.querySelector('li')) list.remove();
  } else {
    unit.replaceWith(marker);
  }
  return marker;
}

function fillBlock(el: HTMLElement, content: Node[]): HTMLElement {
  el.append(...content);
  if (!hasVisibleContent(el)) el.replaceChildren(el.ownerDocument.createElement('br'));
  return el;
}

export function currentBlockTag(root: HTMLElement, range: Range): string | null {
  const unit = unitOf(root, boundaryNode(range.startContainer, range.startOffset, false));
  if (!unit) return null;
  if (unit.nodeName === 'LI') return unit.parentElement?.nodeName.toLowerCase() ?? null;
  return unit.nodeName.toLowerCase();
}

/** 段落・見出し・引用を切り替える。すべて指定の種類なら段落に戻す */
export function setBlockType(
  root: HTMLElement,
  range: Range,
  tag: TextBlockTag
): SelectionPoints | null {
  const saved = pointsOf(range);
  const units = unitsInRange(root, range).filter((u) => u.nodeName !== 'HR');
  if (!units.length) return null;
  const upper = tag.toUpperCase();
  const target = units.every((u) => u.nodeName === upper) ? 'p' : tag;

  const result: HTMLElement[] = [];
  for (const unit of units) {
    if (unit.nodeName === target.toUpperCase()) {
      result.push(unit);
      continue;
    }
    const block = fillBlock(root.ownerDocument.createElement(target), takeInlineContent(unit));
    detachUnit(unit).replaceWith(block);
    result.push(block);
  }
  return restoreOr(root, saved, () => spanOf(result));
}

/** リストを切り替える。すべて指定の種類のリスト項目なら段落に戻す */
export function toggleList(root: HTMLElement, range: Range, tag: ListTag): SelectionPoints | null {
  const doc = root.ownerDocument;
  const saved = pointsOf(range);
  const units = unitsInRange(root, range).filter((u) => u.nodeName !== 'HR');
  if (!units.length) return null;
  const upper = tag.toUpperCase();
  const alreadyList = units.every(
    (u) => u.nodeName === 'LI' && u.parentElement?.nodeName === upper
  );

  if (alreadyList) {
    const paragraphs: HTMLElement[] = [];
    for (const unit of units) {
      const p = fillBlock(doc.createElement('p'), takeInlineContent(unit));
      detachUnit(unit).replaceWith(p);
      paragraphs.push(p);
    }
    return restoreOr(root, saved, () => spanOf(paragraphs));
  }

  const list = doc.createElement(tag);
  units.forEach((unit, index) => {
    const item = fillBlock(doc.createElement('li'), takeInlineContent(unit));
    const marker = detachUnit(unit);
    if (index === 0) marker.replaceWith(list);
    else marker.remove();
    list.append(item);
  });
  return restoreOr(root, saved, () => spanOf([list]));
}

/** キャレットのあるブロックの後ろに水平線を入れ、続きの段落へキャレットを移す */
export function insertHorizontalRule(root: HTMLElement, range: Range): SelectionPoints | null {
  const doc = root.ownerDocument;
  const unit = unitOf(root, boundaryNode(range.endContainer, range.endOffset, true));
  if (!unit) return null;
  const topLevel = unit.nodeName === 'LI' ? (unit.parentElement as HTMLElement) : unit;
  const hr = doc.createElement('hr');
  topLevel.after(hr);
  let next = hr.nextSibling;
  if (!next || !isTextBlock(next)) {
    next = fillBlock(doc.createElement('p'), []);
    hr.after(next);
  }
  return { startNode: next, startOffset: 0, endNode: next, endOffset: 0 };
}
