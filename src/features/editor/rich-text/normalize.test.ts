// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RICH_TEXT_FEATURES,
  RICH_TEXT_FEATURES,
  resolveRichTextFeatures
} from './features';
import type { RichTextFeature } from './features';
import { toEditorHtml, toOutputHtml, toPastedHtml } from './normalize';
import { ZWSP } from './dom';

const all = new Set<RichTextFeature>(RICH_TEXT_FEATURES);
const defaults = new Set<RichTextFeature>(DEFAULT_RICH_TEXT_FEATURES);

function output(html: string, features: ReadonlySet<RichTextFeature> = all): string {
  const root = document.createElement('div');
  root.innerHTML = html;
  return toOutputHtml(root, features);
}

describe('toOutputHtml', () => {
  it('ブラウザ固有のタグを意味を持つタグに揃え、style / class / id を除く', () => {
    expect(
      output(
        '<p><b>a</b><i>b</i><strike>c</strike><span style="color:red" class="x">d</span></p><hr id="null">'
      )
    ).toBe('<p><strong>a</strong><em>b</em><s>c</s>d</p><hr>');
  });

  it('リストを包む不正な段落（Chromium の出力）を外す', () => {
    const root = document.createElement('div');
    const p = root.appendChild(document.createElement('p'));
    p.appendChild(document.createElement('ul')).innerHTML = '<li>a</li>';
    expect(toOutputHtml(root, all)).toBe('<ul><li>a</li></ul>');
  });

  it('div の段落を p にし、末尾の br を取り除く', () => {
    expect(output('<div>a<br></div><div><br></div>')).toBe('<p>a</p><p></p>');
  });

  it('ZWSP を取り除き、空になったマークを消す', () => {
    expect(output(`<p>a<strong>${ZWSP}</strong>b</p>`)).toBe('<p>ab</p>');
  });

  it('内容が空なら <p></p> を返す', () => {
    expect(output('<p><br></p>')).toBe('<p></p>');
    expect(output('')).toBe('<p></p>');
  });

  it('余白として使う空段落を残す', () => {
    expect(output('<p>a</p><p><br></p><p>b</p>')).toBe('<p>a</p><p></p><p>b</p>');
  });

  it('引用の中の段落は引用ごとに分ける', () => {
    expect(output('<blockquote><p>a</p><p>b</p></blockquote>')).toBe(
      '<blockquote>a</blockquote><blockquote>b</blockquote>'
    );
  });
});

describe('機能の制限', () => {
  it('無効な機能のタグは内容を残して取り除く', () => {
    const features = new Set<RichTextFeature>(['bold']);
    expect(
      output(
        '<h2><em>t</em></h2><blockquote>q</blockquote><ul><li>a</li></ul><hr><p><a href="https://e.com/">l</a><strong>b</strong></p>',
        features
      )
    ).toBe('<p>t</p><p>q</p><p>a</p><p>l<strong>b</strong></p>');
  });

  it('デフォルトでは太字・取り消し線・リンク・リスト以外の書式を使わない', () => {
    expect(
      output(
        '<h3>h</h3><blockquote>q</blockquote><p>x<sup>2</sup><em>i</em><u>u</u><strong>b</strong><s>s</s></p><hr>',
        defaults
      )
    ).toBe('<p>h</p><p>q</p><p>x2iu<strong>b</strong><s>s</s></p>');
  });

  it('未知の機能名は無視し、指定がなければデフォルトを使う', () => {
    expect([...resolveRichTextFeatures(['bold', 'video'])]).toEqual(['bold']);
    expect([...resolveRichTextFeatures(undefined)]).toEqual([...DEFAULT_RICH_TEXT_FEATURES]);
    expect([...resolveRichTextFeatures([])]).toEqual([]);
  });
});

describe('toEditorHtml', () => {
  it('保存済みの危険な HTML を無害化してから読み込む', () => {
    const html = toEditorHtml('<p>a<img src=x onerror="alert(1)"><script>x()</script></p>', all);
    expect(html).toBe('<p>a</p>');
  });

  it('旧 Tiptap の li 内段落を項目の改行に変換し、空の段落に br を入れる', () => {
    expect(toEditorHtml('<ul><li><p>a</p><p>b</p></li></ul><p></p>', all)).toBe(
      '<ul><li>a<br>b</li></ul><p><br></p>'
    );
  });

  it('空の値は空段落にする', () => {
    expect(toEditorHtml('', all)).toBe('<p><br></p>');
  });
});

describe('toPastedHtml', () => {
  it('他サイトの HTML から書式だけを取り出す', () => {
    const html = toPastedHtml(
      {
        html: '<meta charset="utf-8"><h1 style="x">Title</h1><div><span style="font-weight:700"><b>bold</b></span> text</div><table><tr><td>cell</td></tr></table><img src="a.png">'
      },
      all
    );
    expect(html).toBe('<h2>Title</h2><p><strong>bold</strong> text</p><p>cell</p>');
  });

  it('危険なリンクはリンクを外して文字だけ残す', () => {
    expect(toPastedHtml({ html: '<a href="javascript:alert(1)" onclick="x">x</a>' }, all)).toBe(
      '<p>x</p>'
    );
  });

  it('入れ子のリストは平坦化する', () => {
    expect(toPastedHtml({ html: '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>' }, all)).toBe(
      '<ul><li>a</li><li>b</li><li>c</li></ul>'
    );
  });

  it('プレーンテキストは行ごとの段落にする', () => {
    expect(toPastedHtml({ text: 'a\r\nb' }, all)).toBe('<p>a</p><p>b</p>');
  });
});
