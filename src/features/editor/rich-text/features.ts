import { logger } from '../../../core/utils/logger';

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
