// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  findDisallowedRichTextLinks,
  sanitizeUrl,
  sanitizePartTemplate,
  sanitizeRichText
} from './sanitize';

describe('sanitizeUrl', () => {
  it('通常のURLはそのまま返す', () => {
    expect(sanitizeUrl('https://example.com/page')).toBe('https://example.com/page');
    expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
  });

  it('危険なスキームは空文字を返す', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('JavaScript:alert(1)')).toBe('');
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
    expect(sanitizeUrl('file:///etc/passwd')).toBe('');
  });

  it('制御文字によるスキーム偽装を拒否する', () => {
    expect(sanitizeUrl('java\tscript:alert(1)')).toBe('');
    expect(sanitizeUrl('java\nscript:alert(1)')).toBe('');
    expect(sanitizeUrl('java\rscript:alert(1)')).toBe('');
    expect(sanitizeUrl('da\tta:text/html;base64,PHNjcmlwdD4=', 'embed')).toBe('');
  });

  it('URL中の制御文字は除去して返す', () => {
    expect(sanitizeUrl('https://example.com/pa\tth')).toBe('https://example.com/path');
  });

  it('空文字・不正な入力は空文字を返す', () => {
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl(null as unknown as string)).toBe('');
    expect(sanitizeUrl(undefined as unknown as string)).toBe('');
  });

  describe('data URL', () => {
    const pngDataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const svgDataUrl = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';

    it('ラスター画像の data URL はどのコンテキストでも許可する', () => {
      expect(sanitizeUrl(pngDataUrl)).toBe(pngDataUrl);
      expect(sanitizeUrl(pngDataUrl, 'navigation')).toBe(pngDataUrl);
      expect(sanitizeUrl(pngDataUrl, 'embed')).toBe(pngDataUrl);
      expect(sanitizeUrl('data:image/jpeg;base64,AAAA', 'embed')).toBe(
        'data:image/jpeg;base64,AAAA'
      );
      expect(sanitizeUrl('data:image/webp;base64,AAAA')).toBe('data:image/webp;base64,AAAA');
    });

    it('SVG の data URL は embed（img src 等）でのみ許可する', () => {
      expect(sanitizeUrl(svgDataUrl, 'embed')).toBe(svgDataUrl);
      expect(sanitizeUrl(svgDataUrl, 'navigation')).toBe('');
      expect(sanitizeUrl(svgDataUrl)).toBe('');
    });

    it('画像以外の data URL はどのコンテキストでも拒否する', () => {
      expect(sanitizeUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe('');
      expect(sanitizeUrl('data:text/html;base64,PHNjcmlwdD4=', 'embed')).toBe('');
      expect(sanitizeUrl('data:application/javascript,alert(1)', 'embed')).toBe('');
    });

    it('MIMEタイプの偽装（区切り文字なし）は拒否する', () => {
      expect(sanitizeUrl('data:image/pngx;base64,AAAA', 'embed')).toBe('');
      expect(sanitizeUrl('data:image/svg+xmlfoo;base64,AAAA', 'embed')).toBe('');
    });
  });
});

describe('sanitizePartTemplate', () => {
  it('危険なタグ・イベントハンドラ属性を除去する', () => {
    const dirty = '<div onclick="alert(1)"><script>alert(1)</script>{$text:本文}</div>';
    const clean = sanitizePartTemplate(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('{$text:本文}');
  });

  it('z-* 制御属性とZeroCodeテンプレート記法は保持する', () => {
    const template =
      '<div z-if="show" z-tag="$tag:h1|h2" z-empty="$title" z-for="item in {@items}" z-slot="items">{$title:見出し}</div>';
    expect(sanitizePartTemplate(template)).toBe(template);
  });

  it('img/source の srcset に危険なスキームが含まれる場合は属性ごと除去する', () => {
    const dirty = '<img src="a.png" srcset="javascript:alert(1) 1x, b.png 2x">';
    const clean = sanitizePartTemplate(dirty);
    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('srcset');
    expect(clean).toContain('src="a.png"');
  });

  it('安全な srcset はそのまま保持する', () => {
    const safe = '<img src="a.png" srcset="b.png 1x, c.png 2x">';
    expect(sanitizePartTemplate(safe)).toBe(safe);
  });
});

describe('sanitizeRichText', () => {
  it('許可タグは残し script を除去する', () => {
    const clean = sanitizeRichText('<p>本文</p><script>alert(1)</script>');
    expect(clean).toContain('<p>本文</p>');
    expect(clean).not.toContain('<script>');
  });
});

describe('findDisallowedRichTextLinks', () => {
  it('許可した URL 以外のリンクを重複なしで返す', () => {
    const html =
      '<p><a href="/about">a</a><a href="https://evil.example/">b</a><a href="https://evil.example/">c</a></p>';
    expect(findDisallowedRichTextLinks(html, ['/about'])).toEqual(['https://evil.example/']);
  });

  it('すべて許可した URL なら空配列を返す', () => {
    expect(findDisallowedRichTextLinks('<p><a href="/about">a</a>text</p>', ['/about'])).toEqual(
      []
    );
  });

  it('無害化で外れる危険なリンクは対象にしない（公開表示でも描画されないため）', () => {
    expect(findDisallowedRichTextLinks('<p><a href="javascript:alert(1)">x</a></p>', [])).toEqual(
      []
    );
  });
});
