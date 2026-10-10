import { sanitizeRichText, sanitizeUrl } from '../../../core/utils/sanitize';
import type { RichTextFeature } from './features';
import { MARK_FEATURES } from './features';
import { ZWSP, isList, isMarkElement, isTextBlock, tidyMarks } from './dom';

/**
 * 貼り付け・読み込み・出力時に HTML をエディタの出力仕様（意味を持つタグのみ、style/class なし）
 * に揃える。DOM は scripts の実行も画像の読み込みも行わない文書の上で組み立てる。
 */

const REMOVED_ELEMENTS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'TEMPLATE',
  'IMG',
  'PICTURE',
  'SVG',
  'MATH',
  'VIDEO',
  'AUDIO',
  'CANVAS',
  'INPUT',
  'BUTTON',
  'SELECT',
  'TEXTAREA',
  'FORM',
  'META',
  'LINK',
  'TITLE',
  'HEAD',
  'NOSCRIPT'
]);

const RENAMED_ELEMENTS: Record<string, string> = {
  B: 'strong',
  I: 'em',
  STRIKE: 's',
  DEL: 's',
  INS: 'u',
  H1: 'h2',
  H5: 'h4',
  H6: 'h4'
};

const BLOCK_CONTAINERS = new Set([
  'DIV',
  'SECTION',
  'ARTICLE',
  'HEADER',
  'FOOTER',
  'MAIN',
  'ASIDE',
  'NAV',
  'FIGURE',
  'FIGCAPTION',
  'ADDRESS',
  'PRE',
  'TABLE',
  'THEAD',
  'TBODY',
  'TFOOT',
  'TR',
  'TD',
  'TH',
  'CAPTION',
  'DL',
  'DT',
  'DD',
  'CENTER',
  'BODY',
  'HTML'
]);

const KEPT_ELEMENTS = new Set([
  'P',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'UL',
  'OL',
  'LI',
  'HR',
  'BR',
  'STRONG',
  'EM',
  'S',
  'U',
  'SUP',
  'SUB',
  'A'
]);

function inertDocument(): Document {
  return document.implementation.createHTMLDocument('');
}

function parse(html: string): HTMLElement {
  const container = inertDocument().createElement('div');
  container.innerHTML = html;
  return container;
}

function unwrap(el: Element): void {
  el.replaceWith(...Array.from(el.childNodes));
}

function rename(el: Element, tag: string): HTMLElement {
  const replacement = el.ownerDocument.createElement(tag);
  replacement.append(...Array.from(el.childNodes));
  el.replaceWith(replacement);
  return replacement;
}

function hasBlockDescendant(el: Element): boolean {
  return !!el.querySelector('p, h2, h3, h4, blockquote, ul, ol, li, hr, div');
}

function cleanAnchor(anchor: HTMLElement): void {
  const href = sanitizeUrl(anchor.getAttribute('href') ?? '');
  const newTab = anchor.getAttribute('target') === '_blank';
  for (const attr of Array.from(anchor.attributes)) anchor.removeAttribute(attr.name);
  if (!href) {
    unwrap(anchor);
    return;
  }
  anchor.setAttribute('href', href);
  if (newTab) {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  }
}

/** 許可しない要素の除去・別名タグの置換・属性の除去 */
function cleanElements(parent: Node): void {
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    let el = child as HTMLElement;
    const name = el.nodeName.toUpperCase();
    if (REMOVED_ELEMENTS.has(name)) {
      el.remove();
      continue;
    }
    cleanElements(el);
    if (RENAMED_ELEMENTS[name]) {
      el = rename(el, RENAMED_ELEMENTS[name]);
    } else if (BLOCK_CONTAINERS.has(name)) {
      el = rename(el, 'div');
    } else if (!KEPT_ELEMENTS.has(name)) {
      unwrap(el);
      continue;
    }
    if (el.nodeName === 'A') {
      cleanAnchor(el);
      continue;
    }
    for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
    if (isMarkElement(el) && hasBlockDescendant(el)) unwrap(el);
  }
}

/** 無効な機能のタグを、内容を保ったまま取り除く */
function applyFeatures(container: HTMLElement, features: ReadonlySet<RichTextFeature>): void {
  for (const [feature, tag] of MARK_FEATURES) {
    if (!features.has(feature)) container.querySelectorAll(tag).forEach(unwrap);
  }
  if (!features.has('link')) container.querySelectorAll('a').forEach(unwrap);
  if (!features.has('heading'))
    container.querySelectorAll('h2, h3, h4').forEach((h) => rename(h, 'p'));
  if (!features.has('blockquote')) {
    container.querySelectorAll('blockquote').forEach((q) => rename(q, 'div'));
  }
  if (!features.has('horizontalRule'))
    container.querySelectorAll('hr').forEach((hr) => hr.remove());
  const disabledLists = [
    features.has('bulletList') ? null : 'ul',
    features.has('orderedList') ? null : 'ol'
  ].filter(Boolean);
  if (disabledLists.length) {
    for (const list of Array.from(container.querySelectorAll(disabledLists.join(', ')))) {
      list.querySelectorAll(':scope > li').forEach((li) => rename(li, 'p'));
      rename(list, 'div');
    }
  }
}

function isInline(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return true;
  return node.nodeType === Node.ELEMENT_NODE && (isMarkElement(node) || node.nodeName === 'BR');
}

