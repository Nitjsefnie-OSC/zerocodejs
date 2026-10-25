# LP Example — 処理の流れ

このドキュメントでは、LP 例の「公開」「編集」「保存」がどのように動くかを流れで説明します。

---

## 1. 概要

- **公開側**: すべて SSR（サーバーで HTML を生成）。`/` や `/lp/feature/` にアクセスすると、サーバーが common + ページ用データをマージし、ZeroCode の SSR で HTML を組み立てて返します。
- **編集側**: 1 枚の `edit.html` を `/edit` および `/edit/:page` で共通利用。URL パスで編集中のページを決め、API でデータ取得・保存します。
- **データ**: `data/common.json`（共通）と `data/pages/:name/page.json`（ページ別）に分かれ、取得時にマージして使います。

---

## 2. URL とルーティング（server.js）

| パス                        | 処理                                                                             |
| --------------------------- | -------------------------------------------------------------------------------- |
| `GET /` / `GET /index.html` | トップの公開ページ。`serveSSR(req, res)` → ページ名は `default`。                |
| `GET /lp/:name/`            | ページ別の公開。`serveSSR(req, res, req.params.name)`。                          |
| `GET /lp/:name`             | トレイリングスラッシュなし → 301 で `/lp/:name/` へ。                            |
| `GET /edit.html`            | 旧 URL。`?page=xxx` があれば `/edit/xxx`、なければ `/edit` へ 301 リダイレクト。 |
| `GET /edit`                 | 管理画面（トップ＝default の編集）。`edit.html` をそのまま返す。                 |
| `GET /edit/:page`           | 管理画面（指定ページの編集）。同じく `edit.html` を返す。                        |
| `GET /api/pages`            | ページ名一覧。`listPageNames()` の結果を JSON で返す。                           |
| `GET /api/data?page=xxx`    | 指定ページのマージ済みデータを JSON で返す。                                     |
| `POST /api/save`            | 編集画面からの保存。body の `target` / `data` / `page` に従い JSON を書き込む。  |

静的ファイル（`/css/`, `/js/`, `/dist/` など）は `express.static` で配信。`/edit` と `/edit/:page` は静的より前に定義されているため、こちらが優先されます。

**認証**: 環境変数 `EDIT_USER` と `EDIT_PASSWORD` を両方設定している場合、上記の管理画面と API（`/edit.html`, `/edit`, `/edit/:page`, `/api/pages`, `/api/data`, `/api/save`, `/api/reset`）が Basic 認証で保護されます。公開ページ（`/`, `/lp/:name/`）は対象外です。

---

## 3. データの構成

### 3.1 ファイル配置

```
parts/                   # パーツのファイル（正本）。scripts/parts.mjs で data/built/ にまとめる
├── site/common/...      # 共通パーツ
└── pages/<名前>/individual/...  # ページ用のパーツ
data/
├── built/               # parts/ からまとめた JSON（自動生成。git には含めない）
│   ├── site.json
│   └── pages/<名前>.json
├── common.json          # 共通: 共通画像など
├── default-store.json   # 初期化用シード（common・default が無いときの元データ）
└── pages/
    ├── default/
    │   └── page.json    # トップ用: page, css, images など
    ├── campaign/
    │   └── page.json    # キャンペーン用
    └── feature/
        └── page.json    # 特集用
```

### 3.2 マージの考え方（buildMergedData）

- `loadOrInitCommon()` で `common.json` を読む（無ければ初期化）。
- `loadOrInitPage(pageName)` で `data/pages/:name/page.json` を読む（無ければ default 用などで初期化）。
- 返すオブジェクトは **common の css/parts/images と、ページの page / css / parts / images を組み合わせた形**です。
  - `parts.common` は `data/built/site.json` から、`parts.individual` は `data/built/pages/<名前>.json` から（まとめた JSON がないときだけ、common.json / page.json に保存したパーツを使う）。

このマージ結果が「1 ページ分の ZeroCode 用ストア」として、公開 SSR と編集画面の API の両方で使われます。

---

## 4. 公開ページ（SSR）の流れ

