# Changelog

このプロジェクトの主な変更を記録します。形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に基づきます。

> **注意**: ベータ期間中は破壊的変更が予告なく入ることがあります。

## [未リリース]

### セキュリティ

- **DOMPurify を 3.4.17 に更新**（GHSA-cg2g-xh64-v4q7 ほか。いずれも `IN_PLACE` / `SAFE_FOR_TEMPLATES` / `PARSER_MEDIA_TYPE` を使う場合に成立し、ZeroCode の使い方では該当しないが、既知の脆弱性を含む版を使わないため更新）
- 開発用の Vue を 3.5.44 に更新（`@vue/server-renderer` の GHSA-g2v6-rqmx-r4w6）、`source-map-js` を 1.2.2 に更新
- Monaco 0.57.0 に同梱の DOMPurify 3.4.15 の脆弱性（上記と同種の5件）は、修正版の Monaco がまだないため、Monaco の使い方では成立しないことを確認したうえで CI の監査（`scripts/audit-monaco.mjs`）で Monaco 0.57.0 に限って例外にした。Monaco を更新すると例外は無効になる（その後 Monaco 自体を削除したため、この例外と監査スクリプトもなくなった）

### 変更

- **リッチテキストエディタを自前の実装に置き換え**（Tiptap への依存を削除）: 依存パッケージが13個減り、リッチテキストの遅延チャンクは約115KB→約10KB、CDN 用 UMD は約118KB（brotli）に。編集操作は Shadow DOM 内でも Chrome / Safari / Firefox で同じ結果になる。書式はタグで判定するため、見出しの中の太字が「太字の解除」になる等、表示中の CSS に出力が左右されることはない
- **リッチテキストの機能をプロダクトごとに選択**: config の `richText.features` で使える機能を指定できる。初期設定のツールバーは太字・取り消し線・リンク・箇条書き・番号付きリスト・元に戻す/やり直すに絞り、斜体・下線・水平線・見出し（h2〜h4）・引用・上付き・下付き・文字の装飾を解除するボタンは設定で追加する。初期設定にない書式（斜体・下線など）は、編集して保存したときに取り除かれる。リンクは「新しいタブで開く」を指定でき、`rel="noopener noreferrer"` を自動で付ける
- `sanitizeRichText` の許可リストに `h2` `h3` `h4` `blockquote` `sup` `sub` を追加
- **リンク先を候補に限定**: config の `richText.link` で、リンクの入力方式を `free`（自由入力）/ `select`（`backendData` で渡した候補からプルダウンで選ぶのみ）/ `both` から選べる。`select` では候補にないリンクを保存時に外す。サーバー側の検証用に `findDisallowedRichTextLinks` を export
- 機能 ID の一覧 `RICH_TEXT_FEATURES` とデフォルト `DEFAULT_RICH_TEXT_FEATURES`、型 `RichTextFeature` を export
- **パーツ管理のコード編集を Monaco からテキストエリアに変更**（`@monaco-editor/loader` / `monaco-editor` を削除）: パーツは手元のエディタで書いて貼り付ける運用を前提に、管理画面のコード欄は登録と小さな修正用にした。CDN（jsdelivr）から Monaco を読み込まなくなり、CDN に届かない環境でもパーツを編集できる。CSP で `cdn.jsdelivr.net`・`worker-src blob:`・`font-src data:` を許可する必要もなくなった。設定 `dev.enableTemplateSuggestions`（テンプレート記法の予測変換）は削除
- **peerDependencies の Vue を `^3.5.0` に修正**（従来は `^3.0.0` だったが、実際には Vue 3.5 で生成したコードと 3.4 以降の機能を使っており、古い Vue では動かなかった）。README・docs・examples の CDN の例を、開発用の `vue@3/dist/vue.global.js`（版の指定なし）から本番用の `vue@3.5/dist/vue.global.prod.js` に変更
- **lucide-vue-next を削除**し、使っている39個のアイコンの SVG を `src/core/icons/` に手元で持つように（lucide-vue-next が非推奨になり `@lucide/vue` への乗り換えが必要になったため。描画される SVG は同じ。lucide の `class`（`lucide` など）は付かなくなった）
- **動作環境**: リッチテキストの編集に Chrome 137 以降 / Firefox 142 以降 / Safari 17 以降が必要
- リッチテキストのツールバーを矢印キーで移動できるように（Tab で止まるのはツールバー内の1か所）。ボタンの title にショートカットを表示。Mac では Cmd のショートカットのみを使い、Ctrl+B などの標準のカーソル操作を妨げない
- `:readonly` / `:disabled` を付けたリッチテキストフィールドを編集できないように（従来は編集できた）
- **vue-i18n を削除し、翻訳を自前の小さな実装に置き換え**: 使っていたのは文言の取得・`{name}` の差し込み・ロケールの切り替えだけだったため。初期ロードが cms で約17KB、editor / studio で約17KB、CDN 用 UMD で約15KB 減る（brotli）。ビルド設定の `__VUE_I18N_*` / `__INTLIFY_*` は不要になった

