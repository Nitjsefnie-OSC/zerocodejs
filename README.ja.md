# ZeroCode.js

[![npm](https://img.shields.io/npm/v/zerocodejs)](https://www.npmjs.com/package/zerocodejs)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/atsumi-code/zerocodejs/actions/workflows/ci.yml/badge.svg)](https://github.com/atsumi-code/zerocodejs/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/website?down_message=offline&label=Demo&up_message=online&url=https%3A%2F%2Fatsumi-code.github.io%2Fzerocodejs%2F)](https://atsumi-code.github.io/zerocodejs/)

🌐 [English](./README.md)

シンプルに編集画面を。フレームワーク非依存のCMSフロントエンドライブラリ

ZeroCode.js は、既存 Web サービスに後付けできる埋め込み型 CMS ライブラリです。認証・永続化はホスト側、編集 UI は `<zcode-cms>` 等の Web Components。公開 HTML は開発者定義のパーツテンプレートから生成し、CMS 都合の DOM は挟みません。編集時のみ `data-zcode-*` を付与し、公開時は除去します。[詳細はドキュメント](./docs.html#about)

> **Status: Beta**
>
> ZeroCode.js は現在ベータ版です。仕様・API・データ形式は予告なく変更される可能性があります（破壊的変更を含む）。
> 不具合報告・改善提案・ユースケース共有・ドキュメントのズレの指摘を歓迎します。
>
> - **GitHub**: https://github.com/atsumi-code/zerocodejs
> - **Issues（バグ・要望）**: [https://github.com/atsumi-code/zerocodejs/issues](https://github.com/atsumi-code/zerocodejs/issues)
> - **Discussions（質問・意見）**: [https://github.com/atsumi-code/zerocodejs/discussions](https://github.com/atsumi-code/zerocodejs/discussions)
> - **Contributing**: [./CONTRIBUTING.md](./CONTRIBUTING.md)

> ⭐ **スターをお願いします**  
> このプロジェクトに共感していただけたら、[GitHub でスター](https://github.com/atsumi-code/zerocodejs)をいただけると励みになります。

## 特徴

- **フレームワーク非依存**: Web Componentsとして実装されているため、どのフレームワークでも使用可能
- **視覚的編集**: クリック操作でコンテンツを編集・追加・削除・並べ替え
- **パーツ管理**: 再利用可能なパーツを作成・管理
- **画像管理**: 画像のアップロード・管理機能
- **柔軟なテンプレート**: カスタムHTMLテンプレート構文で動的なコンテンツを定義
- **初期ロードが小さい**: `zerocodejs/cms` の初期ロードは圧縮後約87KB（リッチテキストエディタは遅延ロード）。Vue 3.5 以上を peer 依存として利用します

## デモ

**ライブデモ:** https://atsumi-code.github.io/zerocodejs/

![ZeroCode.js](public/images/hero-animation.gif)

## クイックスタート

### CDN（最も簡単）

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="https://unpkg.com/zerocodejs/dist/zerocodejs.css" />
  </head>
  <body>
    <zcode-editor></zcode-editor>

    <script src="https://unpkg.com/vue@3.5/dist/vue.global.prod.js"></script>
    <script src="https://unpkg.com/zerocodejs/dist/zerocode.umd.js"></script>
  </body>
</html>
```

これだけです！ブラウザでファイルを開いて、パーツの作成を始めましょう。

### npm

```bash
npm install zerocodejs
```

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="node_modules/zerocodejs/dist/zerocodejs.css" />
  </head>
  <body>
    <zcode-editor></zcode-editor>

    <script type="module">
      import 'zerocodejs';
    </script>
  </body>
</html>
```

### React

```jsx
import 'zerocodejs';
import 'zerocodejs/style.css';

function App() {
  return <zcode-editor />;
}
```

### Vue

```vue
<template>
  <zcode-editor />
</template>

<script setup>
import 'zerocodejs';
import 'zerocodejs/style.css';
</script>
```

### スタイルシートの読み込み順

**`zerocodejs/style.css`**（または `dist/zerocodejs.css`）は、**強いグローバルリセット（Tailwind の Preflight、`input { appearance: none }` など）より後に**読み込むことを推奨します。クラスは `zcode-` でスコープされますが、チェックボックス・ラジオ・`select` などネイティブ要素は広い `input` / `select` リセットの影響を受けることがあります。

## コンポーネント

### `<zcode-editor>`

エンジニア・デザイナー向けエディター。パーツ管理、画像管理、データビューアを含む全機能が利用可能。**はじめての方におすすめ。**

```html
<zcode-editor></zcode-editor>
```

### `<zcode-cms>`

エンドユーザー向けCMSエディター。編集・追加・削除・並べ替えのみ（パーツ管理・画像管理なし）。

```html
<zcode-cms></zcode-cms>
```

`<zcode-cms>` だけを使うページでは、専用エントリ **`zerocodejs/cms`** の import を推奨します。editor / studio とパーツ管理・画像管理の UI を含まないため初期ロードは圧縮後 約100KB で済みます（リッチテキストエディタは初回利用時に遅延ロード）。

```javascript
import 'zerocodejs/cms';
import 'zerocodejs/style.css';
```

### `<zcode-studio>`

**専用パーツを編集する画面**。担当するのは社内の開発者でも外部の制作会社でもかまいません。画面構成は **`zcode-editor` と同じ**（ページ管理・パーツ管理・画像管理・データビューア）。ページ管理は `zcode-cms` 相当の編集（共通/個別/専用のパーツ利用を含む）。パーツ・画像の管理タブとデータビューアのパーツ/画像表示は**専用カテゴリのみ**（共通・個別の切り替えはなし）。エンドユーザー用の `zcode-cms` と役割を分けたいときに使います。

`save-request` では `detail.source: 'studio'` と、タブ・表示に応じた `targets` が渡ります。`zcode-cms` からのページ保存は **`targets: ['page', 'images-special']`** です。永続化はホストアプリ側で処理してください。

詳細は [技術仕様書 – zcode-studio](./TECHNICAL_SPECIFICATION.md#zcode-studio)。

## サーバーサイドレンダリング（SSR）

**Node.js** や Next.js などでは、公式サブパス **`zerocodejs/ssr`** から `renderToHtml` / `renderCssToHtml` を import することを推奨します。Vue・Web Components を含まない軽量バンドル（`package.json` の `exports["./ssr"]`）です。テンプレート処理には **jsdom** が必要です。jsdom は任意の peer 依存のため、SSR で使う場合は別途 `npm install jsdom` してください（ブラウザのみで使う場合は不要です）。Node.js 20.16+ / 22.3+ では ESM からでも自動で読み込まれます。

```javascript
import { renderToHtml, renderCssToHtml } from 'zerocodejs/ssr';
```

従来どおり **`zerocodejs`** 本体から同じ関数を import することもできます。

## パーツをファイルで管理する

パーツはプロダクトのリポジトリで HTML ファイルとして書き（1パーツ＝1ファイル。先頭に `<!--zerocode { "id": ... } -->`）、コマンドでデータにまとめられます（Node 20 以上、依存なし）。

```bash
npx zerocodejs build-parts parts -o generated/zerocode-parts.json --watch
npx zerocodejs check-parts parts      # ID の重複、スロットの不一致、記法の書き間違い（ファイル名:行番号）
npx zerocodejs split-parts data.json -o parts   # 既存のデータをファイルに移す
npx zerocodejs init-vscode            # VS Code で z-* 属性とテンプレート記法を補完する
```

## 既存データの読み込み

既存データを読み込む場合は、JavaScriptで属性を設定します：

```javascript
const editor = document.querySelector('zcode-editor');
editor.setAttribute('page', JSON.stringify(pageData));
editor.setAttribute('parts-common', JSON.stringify(partsData));
editor.setAttribute('parts-individual', JSON.stringify(partsIndividualData));
editor.setAttribute('parts-special', JSON.stringify(partsSpecialData));
editor.setAttribute('images-common', JSON.stringify(imagesData));
// ... 必要に応じて他の属性も設定（images-individual, images-special など）
```

## ドキュメント

- **[はじめての組み込み](./docs-tutorial.html)**: インストールから最初のページの公開まで（図と手順つき。はじめての方はここから）
- [ドキュメント（ZeroCode.js とは）](./docs.html#about)
- [実装TODO](./TODO.md)（[Phase 5: ユーザーテスト反映 Issue 分割](./TODO.md#phase-5-ユーザーテスト反映zerocodejs-issue-分割)）
- [技術仕様書](./TECHNICAL_SPECIFICATION.md)
- [AI向けガイドライン](./AGENTS.md)

## なぜ ZeroCode.js？

- **編集したいところだけ、手軽にCMSにしたい人** — 更新したい箇所を決めれば、その部分だけ画面で編集できる仕組みを簡単に作れる
- **HTML・CSS・JavaScriptだけでやりたい人** — 余計なフレームワークを使わず、基本だけで作りたい人
- **フロントエンドの変化に疲れた人** — 毎年新しい技術が出てきて追いかけるのが大変な人
- **AI時代に、人にもAIにも扱いやすいコンテンツにしたい人** — テンプレートとデータがシンプルなので、人が編集しやすく、AIとも相性がよい

## 日本語コミュニティ

- GitHub Issues での日本語での質問・議論を歓迎します
- Issue は日本語でも英語でもOKです
- PR のコミットメッセージは英語推奨ですが、日本語の説明も歓迎します

## セキュリティ

ZeroCode.jsはフロントエンドライブラリのため、クライアント側での完全なセキュリティ保証はできません。

### 推奨事項

- **サーバー側での検証を必須とする**: データ保存前にサーバー側で検証してください
- **認証・認可の実装**: パーツデータの変更は認証されたユーザーのみ許可してください
- **送信元の検証**: `save-request`イベントの`source`フィールド（`cms` / `editor` / `studio`）を確認してください
- **パーツテンプレートの管理**: パーツテンプレートは信頼できるソースからのみ使用してください

詳細は[技術仕様書](./TECHNICAL_SPECIFICATION.md)のセキュリティセクションを参照してください。

## ライセンス

MIT License

---

**最終更新日**: 2026年6月