function hasVisible(nodes: Node[]): boolean {
  return nodes.some(
    (n) =>
      (n.textContent ?? '').replace(new RegExp(ZWSP, 'g'), '').trim() !== '' ||
      n.nodeName === 'BR' ||
      (n.nodeType === Node.ELEMENT_NODE && !!(n as Element).querySelector('br'))
  );
}

/** ブロック要素の中のインライン内容を取り出す（入れ子のブロックは改行でつなぐ） */
function flattenInline(el: Element): Node[] {
  const doc = el.ownerDocument;
  const result: Node[] = [];
  for (const child of Array.from(el.childNodes)) {
    if (isInline(child)) {
      result.push(child);
    } else if (child.nodeType === Node.ELEMENT_NODE && !isList(child)) {
      const inner = flattenInline(child as Element);
      if (inner.length && result.length) result.push(doc.createElement('br'));
      result.push(...inner);
    }
  }
  return result;
}

function normalizeList(list: HTMLElement): HTMLElement {
  const doc = list.ownerDocument;
  const normalized = doc.createElement(list.nodeName.toLowerCase());
  const appendItem = (content: Node[]) => {
    if (!hasVisible(content)) return;
    const li = doc.createElement('li');
    li.append(...content);
    normalized.append(li);
  };
  for (const child of Array.from(list.childNodes)) {
    if (child.nodeName === 'LI') {
      appendItem(flattenInline(child as Element));
      // 入れ子のリストは平坦化して後続の項目にする
      for (const nested of Array.from((child as Element).querySelectorAll('ul, ol'))) {
        for (const item of Array.from(normalizeList(nested as HTMLElement).childNodes)) {
          normalized.append(item);
        }
      }
    } else if (isInline(child)) {
      appendItem([child]);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      appendItem(flattenInline(child as Element));
    }
  }
  return normalized;
}

/** 子要素をブロックの列に組み直す（インラインの連続は段落にまとめる） */
function blockify(parent: Node, inlineTag: string, out: HTMLElement[]): void {
  const doc = parent.ownerDocument as Document;
  let run: Node[] = [];
  const flush = () => {
    if (hasVisible(run)) {
      const block = doc.createElement(inlineTag);
      block.append(...run);
      out.push(block);
    }
    run = [];
  };
  for (const child of Array.from(parent.childNodes)) {
    if (isInline(child)) {
      run.push(child);
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    flush();
    const name = child.nodeName;
    if (isTextBlock(child)) {
      const tag = name === 'P' && inlineTag !== 'p' ? inlineTag : name.toLowerCase();
      const count = out.length;
      blockify(child, tag, out);
      // 空の段落は余白として使われるため残す
      if (out.length === count) out.push(doc.createElement(tag));
    } else if (name === 'DIV' || name === 'LI') {
      blockify(child, inlineTag, out);
    } else if (isList(child)) {
      const list = normalizeList(child);
      if (list.firstChild) out.push(list);
    } else if (name === 'HR') {
      out.push(child as HTMLElement);
    }
  }
  flush();
}

function stripPlaceholders(container: HTMLElement): void {
  const walker = container.ownerDocument.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    if (n.data.includes(ZWSP)) n.data = n.data.replace(new RegExp(ZWSP, 'g'), '');
  }
}

/** container の中身を出力仕様に揃える */
export function normalizeTree(
  container: HTMLElement,
  features: ReadonlySet<RichTextFeature>
): void {
  cleanElements(container);
  applyFeatures(container, features);
  stripPlaceholders(container);
  const blocks: HTMLElement[] = [];
  blockify(container, 'p', blocks);
  container.replaceChildren(...blocks);
  tidyMarks(container);
}

const BLOCKS_WITH_TEXT = 'p, h2, h3, h4, blockquote, li';

/** 外部から受け取った HTML をエディタに表示できる形にする */
export function toEditorHtml(html: string, features: ReadonlySet<RichTextFeature>): string {
  const container = parse(sanitizeRichText(html ?? ''));
  normalizeTree(container, features);
  const doc = container.ownerDocument;
  for (const block of Array.from(container.querySelectorAll(BLOCKS_WITH_TEXT))) {
    if (!hasVisible(Array.from(block.childNodes))) block.replaceChildren(doc.createElement('br'));
  }
  if (!container.firstChild) {
    const p = doc.createElement('p');
    p.append(doc.createElement('br'));
    container.append(p);
  }
  return container.innerHTML;
}

/** 貼り付けられた HTML / テキストを、挿入するブロックの HTML にする */
export function toPastedHtml(
  data: { html?: string; text?: string },
  features: ReadonlySet<RichTextFeature>
): string {
  let container: HTMLElement;
  if (data.html) {
    container = parse(data.html);
  } else {
    container = inertDocument().createElement('div');
    for (const line of (data.text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
      const p = container.ownerDocument.createElement('p');
      p.textContent = line;
      container.append(p);
    }
  }
  normalizeTree(container, features);
  return sanitizeRichText(container.innerHTML);
}

/** エディタの DOM から保存用の HTML を作る（内容が空なら `<p></p>`） */
export function toOutputHtml(root: HTMLElement, features: ReadonlySet<RichTextFeature>): string {
  // HTML として再解析すると <p> 内の <ul> などが分割されるため、DOM のまま複製する
  const container = inertDocument().importNode(root, true) as HTMLElement;
  normalizeTree(container, features);
  for (const block of Array.from(container.querySelectorAll(BLOCKS_WITH_TEXT))) {
    while (block.lastChild && block.lastChild.nodeName === 'BR') block.lastChild.remove();
  }
  const html = container.innerHTML;
  return html === '' ? '<p></p>' : html;
}
