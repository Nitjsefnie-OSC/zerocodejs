// ドキュメント横断検索インデックスの再生成スクリプト
// docs*.html の見出し（h2/h3/h4 の id 付き）を集めて public/js/docs-search-index.js を書き出す。
// docs ページの見出しを追加・変更したら `node scripts/build-docs-search-index.mjs` を実行すること。
import { readFileSync, writeFileSync } from 'node:fs';

const PAGES = [
  'docs.html',
  'docs-tutorial.html',
  'docs-template.html',
  'docs-api.html',
  'docs-backend.html'
];
const OUT = 'public/js/docs-search-index.js';

const stripTags = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();

const index = [];
for (const page of PAGES) {
  const html = readFileSync(page, 'utf-8');
  let currentH2 = '';
  for (const m of html.matchAll(/<(h[234]) id="([\w-]+)"[^>]*>([\s\S]*?)<\/\1>/g)) {
    const [, tag, id, raw] = m;
    const text = stripTags(raw);
    if (tag === 'h2') {
      currentH2 = text;
      index.push({ page, id, text, parent: '' });
    } else {
      index.push({ page, id, text, parent: currentH2 });
    }
  }
}

writeFileSync(
  OUT,
  '// 自動生成: ドキュメント横断検索インデックス（docs 5ページの h2/h3/h4）\n' +
    '// 再生成: node scripts/build-docs-search-index.mjs\n' +
    'window.__DOCS_SEARCH_INDEX__ = ' +
    JSON.stringify(index, null, 2) +
    ';\n'
);
console.log(`wrote ${OUT} (${index.length} entries)`);