### 修正

- 古いブラウザ（Safari 16 以前など）でリッチテキストの書式ボタンが反応しなかった問題に対応。書式の編集に対応していない旨を表示し、文字の入力はできるようにした
- リッチテキストの貼り付け・保存時の正規化で、ブロックを含むリンク、多段の入れ子リスト、空のリスト項目、空白だけの段落が、保存し直すたびに結果が変わる・構造が崩れることがあった問題を修正。カーソルがリスト項目の外を指す状態でリンクを挿入すると、リストの構造が崩れる問題も修正
- 見出し・リストなどのブロック要素で始まるリッチテキストの値が `<p>` で包まれ、前後に空の段落ができていた問題を修正
- リッチテキストエディタが、保存済みの値を読み込むときにも無害化するように（以前は Tiptap のスキーマに依存していた）

- 追加パネルのタイプタブ・カテゴリタブと編集パネルのグループタブで、タブが多いときに文字がタブに収まらず切れることがあった問題を修正（ホスト CSS やブラウザの違いでボタンの最小幅が 0 になる環境で発生）。タブは縮めずに横スクロールで表示する

## [1.0.1-beta.26] - 2026-09-26

### セキュリティ

- **Monaco エディタを 0.57.0 に更新**: Editor / Studio のパーツ管理で CDN から読み込む Monaco が、`@monaco-editor/loader` の既定で 0.55.1（脆弱性のある DOMPurify 3.2.7 を同梱）に固定されていたため、npm の `monaco-editor` と同じ 0.57.0（DOMPurify 3.4.15）を読み込むよう明示。両者の版の一致はテストで検査する
- **`monaco-editor` を devDependencies に移動**: Monaco は実行時に CDN から読み込むため、npm の `monaco-editor` は使われていなかった。`npm install zerocodejs` で入る容量が約 82MB 減る。CDN から読み込む版の脆弱性は CI（`scripts/audit-monaco.mjs`）で検査する。ホスト側で `monaco-editor` を直接使っている場合は、ホストの依存に追加すること
- **CSP の `unsafe-eval` を不要に**: vue-i18n が文言の変換に `new Function` を使っていたため、`unsafe-eval` を許可しない CSP の下で管理画面が描画できなかった問題を修正（vue-i18n の JIT コンパイルを有効化）

### ドキュメント

- 技術仕様書と docs に CSP の要件を追加
- 技術仕様書に「1.0 で安定させる範囲（草案）」を追加

### 変更

- **テンプレート記法をより柔軟に解釈**（編集パネルに出なかった・設定が無視されていた書き方を、書いた意図どおりに扱う）
  - デフォルト値を省略した `{$name}` を、空のデフォルト値のテキストフィールドとして扱う（従来は記法の文字がそのまま表示されていた）
  - グループなしのテキストフィールドで、デフォルト値に `.` を含むもの（例: `{$url:https://example.com}`）も編集パネルに表示し、デフォルト値で初期化する（従来は編集できず、描画も空になっていた）
  - 型の前のデフォルト値を省略した `{$f::rich}` / `{$f:rich}` を型付きフィールドとして扱う（従来はテキストとして扱われ、値がエスケープされて表示されていた）
  - 型の後ろに書いた validation（`{$f:既定:rich:required}`）も有効にする（従来は無視されていた）。**既存のテンプレートでこの書き方をしていた場合、必須チェックなどが効き始める**

