import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { scanFieldTokens, VALID_Z_TAG_NAMES, type ValueFieldToken } from './field-syntax';

const root = resolve(__dirname, '../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

interface Snippet {
  scope: string;
  prefix: string;
  body: string;
  description: string;
}

const htmlData = JSON.parse(read('editor-support/vscode/zerocode.html-data.json')) as {
  globalAttributes: { name: string; references: { url: string }[] }[];
};
const snippets = JSON.parse(read('editor-support/vscode/zerocode.code-snippets')) as Record<
  string,
  Snippet
>;

/** VS Code のスニペットを、各プレースホルダーの初期値で展開した文字列にする */
function expand(body: string): string {
  let text = body;
  let previous;
  do {
    previous = text;
    text = text.replace(/\$\{\d+:([^${}]*)\}/g, '$1');
  } while (text !== previous);
  return text.replace(/\\\$/g, '$');
}

const byPrefix = (prefix: string) => {
  const snippet = Object.values(snippets).find((s) => s.prefix === prefix);
  if (!snippet) throw new Error(`snippet ${prefix} not found`);
  return expand(snippet.body);
};

describe('VS Code の HTML カスタムデータ', () => {
  it('テンプレートの制御属性をすべて含み、参照先の見出しが docs にある', () => {
    const names = htmlData.globalAttributes.map((attr) => attr.name).sort();
    expect(names).toEqual(['z-empty', 'z-for', 'z-if', 'z-slot', 'z-tag']);

    const docs = read('docs-template.html');
    for (const attr of htmlData.globalAttributes) {
      const anchor = attr.references[0].url.split('#')[1];
      expect(docs, attr.name).toContain(`id="${anchor}"`);
    }
  });
});

describe('VS Code のスニペット', () => {
  it('HTML 用で、prefix が重複しない', () => {
    const list = Object.values(snippets);
    expect(list.every((s) => s.scope === 'html')).toBe(true);
    expect(new Set(list.map((s) => s.prefix)).size).toBe(list.length);
  });

  it.each([
    ['zc-text', { fieldType: 'text', optional: false }],
    ['zc-textarea', { fieldType: 'textarea' }],
    ['zc-rich', { fieldType: 'rich' }],
    ['zc-image', { fieldType: 'image' }],
    ['zc-optional', { fieldType: 'text', optional: true }],
    ['zc-group', { fieldType: 'text', groupName: 'group' }],
    ['zc-required', { validation: { required: true } }],
    ['zc-max', { validation: { maxLength: 100 } }]
  ])('%s を展開すると、テンプレート記法として期待どおりに読める', (prefix, expected) => {
    const text = byPrefix(prefix);
    const tokens = scanFieldTokens(text);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].raw).toBe(text);
    expect(tokens[0] as ValueFieldToken).toMatchObject({ kind: 'value', ...expected });
  });

  it.each([
    ['zc-radio', { select: false, delimiter: '|' }],
    ['zc-checkbox', { select: false, delimiter: ',' }],
    ['zc-select', { select: true, delimiter: '|' }],
    ['zc-select-multiple', { select: true, delimiter: ',' }]
  ])('%s を展開すると、選択肢の記法として期待どおりに読める', (prefix, expected) => {
    const text = byPrefix(prefix);
    const tokens = scanFieldTokens(text);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].raw).toBe(text);
    expect(tokens[0]).toMatchObject({ kind: 'choice', ...expected });
  });

  it('制御属性とバックエンドデータのスニペットを展開した形', () => {
    expect(byPrefix('zc-data')).toBe('{@path}');
    expect(byPrefix('zc-data-default')).toBe('{@path:default}');
    expect(byPrefix('zc-if')).toBe('z-if="key"');
    expect(byPrefix('zc-empty')).toBe('z-empty="$field"');
    expect(byPrefix('zc-for')).toBe('z-for="item in {@items}"');
    expect(byPrefix('zc-slot')).toBe('z-slot="slotName"');

    const zTag = byPrefix('zc-tag');
    expect(zTag).toBe('z-tag="$tagName:h1|h2|h3"');
    const options = zTag.slice(zTag.indexOf(':') + 1, -1).split('|');
    expect(options.every((tag) => VALID_Z_TAG_NAMES.includes(tag))).toBe(true);
  });
});

describe('examples/lp の補完設定', () => {
  it('スニペットは editor-support の写しと同じ（記法を変えたら写し直す）', () => {
    expect(read('examples/lp/.vscode/zerocode.code-snippets')).toBe(
      read('editor-support/vscode/zerocode.code-snippets')
    );
  });
});