```
ブラウザ: GET / または GET /lp/feature/
    ↓
server.js: app.get('/') または app.get('/lp/:name/')
    ↓
serveSSR(req, res, pageName)
```

1. **ページ名の決定**  
   `pageName` が渡っていなければ `default`、渡っていれば `normalizePageName(pageName)`（`/lp/feature/` → `feature`）。

2. **存在チェック**  
   `pageExists(name)` で `data/pages/:name/page.json` の有無を確認。存在しないかつ default でない場合は 404。

3. **データの組み立て**  
   `buildMergedData(name)` で common + そのページの page.json をマージ。

4. **HTML 生成**
   - ZeroCode の SSR: `renderToHtml(store, { enableEditorAttributes: false })` で本文 HTML を生成。
   - `buildStyleTags(store.css)` で CSS 用 link などを生成。
   - `editLink`: 表示ページが default なら `/edit`、それ以外なら `/edit/:name`（編集画面へ・管理画面で編集のリンク先）。

5. **テンプレート埋め込み**  
   `ssrTemplate` の `{{PAGENAME}}` / `{{EDIT_LINK}}` / `{{STYLES}}` / `{{CONTENT}}` を置換し、完成した HTML を返却。

結果として、表示中のページに応じた「編集画面へ」リンク（`/edit` または `/edit/feature` など）が入った HTML が返ります。

---

## 5. 管理画面（edit）の流れ

### 5.1 アクセス時（/edit または /edit/feature など）

```
ブラウザ: GET /edit または GET /edit/feature
    ↓
server.js: app.get('/edit') または app.get('/edit/:page')
    ↓
public/edit.html をそのまま送信（中身は同じ 1 ファイル）
```

- どの URL でも同じ `edit.html` が返り、**ページの切り替えはすべてクライアント側（パスと API）**で行います。

### 5.2 クライアント側の初期化（edit.html 内スクリプト）

1. **zcode-editor の準備**  
   `customElements.whenDefined('zcode-editor').then(init)` でエディタ利用可能後に `init()` を実行。

2. **init()**
   - `ZeroCodeApi.setupApiSaveListeners()` で保存ボタン押下時の `save-request` → `/api/save` 送信を紐付け。
   - `loadPages()` を実行し、続けて `loadData()` で現在ページのデータを読み込む。

3. **loadPages()**
   - `GET /api/pages` でページ名一覧を取得。
   - セレクトボックスに「トップ」「キャンペーン」「特集」などを生成。
   - **getPage()**: `location.pathname` を正規表現で解析。
     - `/edit` または `/edit/` → `'default'`
     - `/edit/feature` → `'feature'`
   - 一覧にないページ名（例: `/edit/unknown`）の場合は `page = 'default'` にし、続く `setPage(page, true)` で URL を `/edit` に書き換え。
   - `setPage(page, true)` で URL を更新し、ページ用 CSS の link（`/css/pages/:page.css`）や「公開ページを表示」リンク、保存先表示を更新。

4. **loadData()**
   - `getPage()` で現在のページ名を取得。
   - `GET /api/data?page=xxx` でマージ済みデータを取得。
   - `ZeroCodeApi.applyDataToComponent(editor, data)` で `zcode-editor` に `page` / `parts` / `images` / `css` などを流し込み。

### 5.3 ページ切り替え（セレクト変更）

- `pageSelect.addEventListener('change', ...)` で、選択値を `setPage(page, false)` に渡す。
  - `replace: false` のため **pushState** で URL を `/edit` または `/edit/:page` に更新（履歴に残る）。
- 続けて `loadData()` でそのページのデータを再取得し、エディタに反映。

### 5.4 ブラウザの戻る・進む（popstate）

- `window.addEventListener('popstate', ...)` で、戻る／進むによる URL 変更を検知。
- `syncSelectFromPath()` でパスからページ名を求め、セレクトの表示を合わせる。
- `setPage(getPage(), true)` で UI（CSS リンク・公開リンクなど）を更新し、`loadData()` でそのページのデータを再取得。

---