### 追加

- **データ形式のバージョン**: `ZeroCodeData` に `version`（現在は `1`）を追加し、`ZERO_CODE_DATA_VERSION` と `migrateZeroCodeData()` を export。`version` が無い既存データは `1` とみなすため、既存データはそのまま使える。`getData()` の結果に `version` が含まれ、`setData(オブジェクト)` と `renderToHtml()` は受け取ったデータを現在の形式に移行してから使う。ライブラリより新しい `version` のデータには警告を出す

### 修正

- ESM から `zerocodejs/ssr` を使う場合に jsdom が自動で読み込まれず、ホスト側でグローバルの `DOMParser` / `window` を用意する必要があった問題を修正。Node.js 20.16+ / 22.3+ では `process.getBuiltinModule` 経由で jsdom を読み込み、その `window` を `DOMParser` と DOMPurify の両方に使う。従来どおりホスト側でグローバルを用意する方法も引き続き使える
- `package.json` の `repository.url` を npm の正規形式に修正（publish 時の自動修正の警告を解消）

## [1.0.1-beta.25] - 2026-09-25

> **1.0.1-beta.23 / 1.0.1-beta.24 は使用しないでください。** 公開手順の誤りにより、beta.23 に記載したセキュリティ修正が npm のパッケージに正しく含まれていませんでした。beta.25 はその内容を正しくビルドして公開したものです。

### 修正

- beta.23 に記載したセキュリティ修正（URL 属性の最終値検査・編集モードでのリッチテキスト無害化・DOMPurify 3.4.16 への更新）を含むパッケージを公開

### 変更

- `npm publish` 時に `prepublishOnly` で依存の整合性チェック（`npm run verify:deps` = `npm ls --omit=dev`）とビルドを必ず実行するよう変更。古い `dist` や、lockfile と異なる `node_modules`（例: 旧版の DOMPurify）のまま公開されることを防ぐ
- `CONTRIBUTING.md` にベータ版のリリース手順（メンテナー向け）を追加

## [1.0.1-beta.24] - 2026-09-25

> **使用しないでください（1.0.1-beta.25 以降を使用）。** 更新前の `node_modules` のままビルドしたため、既知の脆弱性がある DOMPurify 3.3.1 を同梱しています。コード上の修正（URL 属性の最終値検査・編集モードでのリッチテキスト無害化）は含まれています。

- 変更内容は 1.0.1-beta.23 と同じ

## [1.0.1-beta.23] - 2026-09-25

> **使用しないでください（1.0.1-beta.25 以降を使用）。** 公開されたパッケージは修正前のコードでビルドされており、以下のセキュリティ修正は含まれていません。

### セキュリティ

- **URL 属性をすべての展開後の最終値で検査**: `href="{$a}{$b}"` のような複数トークンの連結や、URL プレースホルダー `{key}` 経由で `javascript:` 等を組み立てられた問題を修正。`xlink:href` も検査対象に追加。危険な最終値は空文字になる（テンプレート作者が直接書いた固定値は従来どおり検査しない）
- **編集モードでもリッチテキストを無害化**: 改ざんされたページデータを Editor / Studio で開いた際にスクリプトが実行されうる問題を修正。許可リスト外のタグ・属性は編集画面のプレビューでも表示されなくなる（公開表示と同じ結果。保存データは変更しない）
- 依存パッケージを既知脆弱性の修正版へ更新: dompurify 3.4.16、@tiptap/\* 3.31.3、ws 8.21（jsdom 経由）、postcss / nanoid
- セキュリティモデル（信頼境界）を技術仕様書と docs に明記

### 追加

