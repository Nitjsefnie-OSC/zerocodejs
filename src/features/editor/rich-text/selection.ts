import type { SelectionPoints } from './dom';

type ComposedRangesSelection = Selection & {
  getComposedRanges?: (...args: unknown[]) => StaticRange[];
};

type SelectableShadowRoot = ShadowRoot & { getSelection?: () => Selection | null };

/**
 * Shadow DOM 内の選択範囲を取得する。WebKit / Firefox の `document.getSelection()` は
 * shadow 内の位置をホスト要素に再ターゲットするため、`getComposedRanges` で取得する。
 */
function readBoundaries(root: HTMLElement): StaticRange | Range | null {
  const doc = root.ownerDocument;
  const selection = doc.getSelection() as ComposedRangesSelection | null;
  if (!selection || selection.rangeCount === 0) return null;
  const host = root.getRootNode();
  if (!(host instanceof ShadowRoot)) return selection.getRangeAt(0);

  if (typeof selection.getComposedRanges === 'function') {
    try {
      return selection.getComposedRanges({ shadowRoots: [host] })[0] ?? null;
    } catch {
      // 旧仕様（Safari 17 など）は ShadowRoot を可変長引数で受け取る
      return selection.getComposedRanges(host)[0] ?? null;
    }
  }
  const shadowSelection = (host as SelectableShadowRoot).getSelection?.();
  return shadowSelection && shadowSelection.rangeCount ? shadowSelection.getRangeAt(0) : null;
}

function within(root: HTMLElement, node: Node): boolean {
  return node === root || root.contains(node);
}

export function getEditorRange(root: HTMLElement): Range | null {
  const boundaries = readBoundaries(root);
  if (!boundaries) return null;
  if (!within(root, boundaries.startContainer) || !within(root, boundaries.endContainer)) {
    return null;
  }
  const range = root.ownerDocument.createRange();
  range.setStart(boundaries.startContainer, boundaries.startOffset);
  range.setEnd(boundaries.endContainer, boundaries.endOffset);
  return range;
}

/** `addRange` は WebKit で shadow 内の Range を受け付けないため `setBaseAndExtent` を使う */
export function setEditorSelection(root: HTMLElement, points: SelectionPoints): void {
  const selection = root.ownerDocument.getSelection();
  if (!selection) return;
  try {
    selection.setBaseAndExtent(
      points.startNode,
      points.startOffset,
      points.endNode,
      points.endOffset
    );
  } catch {
    // 履歴の復元などで位置が範囲外になった場合は選択を変えない
  }
}

export interface SerializedPoint {
  path: number[];
  offset: number;
}

export interface SerializedSelection {
  start: SerializedPoint;
  end: SerializedPoint;
}

function serializePoint(root: HTMLElement, node: Node, offset: number): SerializedPoint | null {
  const path: number[] = [];
  let current: Node | null = node;
  while (current && current !== root) {
    const parent: Node | null = current.parentNode;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }
  return current ? { path, offset } : null;
}

function resolvePoint(root: HTMLElement, point: SerializedPoint): Node | null {
  let node: Node = root;
  for (const index of point.path) {
    const child = node.childNodes[index];
    if (!child) return null;
    node = child;
  }
  return node;
}

export function serializeSelection(
  root: HTMLElement,
  range: Range | null
): SerializedSelection | null {
  if (!range) return null;
  const start = serializePoint(root, range.startContainer, range.startOffset);
  const end = serializePoint(root, range.endContainer, range.endOffset);
  return start && end ? { start, end } : null;
}

export function deserializeSelection(
  root: HTMLElement,
  selection: SerializedSelection | null
): SelectionPoints | null {
  if (!selection) return null;
  const startNode = resolvePoint(root, selection.start);
  const endNode = resolvePoint(root, selection.end);
  if (!startNode || !endNode) return null;
  return {
    startNode,
    startOffset: selection.start.offset,
    endNode,
    endOffset: selection.end.offset
  };
}
