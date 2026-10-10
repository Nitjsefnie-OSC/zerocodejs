// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { processTemplateWithDOM } from './template-processor';
import type { ComponentData } from '../../types';

function render(
  html: string,
  values: Record<string, unknown>,
  enableEditorAttributes: boolean,
  backendData?: Record<string, unknown>
): string {
  const component: ComponentData = { id: 'c1', part_id: 'p1', ...values };
  return processTemplateWithDOM(
    html,
    component,
    '0',
    () => null,
    () => '',
    enableEditorAttributes,
    [],
    [],
    [],
    backendData
  );
}

describe('リッチテキストの無害化', () => {
  const malicious = '<p>本文<img src=x onerror=alert(1)><script>alert(2)</script></p>';

  it.each([
    ['編集モード', true],
    ['公開モード', false]
  ])('%sでもイベントハンドラ・script を除去する', (_label, editorMode) => {
    const out = render('<div>{$body:x:rich}</div>', { body: malicious }, editorMode);
    expect(out).not.toMatch(/onerror|<script|<img/i);
    expect(out).toContain('本文');
  });

  it('編集モードでもリッチテキストエディタが出力する書式・リンクは保持する', () => {
    const editorHtml =
      '<h2>見出し</h2><h3>小見出し</h3><h4>補足</h4><p><strong>太字</strong><em>斜体</em><s>取消</s><u>下線</u>m<sup>2</sup>H<sub>2</sub>O<br><a href="https://example.com" target="_blank" rel="noopener noreferrer">リンク</a></p><blockquote>引用</blockquote><hr><ul><li>項目</li></ul><ol><li>番号</li></ol>';
    const out = render('<div>{$body:x:rich}</div>', { body: editorHtml }, true);
    expect(out).toBe(`<div>${editorHtml}</div>`);
  });

  it.each([
    ['見出し', '<h2>t</h2><p>本文</p>'],
    ['リスト', '<ul><li>a</li></ul>'],
    ['引用', '<blockquote>q</blockquote>'],
    ['水平線', '<hr><p>a</p>']
  ])('%sで始まる値を段落で包まない', (_label, value) => {
    expect(render('<div>{$body:x:rich}</div>', { body: value }, false)).toBe(`<div>${value}</div>`);
  });

  it('タグのないテキストは段落で包む', () => {
    expect(render('<div>{$body:x:rich}</div>', { body: 'plain' }, false)).toBe(
      '<div><p>plain</p></div>'
    );
  });

  it('旧 Tiptap が保存した li 内の段落も保持する', () => {
    const legacyHtml = '<ul><li><p>項目</p></li></ul>';
    const out = render('<div>{$body:x:rich}</div>', { body: legacyHtml }, true);
    expect(out).toBe(`<div>${legacyHtml}</div>`);
  });

  it('リンクの javascript: スキームを除去する', () => {
    const out = render(
      '<div>{$body:x:rich}</div>',
      { body: '<p><a href="javascript:alert(1)">x</a></p>' },
      true
    );
    expect(out).not.toMatch(/javascript:/i);
  });
});

describe('URL 属性の最終値検査', () => {
  it('svg の xlink:href も URL として検査する', () => {
    const out = render(
      '<svg><a xlink:href="{$link:#}"><text>x</text></a></svg>',
      { link: 'javascript:alert(1)' },
      false
    );
    expect(out).not.toMatch(/javascript:/i);
  });

  it('複数トークンの連結で javascript: を組み立てられない', () => {
    const out = render(
      '<a href="{$scheme:https}:{$rest:x}">l</a>',
      { scheme: 'javascript', rest: 'alert(1)' },
      false
    );
    expect(out).toBe('<a href="">l</a>');
  });

  it('URL プレースホルダー {key} の展開結果を検査する', () => {
    const out = render('<a href="{shop}">l</a>', {}, false, { shop: 'javascript:alert(1)' });
    expect(out).toBe('<a href="">l</a>');
  });

  it('z-tag で置き換えた要素でも検査する', () => {
    const out = render(
      '<div z-tag="$tag:div|p"><a href="{$a:x}{$b:y}">l</a></div>',
      { tag: 'p', a: 'javascript', b: ':alert(1)' },
      false
    );
    expect(out).toBe('<p><a href="">l</a></p>');
  });

  it('z-for で複製した要素でも検査する', () => {
    const out = render(
      '<ul><li z-for="item in {@items}"><a href="{item.s}:{item.p}">l</a></li></ul>',
      {},
      false,
      {
        items: [{ s: 'javascript', p: 'alert(1)' }]
      }
    );
    expect(out).toBe('<ul><li><a href="">l</a></li></ul>');
  });

  it('安全な URL は変更せず、目印の属性を残さない', () => {
    const out = render(
      '<a href="https://example.com/{$path:top}?q={@q}">l</a>',
      { path: 'news' },
      true,
      { q: 'a' }
    );
    expect(out).toBe('<a href="https://example.com/news?q=a">l</a>');
  });

  it('テンプレート作者が直接書いた固定値は検査しない', () => {
    const out = render('<a href="javascript:void(0)">l</a>', {}, false);
    expect(out).toBe('<a href="javascript:void(0)">l</a>');
  });
});