- **パーツマネージャーの `hiddenCategories` オプション**（`config.studio.hiddenCategories`）: 指定したカテゴリ（common/individual/special）をパーツマネージャーのタブ・一覧・追加/編集/削除/並べ替え操作から除外する。ホストアプリ側で特定カテゴリのパーツ定義をCMS外（コード管理等）で行いたい場合に使用（`usePartsManager`）
- パーツ管理タブのE2Eスモークテスト（タブ切替・一覧・編集モーダル・カテゴリ情報モーダル・Esc での多段クローズ）
- **モーダルのキーボードアクセシビリティ**: Esc で閉じる（重なったモーダルは最前面から・IME 変換取消は無視・Monaco 内は除外）、Tab のフォーカストラップ、開閉時のフォーカス移動/復元（`useModalA11y`）。保存確認ダイアログ・画像選択/編集・パーツ管理の各モーダルに適用

### 変更

- **ドキュメント・デモサイトを再構成**: docs を4ページ（はじめに / テンプレート記法 / 管理画面とAPI / バックエンド連携）に分割し横断検索と読者別ガイドを追加。index を日本語デフォルトに統一し、デモページに操作ガイドバナーと Studio / SSR / Light DOM への導線を設置
- `PartsManagerPanel.vue` の独立モーダル4つ（拡大プレビュー / CSS警告 / カテゴリ情報 / テンプレート記法ヘルプ）を子コンポーネントに分割（1,538行 → 1,321行。挙動は不変）
- **破壊的変更: jsdom を任意の peer 依存に変更**。SSR（`zerocodejs/ssr`）で使う場合は `npm install jsdom`（20 以上）が別途必要。ブラウザのみの利用では本番依存が 129 → 82 パッケージに減少
- 不要な `@types/dompurify` を依存から削除（DOMPurify 3 は型定義を同梱）
- README の「軽量」表記を計測値ベース（`zerocodejs/cms` 初期ロード 圧縮後約100KB）に修正
- CI に本番依存の脆弱性監査（`npm audit --omit=dev --audit-level=high`）を追加

### 修正

- SSR で DOMPurify を jsdom の window から初期化する（Next.js 等の SSR 環境で無害化が初期化できない問題）
- 日本語ロケールの未翻訳キー（`editor.saveFailed` 系・`partsManager.templateHelp` 系）を追加

## [1.0.1-beta.22] - 2026-07-06

### 追加

- バックエンドデータ参照のデフォルト値記法 `{@fieldName:defaultValue}`（データ未取得・パス不存在・null/undefined/空文字のときフォールバック）
- 専用画像のページスコープ（Phase 1）: `ImageData` の `scope` / `pageId`、`page-id` 属性、検証用 `test-cms-scope.html`
- 並べ替えパネルの D&D（SortableJS）と構造リスト、ミニマップ locate UX（ZC-5）
- 削除パネルに「削除後に次のパーツを選ぶ」オプション
- 画像選択モーダルに「全て」タブと常時追加ボタン
- 設定を初期値に戻す UI
- `sanitizeUrl` のテストを追加
- E2E テスト（Playwright）を導入: `zcode-cms` の「追加 → 編集 → 並べ替え → 保存イベント発火」スモークテストと CI の `e2e` ジョブ（`npm run test:e2e`）
- **軽量 `zerocodejs/cms` サブパスを追加**: `<zcode-cms>` のみを含むエントリ（初期ロード 圧縮後約100KB、フルバンドル比 約6割減）
- size-limit によるバンドルサイズの CI 監視（`npm run size`）

### 変更

