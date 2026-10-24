// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { RICH_TEXT_FEATURES, type MarkTag, type RichTextFeature } from './features';
import { toEditorHtml, toOutputHtml } from './normalize';
import {
  ZWSP,
  clearMarks,
  ensureBlocks,
  insertHorizontalRule,
  removeLink,
  setBlockType,
  setLink,
  toggleList,
  toggleMark
} from './dom';

/**
 * ランダムに生成した入力と操作列で、正規化と編集操作が常に満たすべき性質を確かめる。
 * - 回数を増やす: RICH_TEXT_PROPERTY_RUNS=300 npx vitest run rich-text.property
 * - 失敗した seed を再現する: RICH_TEXT_PROPERTY_FROM=551 RICH_TEXT_PROPERTY_RUNS=1 npx vitest run rich-text.property
 * jsdom は1プロセスで大量に DOM を作るほど遅くなるため、多く回すときは FROM をずらして分割する。
 */

const RUNS = Number(process.env.RICH_TEXT_PROPERTY_RUNS) || 100;
const FROM = Number(process.env.RICH_TEXT_PROPERTY_FROM) || 1;
const TIMEOUT_MS = Math.max(60_000, RUNS * 1_000);
const all = new Set<RichTextFeature>(RICH_TEXT_FEATURES);

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = ReturnType<typeof mulberry32>;
const pick = <T>(random: Random, items: readonly T[]): T =>
  items[Math.floor(random() * items.length)];
const int = (random: Random, max: number) => Math.floor(random() * max);

const WORDS = ['あい', 'うえお', 'abc', 'x', ' ', '日本語', 'é', ZWSP, '&amp;', '&lt;b&gt;'];
const INLINE_TAGS = [
  'b',
  'strong',
  'i',
  'em',
  's',
  'strike',
  'u',
  'sup',
  'sub',
  'span',
  'font',
  'code'
];
const BLOCK_TAGS = ['p', 'div', 'h1', 'h2', 'h3', 'h5', 'blockquote', 'section', 'li', 'td'];

/** ブラウザや他サイトの HTML を模した、構造の崩れたものも含むランダムな HTML */
function randomHtml(random: Random, depth = 0): string {
  const count = 1 + int(random, depth === 0 ? 5 : 3);
  let html = '';
  for (let i = 0; i < count; i++) {
    const roll = random();
    if (depth > 3 || roll < 0.3) {
      html += pick(random, WORDS);
    } else if (roll < 0.5) {
      const tag = pick(random, INLINE_TAGS);
      html += `<${tag} style="color:red">${randomHtml(random, depth + 1)}</${tag}>`;
    } else if (roll < 0.7) {
      const tag = pick(random, BLOCK_TAGS);
      html += `<${tag} class="x">${randomHtml(random, depth + 1)}</${tag}>`;
    } else if (roll < 0.82) {
      const tag = pick(random, ['ul', 'ol']);
      const items = Array.from(
        { length: 1 + int(random, 3) },
        () => `<li>${randomHtml(random, depth + 1)}</li>`
      ).join('');
      html += `<${tag}>${items}</${tag}>`;
    } else if (roll < 0.9) {
      const href = pick(random, ['https://e.com/', '/about', 'javascript:alert(1)', '']);
      html += `<a href="${href}" target="_blank" onclick="x()">${randomHtml(random, depth + 1)}</a>`;
    } else {
      html += pick(random, [
        '<br>',
        '<hr id="null">',
        '<img src=x onerror="alert(1)">',
        '<script>x()</script>'
      ]);
    }
  }
  return html;
}

function output(html: string): string {
  const root = document.createElement('div');
  root.innerHTML = html;
  return toOutputHtml(root, all);
}

/**
 * 入力ごとに新しい文書を使う。jsdom は作成した Range をすべて保持して DOM 変更のたびに更新するため、
 * 同じ文書で繰り返すと回数に応じて遅くなる（ブラウザでは使われない Range は破棄される）
 */
function editor(html: string): HTMLElement {
  const doc = document.implementation.createHTMLDocument('');
  const root = doc.createElement('div');
  root.innerHTML = toEditorHtml(html, all);
  doc.body.append(root);
  return root;
}

const visibleText = (root: Node) => (root.textContent ?? '').split(ZWSP).join('');

function textNodes(root: HTMLElement): Text[] {
  const result: Text[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) result.push(n as Text);
  return result;
}

/** 文書中のランダムな2点の範囲（同じ点なら折りたたまれた範囲） */
function randomRange(random: Random, root: HTMLElement): Range {
  const range = root.ownerDocument.createRange();
  const nodes = textNodes(root);
  if (!nodes.length) {
    range.setStart(root.firstChild ?? root, 0);
    return range;
  }
  const point = () => {
    const node = pick(random, nodes);
    return [node, int(random, node.length + 1)] as const;
  };
  const [a, aOffset] = point();
  const [b, bOffset] = random() < 0.2 ? [a, aOffset] : point();
  range.setStart(a, aOffset);
  range.setEnd(b, bOffset);
  if (range.collapsed && (a !== b || aOffset !== bOffset)) {
    // 逆順だった場合は入れ替える
    range.setStart(b, bOffset);
    range.setEnd(a, aOffset);
  }
  return range;
}

const MARKS: MarkTag[] = ['strong', 'em', 's', 'u', 'sup', 'sub'];

