import type { PartData } from '../types';

/**
 * 1パーツ＝1ファイルの形式。先頭のコメントに JSON でパーツの情報を書き、その下がテンプレート本体。
 *
 * <!--zerocode
 * { "id": "zcode-part-table", "title": "table", "slots": { "rows": { "allowedParts": ["..."] } } }
 * -->
 * <div class="c-table">…</div>
 */
export type PartMeta = Omit<PartData, 'body'>;

export interface ParsedPartFile {
  meta: PartMeta;
  body: string;
  /** 本体の1行目が、ファイルの何行目か（1始まり） */
  bodyStartLine: number;
}

export class PartFileError extends Error {
  constructor(
    message: string,
    readonly line?: number
  ) {
    super(message);
  }
}

const HEADER = /^\s*<!--\s*zerocode\b([\s\S]*?)-->[^\S\n]*\r?\n?/;
const META_KEYS = new Set(['id', 'title', 'description', 'slots', 'slotOnly']);

export const CSS_PART_MARKER = (id: string) => `/* zerocode-part: ${id} */`;
export const CSS_PART_MARKER_PATTERN = /^\/\* zerocode-part: (.+?) \*\/$/;

function lineCount(text: string): number {
  return text.split('\n').length - 1;
}

function validateMeta(raw: unknown, line: number): PartMeta {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new PartFileError('パーツの情報は JSON のオブジェクトで書いてください', line);
  }
  const meta = raw as Record<string, unknown>;
  const unknownKeys = Object.keys(meta).filter((key) => !META_KEYS.has(key));
  if (unknownKeys.length) {
    throw new PartFileError(
      `知らない項目があります: ${unknownKeys.join(', ')}（使える項目: ${[...META_KEYS].join(', ')}）`,
      line
    );
  }
  if (typeof meta.id !== 'string' || !meta.id.trim()) {
    throw new PartFileError(
      '"id" は必須です（ページのデータから参照されるため、変えないでください）',
      line
    );
  }
  for (const key of ['title', 'description'] as const) {
    if (meta[key] !== undefined && typeof meta[key] !== 'string') {
      throw new PartFileError(`"${key}" は文字列で書いてください`, line);
    }
  }
  if (meta.slotOnly !== undefined && typeof meta.slotOnly !== 'boolean') {
    throw new PartFileError('"slotOnly" は true か false で書いてください', line);
  }
  if (meta.slots !== undefined) {
    const slots = meta.slots;
    if (!slots || typeof slots !== 'object' || Array.isArray(slots)) {
      throw new PartFileError(
        '"slots" は { "スロット名": { "allowedParts": [...] } } の形で書いてください',
        line
      );
    }
    for (const [name, config] of Object.entries(slots as Record<string, unknown>)) {
      const allowed = (config as { allowedParts?: unknown } | null)?.allowedParts;
      if (
        !config ||
        typeof config !== 'object' ||
        (allowed !== undefined &&
          (!Array.isArray(allowed) || allowed.some((id) => typeof id !== 'string')))
      ) {
        throw new PartFileError(
          `スロット "${name}" の allowedParts はパーツ ID の配列で書いてください`,
          line
        );
      }
    }
  }
  return {
    id: meta.id,
    title: (meta.title as string | undefined) ?? meta.id,
    description: (meta.description as string | undefined) ?? '',
    ...(meta.slots ? { slots: meta.slots as PartMeta['slots'] } : {}),
    ...(meta.slotOnly ? { slotOnly: true } : {})
  };
}

export function parsePartFile(text: string): ParsedPartFile {
  const source = text.replace(/^\uFEFF/, '');
  const match = source.match(HEADER);
  if (!match) {
    throw new PartFileError('先頭に <!--zerocode { "id": "..." } --> の情報がありません', 1);
  }
  const headerStartLine = lineCount(source.slice(0, source.indexOf('<!--'))) + 1;
  let raw: unknown;
  try {
    raw = JSON.parse(match[1]);
  } catch (error) {
    throw new PartFileError(
      `情報の JSON を読めません: ${(error as Error).message}`,
      headerStartLine
    );
  }
  return {
    meta: validateMeta(raw, headerStartLine),
    body: source.slice(match[0].length).replace(/\s+$/, ''),
    bodyStartLine: lineCount(match[0]) + 1
  };
}

export function serializePartFile(part: PartData): string {
  const meta: Record<string, unknown> = {
    id: part.id,
    title: part.title,
    description: part.description ?? ''
  };
  if (part.slots && Object.keys(part.slots).length) meta.slots = part.slots;
  if (part.slotOnly) meta.slotOnly = true;
  return `<!--zerocode\n${JSON.stringify(meta, null, 2)}\n-->\n${part.body.replace(/\s+$/, '')}\n`;
}
