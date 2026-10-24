import { scanFieldTokens, VALID_Z_TAG_NAMES } from '../core/utils/field-syntax';
import type { Issue, PartsBuild, PartSource } from './parts-dir';

const Z_SLOT = /z-slot="([^"]*)"/g;
const Z_TAG = /z-tag="([^"]*)"/g;
const Z_FOR = /z-for="([^"]*)"/g;
const SYNTAX_START = /\{\$|\(\$/g;

function lineAt(source: PartSource, index: number): number {
  return source.bodyStartLine + source.part.body.slice(0, index).split('\n').length - 1;
}

function checkBody(source: PartSource, issues: Issue[]) {
  const { body } = source.part;
  const at = (index: number, level: Issue['level'], message: string) =>
    issues.push({ level, file: source.file, line: lineAt(source, index), message });

  const tokenRanges = scanFieldTokens(body).map((token) => [token.start, token.end]);
  for (const match of body.matchAll(SYNTAX_START)) {
    const index = match.index ?? 0;
    if (!tokenRanges.some(([start, end]) => index >= start && index < end)) {
      at(
        index,
        'warning',
        `"${match[0]}" で始まる記法として読めません（閉じかっこや「:」を確認してください）`
      );
    }
  }

  for (const match of body.matchAll(Z_TAG)) {
    const value = match[1];
    const parsed = value.match(/^\$(\w+):(.+)$/);
    if (!parsed) {
      at(match.index ?? 0, 'error', `z-tag は "$名前:h1|h2|h3" の形で書いてください（"${value}"）`);
      continue;
    }
    const invalid = parsed[2].split('|').filter((tag) => !VALID_Z_TAG_NAMES.includes(tag));
    if (invalid.length) {
      at(match.index ?? 0, 'error', `z-tag で使えないタグ名です: ${invalid.join(', ')}`);
    }
  }

  for (const match of body.matchAll(Z_FOR)) {
    if (!/^\s*\w+\s+in\s+\{@[^}]+\}\s*$/.test(match[1])) {
      at(
        match.index ?? 0,
        'error',
        `z-for は "変数名 in {@配列のパス}" の形で書いてください（"${match[1]}"）`
      );
    }
  }

  const slotsInBody = new Set([...body.matchAll(Z_SLOT)].map((match) => match[1]));
  for (const name of Object.keys(source.part.slots ?? {})) {
    if (!slotsInBody.has(name)) {
      issues.push({
        level: 'error',
        file: source.file,
        message: `情報の slots にある "${name}" が、テンプレートの z-slot にありません`
      });
    }
  }
}

/** パーツのフォルダを読んだ結果を検査する（ID の重複、スロット、記法の書き間違いなど） */
export function checkParts(build: PartsBuild): Issue[] {
  const issues: Issue[] = [];
  const firstFileById = new Map<string, string>();
  for (const source of build.sources) {
    const previous = firstFileById.get(source.part.id);
    if (previous) {
      issues.push({
        level: 'error',
        file: source.file,
        message: `パーツ ID "${source.part.id}" が重複しています（${previous} と同じ）`
      });
    } else {
      firstFileById.set(source.part.id, source.file);
    }
    checkBody(source, issues);
  }

  for (const source of build.sources) {
    for (const [name, config] of Object.entries(source.part.slots ?? {})) {
      for (const id of config.allowedParts ?? []) {
        if (!firstFileById.has(id)) {
          issues.push({
            level: 'warning',
            file: source.file,
            message: `スロット "${name}" の allowedParts にある "${id}" は、このフォルダにありません（ほかで登録しているなら問題ありません）`
          });
        }
      }
    }
  }

  for (const [category, types] of Object.entries(build.parts)) {
    const seen = new Set<string>();
    for (const type of types ?? []) {
      if (seen.has(type.id)) {
        issues.push({
          level: 'error',
          file: category,
          message: `タイプ ID "${type.id}" が重複しています`
        });
      }
      seen.add(type.id);
    }
  }
  return issues;
}
