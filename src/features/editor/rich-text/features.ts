import { logger } from '../../../core/utils/logger';
import { sanitizeUrl } from '../../../core/utils/sanitize';

export const RICH_TEXT_FEATURES = [
  'bold',
  'italic',
  'strike',
  'underline',
  'link',
  'bulletList',
  'orderedList',
  'horizontalRule',
  'heading',
  'blockquote',
  'superscript',
  'subscript',
  'clearFormat',
  'history'
] as const;

export type RichTextFeature = (typeof RICH_TEXT_FEATURES)[number];

export const DEFAULT_RICH_TEXT_FEATURES: readonly RichTextFeature[] = [
  'bold',
  'strike',
  'link',
  'bulletList',
  'orderedList',
  'history'
];

export type MarkTag = 'strong' | 'em' | 's' | 'u' | 'sup' | 'sub';
export type HeadingTag = 'h2' | 'h3' | 'h4';
export type TextBlockTag = 'p' | HeadingTag | 'blockquote';
export type ListTag = 'ul' | 'ol';

export const MARK_FEATURES: ReadonlyArray<[RichTextFeature, MarkTag]> = [
  ['bold', 'strong'],
  ['italic', 'em'],
  ['strike', 's'],
  ['underline', 'u'],
  ['superscript', 'sup'],
  ['subscript', 'sub']
];

export const HEADING_TAGS: readonly HeadingTag[] = ['h2', 'h3', 'h4'];

export function isRichTextFeature(value: unknown): value is RichTextFeature {
  return typeof value === 'string' && (RICH_TEXT_FEATURES as readonly string[]).includes(value);
}

/**
 * config の `richText.features` を有効な機能の集合に解決する。
 * 未指定・配列以外はデフォルト、未知の機能名は警告して無視する。
 */
export function resolveRichTextFeatures(features: unknown): ReadonlySet<RichTextFeature> {
  if (!Array.isArray(features)) {
    return new Set(DEFAULT_RICH_TEXT_FEATURES);
  }
  const resolved = new Set<RichTextFeature>();
  for (const feature of features) {
    if (isRichTextFeature(feature)) {
      resolved.add(feature);
    } else {
      logger.warn('richText.features: unknown feature ignored:', feature);
    }
  }
  return resolved;
}

export const RICH_TEXT_LINK_MODES = ['free', 'select', 'both'] as const;

/** free: URL を自由入力 / select: 候補から選ぶのみ / both: 候補から選ぶか自由入力 */
export type RichTextLinkMode = (typeof RICH_TEXT_LINK_MODES)[number];

/** backendData で渡すリンク候補 */
export interface RichTextLinkOption {
  label: string;
  url: string;
  newTab?: boolean;
}

/** リッチテキスト設定を解決したもの（各 Web Component が provide する） */
export interface ResolvedRichTextConfig {
  features: ReadonlySet<RichTextFeature>;
  linkMode: RichTextLinkMode;
  /** リンク候補の配列を指す backendData のパス */
  linkSource?: string;
}

/** リンクの扱い。options が null のときは候補が未取得のため制限しない */
export interface RichTextLinkPolicy {
  mode: RichTextLinkMode;
  options: RichTextLinkOption[] | null;
}

export function resolveRichTextConfig(settings: unknown): ResolvedRichTextConfig {
  const richText = (typeof settings === 'object' && settings !== null ? settings : {}) as {
    features?: unknown;
    link?: { mode?: unknown; source?: unknown };
  };
  const link = richText.link ?? {};
  let linkMode: RichTextLinkMode = 'free';
  if (link.mode !== undefined) {
    if ((RICH_TEXT_LINK_MODES as readonly unknown[]).includes(link.mode)) {
      linkMode = link.mode as RichTextLinkMode;
    } else {
      logger.warn('richText.link.mode: unknown mode ignored:', link.mode);
    }
  }
  const linkSource = typeof link.source === 'string' && link.source ? link.source : undefined;
  if (linkMode !== 'free' && !linkSource) {
    logger.warn(`richText.link.mode "${linkMode}" requires richText.link.source`);
  }
  return { features: resolveRichTextFeatures(richText.features), linkMode, linkSource };
}

/**
 * backendData から取り出した値をリンク候補の配列にする。
 * 配列でなければ null（未取得）、不正な項目と危険なスキームの URL は除く。
 */
export function resolveLinkOptions(value: unknown): RichTextLinkOption[] | null {
  if (!Array.isArray(value)) return null;
  const options: RichTextLinkOption[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const { label, url, newTab } = item as Record<string, unknown>;
    if (typeof label !== 'string' || typeof url !== 'string') continue;
    const safeUrl = sanitizeUrl(url);
    if (!safeUrl) continue;
    options.push({ label, url: safeUrl, newTab: newTab === true });
  }
  return options;
}