## 6. 保存の流れ

1. ユーザーが管理画面で「保存」をクリック。
2. `zcode-editor` が **save-request** イベントを発火（`detail` に `requestId` / `targets` など）。
3. **zerocode-api.js** の `setupApiSaveListeners` で登録したリスナーが実行される。
   - `component.getData()` で現在の編集データを取得。
   - `detail.targets` に含まれる各 `target`（例: `page`, `parts-individual`, `images-individual`）ごとに、`getDataForTarget(fullData, target)` で保存対象のデータを取り出す。
   - 編集中のページは `component.getAttribute('data-current-page')` で取得（`setPage()` で設定している値）。
4. 各 target ごとに **POST /api/save** を呼び出す。  
   body: `{ target, data, page }`（`page` は default / campaign / feature など）。
5. **server.js の app.post('/api/save')** で受信。
   - `parts/` のファイルで管理しているカテゴリのパーツ（`parts-common` / `parts-individual` とその CSS）は、409 を返して保存しない（正本はファイル）。
   - `target` に応じて書き込み先を決定（common か、該当ページの page.json か）。
   - `targetToKeys(target)` で `['parts','individual']` のようなキーを得て、既存 JSON を読んで該当箇所だけ更新し、書き戻す。
6. 保存結果に応じて、クライアント側で **save-result** イベントを発火（成功／失敗と errors を `detail` に含める）。エディタがメッセージ表示などに利用します。

---

## 7. 流れの整理（図）

```
[公開ページ]
  ブラウザ → GET / または /lp/:name/
    → serveSSR
    → buildMergedData(name)  ← common + pages/:name/page.json
    → renderToHtml(store)    ← ZeroCode SSR
    → テンプレートに {{PAGENAME}}, {{EDIT_LINK}}, {{STYLES}}, {{CONTENT}} を埋め込み
    → HTML 返却

[管理画面]
  ブラウザ → GET /edit または /edit/:page
    → edit.html を返す（常に同じファイル）

  edit.html 読み込み後:
    → getPage() で pathname からページ名取得
    → loadPages(): GET /api/pages → セレクト生成、setPage(page, true)
    → loadData(): GET /api/data?page=xxx → applyDataToComponent(editor, data)
    → セレクト変更時: setPage(..., false) + loadData()
    → popstate 時: syncSelectFromPath() + setPage(getPage(), true) + loadData()

[保存]
  保存ボタン → save-request
    → getData() / getDataForTarget() で送信データ作成
    → POST /api/save { target, data, page }  (data-current-page を page に使用)
    → サーバーが common または pages/:page/page.json を更新
    → save-result で結果をエディタに通知
```

---

## 8. 関連ファイル一覧

| ファイル                       | 役割                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **server.js**                  | ルーティング、API（/api/pages, /api/data, /api/save, /api/upload, /api/media）、SSR（serveSSR, buildMergedData）、edit.html 配信、旧 edit.html のリダイレクト。 |
| **public/edit.html**           | 管理画面の HTML。getPage / setPage / loadPages / loadData、popstate、セレクト変更の処理。画像のアップロード・メディアの一覧の `hooks`。                         |
| **parts/**                     | パーツのファイル（正本）。                                                                                                                                      |
| **scripts/parts.mjs**          | `parts/` を `data/built/` の JSON にまとめる（`--watch` / `--check`）。                                                                                         |
| **scripts/dev.mjs**            | パーツを監視しながらサーバーを起動する（`npm run dev`）。まとめ直すと `/api/parts-events` で開いている画面に知らせ、管理画面はパーツだけを差し替える。          |
| **public/js/zerocode-api.js**  | データのエディタへの適用（applyDataToComponent）、save-request を受け /api/save 呼び出しと save-result 発火。                                                   |
| **data/common.json**           | 共通データ。                                                                                                                                                    |
| **data/pages/:name/page.json** | ページ別データ。                                                                                                                                                |

この構成により、コーポレートサイトやポータルサイトでも「パスでページを分ける編集画面」と「common + ページ別データのマージ」を同じ仕組みで利用できます。
