# LP Example（Express + JSON）

ZeroCode.js で LP を編集・公開する事例です。編集用の管理画面と、公開用の LP 表示を分け、**SSR のみ**で公開し、**ディレクトリ別の複数ページ**に対応しています。

パーツ（テンプレート）は **`parts/` のファイルで管理**します。開発者は手元のエディタでパーツを書き、運営者は管理画面でページを作ります（[パーツの作り方](#パーツの作り方ファイルで管理)）。

## 起動方法

1. リポジトリルートで ZeroCode をビルド: `npm run build`
2. このディレクトリで `npm install` のあと、サーバー起動: `npm run dev`（開発用。パーツをまとめ、`parts/` を保存するたびにまとめ直す。公開ページに dev 用 UI 表示）または `npm start`（本番想定。パーツをまとめてから起動、NODE_ENV=production、dev 用 UI 非表示）
3. ブラウザで `http://localhost:3000` を開く

## ページ構成

| URL                          | 用途                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/` または `/index.html`     | **公開LP（トップ）** — デフォルトページを SSR 表示                                                                          |
| `/lp/:name/`                 | **公開LP（ディレクトリ別）** — `data/pages/:name/page.json` を SSR 表示（`data/common.json` とマージ）                      |
| `/edit` または `/edit/:page` | **管理画面** — パスでページを指定して編集・保存（`zcode-editor`）。例: `/edit`（トップ）, `/edit/campaign`, `/edit/feature` |

- 公開LPは **SSR のみ**（クライアント用の静的 index.html はありません）。
- 管理画面は **URL パスでページを分離**（`/edit`＝トップ、`/edit/campaign`＝キャンペーン、`/edit/feature`＝特集）。ブックマーク・共有・ブラウザ戻るがそのまま使えます。ヘッダーのセレクトでページを切り替えると URL が変わり、**ページの追加**は `data/pages/<名前>/page.json` を用意するだけで一覧に反映されます。「公開ページを表示」は選択中のページの URL へリンクします。
- **パーツ**: 共通パーツ（CTA）は `parts/site/`、ページ用のパーツ（ヒーロー・セクション・カード等）は `parts/pages/:name/` のファイル。HTML 構造もページごとに変更可能。
- **ページの中身**: `data/pages/:name/page.json` の `page`（コンポーネント配列）と画像。共通画像は `data/common.json`。管理画面で保存すると更新されます。`data/default-store.json` は初期化用シード（common や default の page.json が無いときに参照）です。
- **CSS**: `public/css/style.css` は **共通の base のみ**（変数・リセット・`.container`・ボタン・dev 用ヘッダー/フッター）。**ページ用のコンポーネント（hero, section, reasons, faq, cta 等）は各ページの CSS に完全に定義**。`public/css/pages/default.css` / `campaign.css` / `feature.css` はそれぞれそのページ用のスタイルのみで完結し、style.css のコンポーネントには依存しない。公開・編集ともに base + 該当ページの 1 本を読み込む。
- 同梱サンプル: `default`（トップ）、`campaign`（キャンペーンLP）、`feature`（特集LP）。
- **処理の流れ**: 公開・編集・保存の詳細は [FLOW.md](./FLOW.md) を参照。

## パーツの作り方（ファイルで管理）

```
parts/
├── site/common/01-cta/            # 全ページ共通のパーツ（→ 管理画面の「共通」）
│   ├── _type.json                 # タイプの情報 { "id", "type", "description" }
│   └── 01-lp-part-cta.html        # 1パーツ＝1ファイル。先頭のコメントにパーツの情報（id は必須）
└── pages/
    ├── default/individual/...     # トップ用のパーツ（→ 管理画面の「個別」）
    ├── campaign/individual/...
    └── feature/individual/...
```

1. **書く**: `parts/` の `.html` を手元のエディタで編集します。このフォルダを VS Code で開くと、`.vscode/` の設定で `z-*` 属性の補完と `zc-` で始まるスニペット（`zc-text` → `{$field:default}` など）が使えます。
2. **確かめる**: `npm run dev` の間は、ファイルを保存するたびに `data/built/` の JSON が作り直されます。開いている管理画面には、そのまま反映されます（編集中・未保存のページの内容は残ります）。公開ページは自動で再読み込みされます。書き間違いはターミナルにファイル名と行番号つきで出ます（`npm run parts:check` で検査だけもできます）。
3. **ページを作る**: 運営者は管理画面（`/edit`）でパーツを並べ、文章・画像を入れて保存します。

- `parts/` を直下に置いているのは、このデモが1つのフォルダで完結しているためです。フォルダの場所と名前は自由なので、実際のプロダクトでは `zerocode/parts/` のようにまとめるのがおすすめです（ドキュメントの「はじめての組み込み」）。
- 新しいページのパーツのフォルダ（`parts/pages/<名前>/`）を足したときは、`npm run dev` を起動し直してください。
- 共通・個別のパーツはファイルが正本のため、管理画面のパーツ管理では表示とプレビュー（入力欄に値を入れて見た目を確かめる）だけができます（`config` の `studio.fileManagedCategories`）。共通・個別のパーツを API で保存しようとすると、409 を返します。
- パーツの CSS は `public/css/` に置いています（クラス名の付け方はサイトのルールに合わせる）。パーツと同じ名前の `.css` を `parts/` に置けば、データの CSS としてまとめることもできます。
- 実際のプロダクトでは、`scripts/parts.mjs` の代わりに `npx zerocodejs build-parts parts/site -o ...` のように、パッケージのコマンドを使います。このデモはリポジトリの中にあるため、ビルド済みの `dist/cli.mjs` を呼んでいます。

### 画像

管理画面で画像を追加すると、その時点で `POST /api/upload` に送り、`public/uploads/` に保存します（`edit.html` の `editor.hooks.uploadImage`）。画像管理と画像の選択画面の「メディアから選ぶ」には、`public/uploads/` の画像が出ます（`hooks.listImages` → `GET /api/media`）。受け付けるのは PNG / JPEG / GIF / WebP / AVIF の 5MB までです。

## API

- `GET /api/pages` — ページ名一覧（`['default', 'campaign', 'feature', ...]`。default / campaign / feature を先頭順で返し、それ以外はアルファベット順）
- `GET /api/data?page=default` — 指定ページの store 取得
- `POST /api/save` — body に `{ target, data, page? }`。`page` 省略時は default
- `POST /api/reset` — body に `{ page? }` で該当ページを初期化
- `POST /api/upload` — 本文に画像のファイル（`Content-Type` に画像の種類、`X-File-Name` にファイル名）。`{ ok, id, name, url }` を返す
- `GET /api/media` — `public/uploads/` の画像の一覧（`[{ id, name, url }]`）
- `GET /api/parts-events` — 開発時のみ。`data/built/` が変わると `parts` イベントを送る（Server-Sent Events）。管理画面はパーツと CSS を `setData` で差し替え、公開ページは再読み込みする

## 本番運用時の注意

- **管理画面の保護**: 環境変数 `EDIT_USER` と `EDIT_PASSWORD` を**両方**設定すると、管理画面（`/edit`, `/edit/:page`, `/edit.html`）および API（`/api/pages`, `/api/data`, `/api/save`, `/api/reset`, `/api/upload`, `/api/media`）が **Basic 認証**で保護されます。未設定の場合は認証なし（開発用）です。本番では必ず両方を設定してください。
  - 例: `EDIT_USER=admin EDIT_PASSWORD=your-secret node server.js`
  - 公開ページ（`/`, `/lp/:name/`）は認証の影響を受けません。
  - 本番では HTTPS の利用を推奨します。
- **公開ページの dev 用 UI**: `NODE_ENV=production` で起動すると、公開ページ（`/`, `/lp/:name/`）から **dev-header**（「編集画面へ」）と **dev-footer**（「管理画面で編集」）および dev.css が出力されません。開発時は `NODE_ENV` を未設定または `development` にすると表示されます。
