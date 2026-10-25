// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { TypeData } from '../types';
import { parsePartFile, serializePartFile, PartFileError } from './part-file';
import { readPartsDir, writePartsDir } from './parts-dir';
import { checkParts } from './check';
import { initVscode, HTML_DATA_PATH } from './vscode';
import { main } from './index';

const EDITOR_SUPPORT = resolve(__dirname, '../../editor-support/vscode');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'zerocode-cli-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(path: string, text: string) {
  const full = join(dir, path);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, text);
}

const part = (meta: object, body: string) =>
  `<!--zerocode\n${JSON.stringify(meta, null, 2)}\n-->\n${body}\n`;

function run(argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(argv, {
    out: (text) => out.push(text),
    err: (text) => err.push(text),
    editorSupportDir: EDITOR_SUPPORT
  });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

describe('part-file', () => {
  it('先頭のコメントの情報と本体を読み、本体の開始行を返す', () => {
    const parsed = parsePartFile(part({ id: 'p1', slotOnly: true }, '<div>{$t:見出し}</div>'));
    expect(parsed.meta).toEqual({ id: 'p1', title: 'p1', description: '', slotOnly: true });
    expect(parsed.body).toBe('<div>{$t:見出し}</div>');
    expect(parsed.bodyStartLine).toBe(7);
  });

  it('情報がない・id がない・JSON が壊れている・知らない項目があるとエラー', () => {
    const errorOf = (text: string) => {
      try {
        parsePartFile(text);
      } catch (error) {
        return error as PartFileError;
      }
      throw new Error('no error');
    };
    expect(errorOf('<div></div>').message).toContain('<!--zerocode');
    expect(errorOf(part({ title: 'x' }, '<div></div>')).message).toContain('"id" は必須');
    expect(errorOf('\n\n<!--zerocode { "id": } -->\n<div></div>').line).toBe(3);
    expect(errorOf(part({ id: 'a', titel: 'x' }, '')).message).toContain('titel');
    expect(errorOf(part({ id: 'a', slots: { s: { allowedParts: 'x' } } }, '')).message).toContain(
      'allowedParts'
    );
  });

  it('先頭の BOM（Windows のエディタが付けることがある）は無視する', () => {
    const parsed = parsePartFile('\uFEFF<!--zerocode { "id": "b" } -->\n<p>x</p>\n');
    expect(parsed.meta.id).toBe('b');
    expect(parsed.body).toBe('<p>x</p>');
  });

  it('書き出した形を読み直すと同じパーツに戻る', () => {
    const original = {
      id: 'p1',
      title: '表',
      description: '説明',
      slots: { rows: { allowedParts: ['p2'] } },
      body: '<div z-slot="rows"></div>'
    };
    const parsed = parsePartFile(serializePartFile(original));
    expect({ ...parsed.meta, body: parsed.body }).toEqual(original);
  });
});

describe('readPartsDir / writePartsDir', () => {
  it('フォルダ名・ファイル名の番号順に読み、パーツの CSS に目印を付けて連結する', () => {
    write('parts/common/_category.css', '.base {}');
    write('parts/common/10-b/_type.json', '{ "id": "type-b", "type": "b" }');
    write('parts/common/10-b/01-x.html', part({ id: 'x' }, '<p>x</p>'));
    write('parts/common/2-a/_type.json', '{ "id": "type-a", "type": "a", "description": "A" }');
    write('parts/common/2-a/10-z.html', part({ id: 'z' }, '<p>z</p>'));
    write('parts/common/2-a/9-y.html', part({ id: 'y' }, '<p>y</p>'));
    write('parts/common/2-a/9-y.css', '.y {}');

    const build = readPartsDir(join(dir, 'parts'));
    expect(build.issues).toEqual([]);
    expect(build.parts.common?.map((type) => [type.id, type.parts.map((p) => p.id)])).toEqual([
      ['type-a', ['y', 'z']],
      ['type-b', ['x']]
    ]);
    expect(build.css.common).toBe('.base {}\n\n/* zerocode-part: y */\n.y {}');
    expect(build.parts.individual).toBeUndefined();
  });

  it('書き出して読み直すと、パーツと CSS が同じに戻る', () => {
    const parts: TypeData[] = [
      {
        id: 't1',
        type: 'layout',
        description: 'レイアウト',
        parts: [
          {
            id: 'section',
            title: 'section',
            description: '',
            slots: { contents: { allowedParts: ['item'] } },
            body: '<section z-slot="contents"></section>'
          },
          { id: 'item', title: 'item', description: '', slotOnly: true, body: '<p>{$t:item}</p>' }
        ]
      }
    ];
    const css = '.shared {}\n\n/* zerocode-part: item */\n.item {}';
    writePartsDir({ parts: { individual: parts }, css: { individual: css } }, join(dir, 'out'));
    expect(existsSync(join(dir, 'out/individual/01-layout/02-item.css'))).toBe(true);

    const build = readPartsDir(join(dir, 'out'));
    expect(build.parts.individual).toEqual(parts);
    expect(build.css.individual).toBe(css);
  });
});

describe('checkParts', () => {
  it('ID の重複、スロットの不一致、z-tag・z-for・記法の書き間違いを、ファイル名と行番号つきで返す', () => {
    write('p/common/01-t/_type.json', '{ "id": "t", "type": "t" }');
    write(
      'p/common/01-t/01-a.html',
      part(
        { id: 'dup', slots: { main: { allowedParts: ['nothing'] } } },
        '<div>\n  {$title:見出し\n  <h2 z-tag="$tag:h2|blink">x</h2>\n  <li z-for="items">x</li>\n</div>'
      )
    );
    write('p/common/01-t/02-b.html', part({ id: 'dup' }, '<p>b</p>'));

    const build = readPartsDir(join(dir, 'p'));
    const issues = checkParts(build).map((issue) => [
      issue.level,
      issue.file.split('/').pop(),
      issue.line,
      issue.message
    ]);
    // 情報のコメントが12行あるので、本体は13行目から
    const has = (level: string, file: string, line: number | undefined, text: string) => [
      level,
      file,
      line,
      expect.stringContaining(text)
    ];
    expect(issues).toEqual(
      expect.arrayContaining([
        has('error', '02-b.html', undefined, 'パーツ ID "dup" が重複'),
        has('warning', '01-a.html', 14, '"{$" で始まる記法として読めません'),
        has('error', '01-a.html', 15, 'z-tag で使えないタグ名です: blink'),
        has('error', '01-a.html', 16, 'z-for は "変数名 in {@配列のパス}"'),
        has('error', '01-a.html', undefined, '情報の slots にある "main"'),
        has('warning', '01-a.html', undefined, '"nothing" は、このフォルダにありません')
      ])
    );
    expect(issues).toHaveLength(6);
  });
});

describe('コマンド', () => {
  beforeEach(() => {
    write('parts/common/01-t/_type.json', '{ "id": "t", "type": "見出し" }');
    write('parts/common/01-t/01-h1.html', part({ id: 'h1' }, '<h1>{$text:見出し}</h1>'));
  });

  it('build-parts は { parts, css } を書き出し、check-parts は問題なしを返す', () => {
    const output = join(dir, 'out.json');
    expect(run(['build-parts', join(dir, 'parts'), '-o', output]).code).toBe(0);
    const json = JSON.parse(readFileSync(output, 'utf8'));
    expect(json.parts.common[0].parts[0]).toMatchObject({
      id: 'h1',
      body: '<h1>{$text:見出し}</h1>'
    });
    expect(Object.keys(json.parts)).toEqual(['common']);

    const check = run(['check-parts', join(dir, 'parts')]);
    expect(check.code).toBe(0);
    expect(check.err).toContain('問題ありません');
  });

  it('build-parts は書き出し先のフォルダがなければ作る', () => {
    const output = join(dir, 'zerocode/build/parts.json');
    expect(run(['build-parts', join(dir, 'parts'), '-o', output]).code).toBe(0);
    expect(existsSync(output)).toBe(true);
  });

  it('エラーがあると build-parts は書き出さずに 1 を返す', () => {
    write('parts/common/01-t/02-bad.html', '<p>情報なし</p>');
    const output = join(dir, 'out.json');
    const result = run(['build-parts', join(dir, 'parts'), '-o', output]);
    expect(result.code).toBe(1);
    expect(result.err).toContain('02-bad.html:1');
    expect(existsSync(output)).toBe(false);
  });

  it('split-parts は空でないフォルダには --force がないと書き出さない', () => {
    const data = join(dir, 'data.json');
    writeFileSync(
      data,
      JSON.stringify({ page: [], parts: { common: [] }, css: { common: '.a {}' } })
    );
    expect(run(['split-parts', data, '-o', join(dir, 'parts')]).code).toBe(1);
    expect(run(['split-parts', data, '-o', join(dir, 'parts'), '--force']).code).toBe(0);
    expect(readFileSync(join(dir, 'parts/common/_category.css'), 'utf8')).toBe('.a {}\n');
  });

  it('知らないコマンドやカテゴリは使い方を出して 1 を返す', () => {
    expect(run(['nope']).err).toContain('使い方');
    expect(run(['build-parts', join(dir, 'parts'), '--category', 'other']).code).toBe(1);
    expect(run(['--help']).out).toContain('build-parts');
  });
});

describe('init-vscode', () => {
  it('スニペットを置き、既存の settings.json に html.customData を足す', () => {
    write('app/.vscode/settings.json', '{ "editor.tabSize": 2 }');
    const result = initVscode(join(dir, 'app'), EDITOR_SUPPORT);
    expect(result.manualSetting).toBeUndefined();
    expect(existsSync(join(dir, 'app/.vscode/zerocode.code-snippets'))).toBe(true);
    const settings = JSON.parse(readFileSync(join(dir, 'app/.vscode/settings.json'), 'utf8'));
    expect(settings).toEqual({ 'editor.tabSize': 2, 'html.customData': [HTML_DATA_PATH] });

    initVscode(join(dir, 'app'), EDITOR_SUPPORT);
    const again = JSON.parse(readFileSync(join(dir, 'app/.vscode/settings.json'), 'utf8'));
    expect(again['html.customData']).toEqual([HTML_DATA_PATH]);
  });

  it('コメント付きの settings.json は書き換えず、手で足す1行を返す', () => {
    write('app/.vscode/settings.json', '{\n  // comment\n  "a": 1\n}');
    const result = initVscode(join(dir, 'app'), EDITOR_SUPPORT);
    expect(result.manualSetting).toContain(HTML_DATA_PATH);
    expect(readFileSync(join(dir, 'app/.vscode/settings.json'), 'utf8')).toContain('// comment');
  });
});