const OPERATIONS: Array<{
  name: string;
  /** 文字列を変えない操作か（リンクのキャレット挿入は URL を文字として入れる） */
  keepsText: (range: Range) => boolean;
  run: (random: Random, root: HTMLElement, range: Range) => void;
}> = [
  {
    name: 'toggleMark',
    keepsText: () => true,
    run: (random, root, range) => {
      const tag = pick(random, MARKS);
      toggleMark(root, range, tag, tag === 'sup' ? ['sub'] : tag === 'sub' ? ['sup'] : []);
    }
  },
  { name: 'clearMarks', keepsText: () => true, run: (_r, root, range) => clearMarks(root, range) },
  {
    name: 'setBlockType',
    keepsText: () => true,
    run: (random, root, range) =>
      setBlockType(root, range, pick(random, ['p', 'h2', 'h3', 'h4', 'blockquote'] as const))
  },
  {
    name: 'toggleList',
    keepsText: () => true,
    run: (random, root, range) => toggleList(root, range, pick(random, ['ul', 'ol'] as const))
  },
  {
    name: 'setLink',
    keepsText: (range) => !range.collapsed,
    run: (random, root, range) =>
      setLink(root, range, { href: 'https://e.com/', newTab: random() < 0.5, text: 'link' })
  },
  { name: 'removeLink', keepsText: () => true, run: (_r, root, range) => removeLink(root, range) },
  {
    name: 'insertHorizontalRule',
    keepsText: () => true,
    run: (_r, root, range) => insertHorizontalRule(root, range)
  }
];

const TOP_LEVEL = new Set(['P', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'UL', 'OL', 'HR']);
const TEXT_BLOCKS = 'p, h2, h3, h4, blockquote, li';

/** 編集中の DOM が常に満たすべき構造。違反があれば説明を返す */
function structureViolation(root: HTMLElement): string | null {
  for (const child of Array.from(root.childNodes)) {
    if (!TOP_LEVEL.has(child.nodeName)) return `ルート直下に ${child.nodeName}`;
    if ((child.nodeName === 'UL' || child.nodeName === 'OL') && !child.childNodes.length) {
      return '空のリスト';
    }
  }
  for (const list of Array.from(root.querySelectorAll('ul, ol'))) {
    for (const child of Array.from(list.childNodes)) {
      if (child.nodeName !== 'LI') return `リスト直下に ${child.nodeName}`;
    }
  }
  for (const block of Array.from(root.querySelectorAll(TEXT_BLOCKS))) {
    const nested = block.querySelector('p, h2, h3, h4, blockquote, ul, ol, li, hr');
    if (nested) return `${block.nodeName} の中に ${nested.nodeName}`;
  }
  for (const mark of Array.from(root.querySelectorAll('strong, em, s, u, sup, sub, a'))) {
    if (mark.querySelector('p, h2, h3, h4, blockquote, ul, ol, li, hr')) {
      return `${mark.nodeName} の中にブロック要素`;
    }
  }
  return null;
}

function forEachSeed(run: (random: Random, seed: number) => void) {
  for (let seed = FROM; seed < FROM + RUNS; seed++) run(mulberry32(seed), seed);
}

describe('正規化の性質', () => {
  it('2回正規化しても結果が変わらない（冪等）', () => {
    forEachSeed((random, seed) => {
      const html = randomHtml(random);
      const once = output(html);
      expect(output(once), `seed=${seed} input=${html}`).toBe(once);
    });
  });

  it('出力をエディタに読み込み直して出力しても変わらない', () => {
    forEachSeed((random, seed) => {
      const once = output(randomHtml(random));
      const root = document.createElement('div');
      root.innerHTML = toEditorHtml(once, all);
      expect(toOutputHtml(root, all), `seed=${seed} output=${once}`).toBe(once);
    });
  });

  it('危険な要素・属性と style / class を出力しない', () => {
    forEachSeed((random, seed) => {
      const html = output(randomHtml(random));
      expect(html, `seed=${seed}`).not.toMatch(
        /<script|<img|onerror|onclick|javascript:|style=|class=|id=/i
      );
    });
  });

  it('エディタに読み込んだ DOM は構造の約束を満たす', () => {
    forEachSeed((random, seed) => {
      const html = randomHtml(random);
      const root = editor(html);
      expect(structureViolation(root), `seed=${seed} input=${html}`).toBeNull();
    });
  });
});

describe('編集操作の性質', () => {
  it(
    'どの操作の後も構造の約束を満たし、文字を失わない',
    () => {
      forEachSeed((random, seed) => {
        const root = editor(randomHtml(random));
        const log: string[] = [];
        for (let step = 0; step < 8; step++) {
          const operation = pick(random, OPERATIONS);
          const range = randomRange(random, root);
          const before = visibleText(root);
          const keepsText = operation.keepsText(range);
          log.push(`${operation.name}(${range.toString().slice(0, 10)})`);
          operation.run(random, root, range);
          ensureBlocks(root);

          const context = `seed=${seed} ops=${log.join(' → ')} html=${root.innerHTML}`;
          expect(structureViolation(root), context).toBeNull();
          if (keepsText) expect(visibleText(root), context).toBe(before);
          // 編集後の出力も正規化の結果として安定している
          const out = toOutputHtml(root, all);
          expect(output(out), context).toBe(out);
        }
      });
    },
    TIMEOUT_MS
  );
});