- **テンプレートDSL処理系をパーサー方式に再設計**（内部リファクタリング、公開API・出力は不変）: フィールド記法のパースを `field-syntax.ts` の単一トークナイザに一元化し、`field-extractor` / `template-processor` の正規表現分岐複製（約30ブロック）を解消。キャラクタリゼーションテスト91件で出力の同一性を検証
- **ES ビルドをコード分割対応に変更**: Tiptap（リッチテキストエディタ）は初回利用時の遅延ロードに（約115KB）。UMD は従来どおり単一ファイル（CDN 互換維持、`vite.umd.config.ts`）
- **`sanitizeUrl` のセキュリティ強化**:
  - タブ・改行等の制御文字によるスキーム偽装（例: `java\tscript:`）を拒否
  - data URL は `href` / `action`（遷移先）ではラスター画像のみ許可し、SVG の data URL を拒否。`img` の `src` / `poster`（埋め込み先）では SVG も引き続き許可
  - シグネチャに `context: 'navigation' | 'embed'` 引数を追加（省略時は安全側の `navigation`）
- テンプレート処理の URL サニタイズ対象属性に `formaction` / `poster` を追加
- **rich フィールドを URL 属性（href 等）に展開する際も `sanitizeUrl` を通すよう修正**（従来はエスケープのみで `javascript:` スキームが素通しだった）
- UI 表記を「特別」から「専用」に統一
- 右クリックメニュー・パネルオプション UI を改善
- 画像選択モーダルのグリッドレイアウト・プレビュー・並べ替え表示を改善
- サイドパネルヘッダーの高さを統一

### 修正

- 表示モードからのモード切替を修正
- type-check エラーを修正

## [1.0.1-beta.21] - 2026-03-30

### 修正

- SSR: `getDOMParser` の分岐順と jsdom キャッシュを改善、`z-for` の document 依存を除去

## [1.0.1-beta.20] - 2026-03-29

### 追加

- `package.json` の exports に `./ssr` サブパスを追加（`import { renderToHtml } from 'zerocodejs/ssr'`）

### 変更

- フォーム系 UI のリセット CSS 耐性を `zcode-cms` に追加

## [1.0.1-beta.19] - 2026-03-29

### 変更

- `zcode-studio` を `zcode-editor` 同型シェルに再構成（ページ管理は CMS 同等、パーツ / 画像 / データビューアは専用系のみ）

## [1.0.1-beta.18] - 2026-03-22

### 追加

- SSR 用に CSS を出力する `renderCssToHtml` を追加
- Husky・lint-staged（pre-commit で ESLint / Prettier を実行）を導入

## [1.0.1-beta.17] - 2026-03-20

### 追加

- 制作会社向け `<zcode-studio>` コンポーネント（`save-request` の `source: 'studio'`）
- パーツテンプレート用サニタイズ関数 `sanitizePartTemplate`（npm から export、サーバーとルール共有可能）
- パーツ単位のアウトライン位置オプション（ヘッダーアイコン＋ポップオーバー）

### 変更

- 専用パーツ管理を `zcode-cms` / `zcode-editor` から分離し、`zcode-studio` に一元化

## 1.0.1-beta.16 以前（2026-01〜2026-02）

本ファイル導入前のため個別記録がありません。主な内容: 初回公開、i18n（日英 UI）、バリデーション記法、タグの動的変更（`z-tag`）、バックエンドデータ参照（`{@...}` / `z-for`）、選択肢記法の `ラベル=値` 対応、スマホ対応、パーツ管理のプレビュー連動・画像 ID 参照パネルなど。詳細は Git 履歴（`git log v1.0.1-beta.16` および各タグ）を参照してください。

[未リリース]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.26...HEAD
[1.0.1-beta.26]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.25...v1.0.1-beta.26
[1.0.1-beta.25]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.24...v1.0.1-beta.25
[1.0.1-beta.24]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.21...v1.0.1-beta.24
[1.0.1-beta.23]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.22...v1.0.1-beta.23
[1.0.1-beta.22]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.21...v1.0.1-beta.22
[1.0.1-beta.21]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.20...v1.0.1-beta.21
[1.0.1-beta.20]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.19...v1.0.1-beta.20
[1.0.1-beta.19]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.18...v1.0.1-beta.19
[1.0.1-beta.18]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.17...v1.0.1-beta.18
[1.0.1-beta.17]: https://github.com/atsumi-code/zerocodejs/compare/v1.0.1-beta.16...v1.0.1-beta.17
