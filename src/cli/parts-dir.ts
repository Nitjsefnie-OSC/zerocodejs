import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import type { PartData, TypeData } from '../types';
import {
  CSS_PART_MARKER,
  CSS_PART_MARKER_PATTERN,
  PartFileError,
  parsePartFile,
  serializePartFile
} from './part-file';

export const CATEGORIES = ['common', 'individual', 'special'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Issue {
  level: 'error' | 'warning';
  file: string;
  line?: number;
  message: string;
}

export interface PartSource {
  category: Category;
  file: string;
  bodyStartLine: number;
  part: PartData;
}

export interface PartsBuild {
  parts: Partial<Record<Category, TypeData[]>>;
  css: Partial<Record<Category, string>>;
  sources: PartSource[];
  issues: Issue[];
}

const CATEGORY_CSS = '_category.css';
const TYPE_FILE = '_type.json';
const TYPE_KEYS = new Set(['id', 'type', 'description']);

const byName = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });

function entries(dir: string) {
  return readdirSync(dir).sort(byName);
}

function isDir(path: string) {
  return statSync(path).isDirectory();
}

function readType(file: string, issues: Issue[]): Omit<TypeData, 'parts'> | null {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    issues.push({
      level: 'error',
      file,
      message: `JSON を読めません: ${(error as Error).message}`
    });
    return null;
  }
  const unknownKeys = Object.keys(raw ?? {}).filter((key) => !TYPE_KEYS.has(key));
  if (unknownKeys.length) {
    issues.push({
      level: 'error',
      file,
      message: `知らない項目があります: ${unknownKeys.join(', ')}`
    });
    return null;
  }
  if (typeof raw.id !== 'string' || !raw.id || typeof raw.type !== 'string' || !raw.type) {
    issues.push({ level: 'error', file, message: '"id" と "type" は必須です' });
    return null;
  }
  return { id: raw.id, type: raw.type, description: (raw.description as string) ?? '' };
}

/**
 * パーツのフォルダを読み、カテゴリごとのタイプ・パーツと CSS を組み立てる。
 * <dir>/<category>/_category.css、<dir>/<category>/<NN-type>/_type.json と <NN-part>.html（.css）
 */
export function readPartsDir(dir: string, only?: readonly Category[]): PartsBuild {
  const build: PartsBuild = { parts: {}, css: {}, sources: [], issues: [] };
  const display = (path: string) => relative(process.cwd(), path) || path;

  for (const category of only ?? CATEGORIES) {
    const categoryDir = join(dir, category);
    if (!existsSync(categoryDir) || !isDir(categoryDir)) continue;

    const types: TypeData[] = [];
    const cssChunks: string[] = [];
    const categoryCss = join(categoryDir, CATEGORY_CSS);
    if (existsSync(categoryCss)) {
      const css = readFileSync(categoryCss, 'utf8').trim();
      if (css) cssChunks.push(css);
    }

    for (const typeName of entries(categoryDir)) {
      const typeDir = join(categoryDir, typeName);
      if (!isDir(typeDir)) {
        if (typeName !== CATEGORY_CSS) {
          build.issues.push({
            level: 'warning',
            file: display(typeDir),
            message: `カテゴリの直下に置けるのは ${CATEGORY_CSS} とタイプのフォルダだけです（無視しました）`
          });
        }
        continue;
      }
      const typeFile = join(typeDir, TYPE_FILE);
      if (!existsSync(typeFile)) {
        build.issues.push({
          level: 'error',
          file: display(typeDir),
          message: `${TYPE_FILE} がありません`
        });
        continue;
      }
      const type = readType(typeFile, build.issues);
      if (!type) continue;

      const files = entries(typeDir);
      const parts: PartData[] = [];
      for (const name of files) {
        const file = join(typeDir, name);
        if (name === TYPE_FILE || isDir(file)) continue;
        const ext = extname(name);
        if (ext === '.css') {
          if (!files.includes(`${basename(name, ext)}.html`)) {
            build.issues.push({
              level: 'warning',
              file: display(file),
              message: '同じ名前の .html がないため、この CSS は使われません'
            });
          }
          continue;
        }
        if (ext !== '.html') {
          build.issues.push({
            level: 'warning',
            file: display(file),
            message: '.html と .css 以外は無視しました'
          });
          continue;
        }
        try {
          const parsed = parsePartFile(readFileSync(file, 'utf8'));
          const part: PartData = { ...parsed.meta, body: parsed.body };
          parts.push(part);
          build.sources.push({
            category,
            file: display(file),
            bodyStartLine: parsed.bodyStartLine,
            part
          });
          const cssFile = join(typeDir, `${basename(name, ext)}.css`);
          if (existsSync(cssFile)) {
            const css = readFileSync(cssFile, 'utf8').trim();
            if (css) cssChunks.push(`${CSS_PART_MARKER(part.id)}\n${css}`);
          }
        } catch (error) {
          if (!(error instanceof PartFileError)) throw error;
          build.issues.push({
            level: 'error',
            file: display(file),
            line: error.line,
            message: error.message
          });
        }
      }
      types.push({ ...type, parts });
    }

    build.parts[category] = types;
    build.css[category] = cssChunks.join('\n\n');
  }
  return build;
}

