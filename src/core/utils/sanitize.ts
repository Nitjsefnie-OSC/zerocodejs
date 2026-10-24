import createDOMPurify from 'dompurify';
import { getJSDOMWindow } from './dom-utils';

type Purify = ReturnType<typeof createDOMPurify>;

type SsrGlobals = typeof globalThis & {
  __ZCODE_SSR_WINDOW__?: Window;
  window?: Window;
};

function purifyWindow(): Window {
  const g = globalThis as SsrGlobals;
  return g.__ZCODE_SSR_WINDOW__ ?? g.window ?? getJSDOMWindow();
}

let cachedPurify: Purify | null = null;
let cachedWindow: Window | undefined;

/**
 * Next.js SSR の `window` は DOMPurify が要求する形ではないことがある。
 * ホストが `__ZCODE_SSR_WINDOW__`（jsdom）を置けば、それを優先して初期化する。
 */
function getPurify(): Purify {
  const w = purifyWindow();
  if (cachedPurify && cachedWindow === w && typeof cachedPurify.sanitize === 'function') {
    return cachedPurify;
  }

  const imported = createDOMPurify as unknown as Purify;
  const g = globalThis as SsrGlobals;
  if (typeof imported.sanitize === 'function' && g.__ZCODE_SSR_WINDOW__ == null) {
    cachedPurify = imported;
    cachedWindow = w;
    return cachedPurify;
  }

  const purify = createDOMPurify(w as unknown as Parameters<typeof createDOMPurify>[0]);
  if (!purify.isSupported) {
    throw new Error('DOMPurify is not supported with the provided window');
  }
  cachedPurify = purify;
  cachedWindow = w;
  return cachedPurify;
}

const RICH_TEXT_PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    's',
    'u',
    'sup',
    'sub',
    'h2',
    'h3',
    'h4',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'hr'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
};

export function sanitizeRichText(html: string): string {
  return getPurify().sanitize(html, RICH_TEXT_PURIFY_CONFIG);
}

/**
 * リッチテキストのリンクのうち、許可した URL 以外のものを返す（重複なし）。
 * リンク先を候補に限定する運用（config の richText.link.mode: 'select'）で、
 * 保存を受け付けるサーバー側の検証に使う。比較は sanitizeUrl 後の文字列の完全一致。
 */
export function findDisallowedRichTextLinks(html: string, allowedUrls: string[]): string[] {
  const fragment = getPurify().sanitize(html, {
    ...RICH_TEXT_PURIFY_CONFIG,
    RETURN_DOM_FRAGMENT: true
  });
  const allowed = new Set(allowedUrls.map((url) => sanitizeUrl(url)).filter(Boolean));
  const disallowed = new Set<string>();
  for (const anchor of Array.from(fragment.querySelectorAll('a[href]'))) {
    const href = anchor.getAttribute('href') ?? '';
    if (!allowed.has(href)) disallowed.add(href);
  }
  return [...disallowed];
}

/**
 * HTML属性値をエスケープする
 */
export function escapeAttributeValue(value: string): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const RASTER_IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpe?g|gif|webp|avif|bmp|x-icon)[;,]/;
const SVG_IMAGE_DATA_URL_REGEX = /^data:image\/svg\+xml[;,]/;

export type UrlContext = 'navigation' | 'embed';

/**
 * URLを検証・サニタイズする
 * @param url - 検証するURL
 * @param context - URLの使われ方。
 *   'embed'（img の src 等の埋め込み先）では SVG の data URL を許可する
 *   （img 経由ではスクリプトが実行されないため）。
 *   'navigation'（href / action 等の遷移先）では SVG の data URL は
 *   スクリプトを内包できるため拒否する。省略時は安全側の 'navigation'。
 */
export function sanitizeUrl(url: string, context: UrlContext = 'navigation'): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // ブラウザは URL 中のタブ・改行等の制御文字を除去してから解釈するため
  // （例: java\tscript: は javascript: として実行される）、判定前に同様に除去する
  // eslint-disable-next-line no-control-regex -- 制御文字の除去自体が目的
  const cleaned = url.trim().replace(/[\u0000-\u001f\u007f]/g, '');
  const lower = cleaned.toLowerCase();

  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return '';
  }

  if (lower.startsWith('data:')) {
    if (RASTER_IMAGE_DATA_URL_REGEX.test(lower)) {
      return cleaned;
    }
    if (context === 'embed' && SVG_IMAGE_DATA_URL_REGEX.test(lower)) {
      return cleaned;
    }
    return '';
  }

  return cleaned;
}

/**
 * パーツテンプレート用のサニタイズ。
 * ZeroCode のテンプレート記法（{$...}, {@...}, ($...), z-* 属性）を保持しつつ、
 * 危険なタグ・属性を除去する。
 */
export function sanitizePartTemplate(html: string): string {
  return getPurify().sanitize(html, {
    ADD_TAGS: ['img', 'picture', 'source', 'video', 'audio', 'svg', 'path', 'use'],
    ADD_ATTR: [
      'z-if',
      'z-tag',
      'z-empty',
      'z-for',
      'z-slot',
      'class',
      'id',
      'style',
      'src',
      'href',
      'alt',
      'title',
      'width',
      'height',
      'target',
      'rel',
      'role',
      'aria-level',
      'aria-label',
      'aria-hidden',
      'loading',
      'decoding',
      'fetchpriority',
      'data-*'
    ],
    FORBID_TAGS: [
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'textarea',
      'select'
    ],
    FORBID_ATTR: [
      'onerror',
      'onload',
      'onclick',
      'ondblclick',
      'onmousedown',
      'onmouseup',
      'onmouseover',
      'onmouseout',
      'onmousemove',
      'onmouseenter',
      'onmouseleave',
      'onfocus',
      'onblur',
      'onkeydown',
      'onkeyup',
      'onkeypress',
      'onsubmit',
      'onreset',
      'onchange',
      'oninput',
      'oncontextmenu',
      'ontouchstart',
      'ontouchmove',
      'ontouchend',
      'onpointerdown',
      'onpointerup',
      'ontoggle',
      'onscroll',
      'onwheel',
      'onresize',
      'onanimationstart',
      'onanimationend',
      'ontransitionend'
    ],
    ALLOW_DATA_ATTR: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
  });
}