const slug = (value: string) =>
  value.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
const pad = (index: number, count: number) =>
  String(index + 1).padStart(Math.max(2, String(count).length), '0');

/** CSS を目印ごとに分ける。目印より前と、知らない ID の目印の後ろはカテゴリ全体の CSS に残す */
function splitCss(css: string, partIds: Set<string>) {
  const byPart = new Map<string, string[]>();
  const shared: string[] = [];
  let current: string[] = shared;
  for (const line of css.split('\n')) {
    const marker = line.trim().match(CSS_PART_MARKER_PATTERN);
    if (marker && partIds.has(marker[1])) {
      current = byPart.get(marker[1]) ?? [];
      byPart.set(marker[1], current);
      continue;
    }
    current.push(line);
  }
  const text = (lines: string[]) => lines.join('\n').trim();
  return {
    shared: text(shared),
    byPart: new Map([...byPart].map(([id, lines]) => [id, text(lines)]))
  };
}

/** パーツのデータをフォルダに書き出す（readPartsDir の逆） */
export function writePartsDir(
  data: { parts?: Partial<Record<Category, TypeData[]>>; css?: Partial<Record<Category, string>> },
  dir: string,
  only?: readonly Category[]
): string[] {
  const written: string[] = [];
  const write = (path: string, text: string) => {
    writeFileSync(path, text.endsWith('\n') ? text : `${text}\n`);
    written.push(path);
  };

  for (const category of only ?? CATEGORIES) {
    const types = data.parts?.[category];
    if (!types?.length && !data.css?.[category]) continue;
    const categoryDir = join(dir, category);
    mkdirSync(categoryDir, { recursive: true });

    const partIds = new Set((types ?? []).flatMap((type) => type.parts.map((part) => part.id)));
    const { shared, byPart } = splitCss(data.css?.[category] ?? '', partIds);
    if (shared) write(join(categoryDir, CATEGORY_CSS), shared);

    (types ?? []).forEach((type, typeIndex) => {
      const typeDir = join(
        categoryDir,
        `${pad(typeIndex, types!.length)}-${slug(type.type || type.id)}`
      );
      mkdirSync(typeDir, { recursive: true });
      write(
        join(typeDir, TYPE_FILE),
        JSON.stringify(
          { id: type.id, type: type.type, description: type.description ?? '' },
          null,
          2
        )
      );
      type.parts.forEach((part, partIndex) => {
        const name = `${pad(partIndex, type.parts.length)}-${slug(part.id)}`;
        write(join(typeDir, `${name}.html`), serializePartFile(part));
        const css = byPart.get(part.id);
        if (css) write(join(typeDir, `${name}.css`), css);
      });
    });
  }
  return written;
}
