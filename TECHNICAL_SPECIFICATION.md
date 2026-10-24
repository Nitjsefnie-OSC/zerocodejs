# ZeroCode.js 技術仕様書

> **このファイルの目的**: 外部向けの技術仕様書です。APIの詳細仕様、Web Componentsの使用方法、セキュリティに関する情報を提供します。

**AI開発時**: 実装の詳細は`AGENTS.md`を参照してください。このファイルは主に外部向けのドキュメントです。

## 概要

ZeroCode.jsは、フレームワーク非依存のWeb ComponentsベースのCMSエディターライブラリです。Vue.jsで実装されており、カスタムHTMLテンプレート構文を使用して動的なコンテンツ管理を提供します。

既存 Web サービスの認証・永続化・バックエンドデータをホスト側で担いながら、フロントエンドに後付けできる **埋め込み型 CMS ライブラリ** です。公開 HTML は開発者が定義したパーツテンプレートから生成され、CMS 都合の DOM は挟みません。編集時のみ `data-zcode-*` 等を付与し、公開レンダリング（`enableEditorAttributes: false`）では除去します。

プロダクトの位置づけ・設計方針・データの扱いの詳細は [ドキュメント – ZeroCode.js とは](./docs.html#about) を参照してください。

## アーキテクチャ

### コンポーネント構成

```
ZeroCodeEditor (エンジニア用管理画面)
├── ZeroCodeCMS (ユーザー用管理画面)
│   ├── Toolbar (ツールバー)
│   ├── PreviewArea (プレビューエリア)
│   ├── EditPanel (編集パネル)
│   ├── AddPanel (追加パネル)
│   ├── DeletePanel (削除パネル)
│   ├── ReorderPanel (並べ替えパネル)
│   └── SettingsPanel (設定パネル)
├── PartsManagerPanel (パーツ管理パネル)
├── ImagesManagerPanel (画像管理パネル)
└── DataViewer (データビューア)
```

### データ構造

#### ZeroCodeData

```typescript
interface ZeroCodeData {
  version?: number; // データ形式のバージョン（未指定は 1 とみなす）
  page: ComponentData[];
  css: {
    common?: string; // 共通パーツ用CSS
    individual?: string; // 個別パーツ用CSS
    special?: string; // 専用パーツ用CSS（内部キー special）
  };
  parts: {
    common: TypeData[];
    individual: TypeData[];
    special: TypeData[];
  };
  images: {
    common: ImageData[];
    individual: ImageData[];
    special: ImageData[];
  };
  backendData?: Record<string, any>; // バックエンドデータ
}
```

#### データ形式のバージョン（`version`）

- 現在のデータ形式は **`1`**（`ZERO_CODE_DATA_VERSION` として export）。`version` が無い既存データは `1` とみなす
- `getData()` の結果には `version` が含まれる。`setData(オブジェクト)` と `renderToHtml()` に渡したデータは、`migrateZeroCodeData()` で現在の形式に移行してから使われる
- ライブラリより新しい `version` のデータを渡すと、コンソールに警告を出してそのまま扱う（ライブラリの更新を促す）
- 将来データ形式を変える場合は、`version` を上げ、`src/core/utils/data-version.ts` の `MIGRATIONS` に移行処理を追加する
- **制約**: Web Component の属性（`page` / `parts-*` / `images-*`）で読み込むデータには `version` を渡す手段が無く、現在の形式として扱う。ホスト側でデータを保存する際は、将来の移行に備えて `getData().version` も併せて保存しておくことを推奨する

#### カテゴリ名（UI と内部キー）

- **UI 表示**: 共通 / 個別 / **専用**
- **内部キー**（JSON・Web Component 属性・`save-request` の target）: `common` / `individual` / **`special`**（例: `parts.special`, `images-special`, `parts-special-css`）

#### ComponentData

```typescript
interface ComponentData {
  id: string;
  part_id: string; // パーツID（タイトル変更時も紐付けが維持される）
  [key: string]: any;
  slots?: Record<string, ComponentData[] | SlotConfig>;
}
```

#### SlotConfig

```typescript
interface SlotConfig {
  allowedParts?: string[]; // 許可されるパーツID
  children?: ComponentData[]; // 子コンポーネント
}
```

#### TypeData

```typescript
interface TypeData {
  id: string; // タイプID（タイプ変更時も紐付けが維持される）
  type: string;
  description: string;
  parts: PartData[];
}
```

#### PartData

```typescript
interface PartData {
  id: string; // パーツID（タイトル変更時も紐付けが維持される）
  title: string;
  description: string;
  body: string;
  slots?: Record<string, { allowedParts?: string[] }>;
  slotOnly?: boolean; // スロット専用パーツ
}
```

#### ImageData

```typescript
interface ImageData {
  id: string;
  name: string;
  url: string;
  mimeType?: string; // MIMEタイプ（base64画像の場合）
  needsUpload?: boolean; // アップロードが必要かどうか
  scope?: 'shared' | 'page'; // 専用画像のみ
  pageId?: string; // scope が page のときのページ識別子
}
```

#### 専用画像のスコープ

`page-id` 属性を CMS に渡すと、専用画像（`images.special`）をページ単位で区別できます。

| `scope`           | 意味                        | 選択モーダル（page-id 指定時） |
| ----------------- | --------------------------- | ------------------------------ |
| 未指定 / `shared` | 全ページで選択可能          | 表示される                     |
| `page` + `pageId` | 当該 page-id の編集画面のみ | 一致する pageId のみ表示       |

- CMS から専用画像を追加すると、`page-id` 指定時は `{ scope: 'page', pageId }` が付与されます
- 画像管理タブ（Editor/Studio）からの追加は `scope: 'shared'`（page-id 未指定コンテキスト）
- 保存 target は従来どおり `images-special`
- レンダリング: 画像 ID 解決はプール全体を参照（スコープは選択 UI のみに効く）

**ホスト側の例**:

```html
<zcode-cms id="cms" page-id="post-123" page="..." images-special="..."></zcode-cms>
```

`save-request` の `images-special` には `scope` / `pageId` 付き JSON がそのまま含まれます。ホストはユーザー単位で1プールとして永続化してください。

## Web Components

### zcode-cms

ユーザー用管理画面のWebコンポーネント。

**属性**:

- `locale`: ロケール設定（デフォルト: `'ja'`）
- `page`: ページデータ（JSON文字列）
- `page-id`: 専用画像のページスコープ用 ID（記事 ID など）。指定時、画像選択モーダルでは shared + 当該 page-id の専用画像のみ表示し、追加時は `scope: 'page'` を付与
- `parts-common`: 共通パーツデータ（JSON文字列）
- `parts-individual`: 個別パーツデータ（JSON文字列）
- `images-common`: 共通画像データ（JSON文字列）
- `images-individual`: 個別画像データ（JSON文字列）
- `images-special`: 専用画像データ（JSON文字列）
- `css-common`: 共通パーツ用CSS（文字列）
- `css-individual`: 個別パーツ用CSS（文字列）
- `css-special`: 専用パーツ用CSS（文字列）
- `backend-data`: バックエンドデータ（JSON文字列）
- `config`: 初期設定データ（JSON文字列）。`{"cms": {...}, "dev": {...}}`の形式で指定。詳細は「設定オプション」セクションを参照
- `endpoints`: エンドポイント設定（JSON文字列）
- `use-shadow-dom`: Shadow DOMを使用するか（`'true'` | `'false'`）

**スロット**:

- `css`: CSSファイルを指定
- `script`: JavaScriptファイルを指定

**メソッド**:

- `getData(path?: string)`: データを取得
- `setData(path: string | object, value?: any)`: データを設定

**プロパティ**:

- `allowDynamicContentInteraction`: 動的コンテンツの動作を有効/無効にする（getter/setter）

**イベント**:

- `save-request`: 保存ボタンクリック時に発火（保存リクエスト）
- `save-result`: 保存処理完了時に発火（保存結果）
- `zcode-dom-updated`: DOMが更新されたときに発火

**使用例**:

```html
<zcode-cms id="cms" locale="ja">
  <link slot="css" rel="stylesheet" href="/css/common.css" />
  <script slot="script" src="/js/accordion.js"></script>
</zcode-cms>
```

### zcode-editor

エンジニア用管理画面のWebコンポーネント。

**属性**:

- `locale`: ロケール設定（デフォルト: `'ja'`）
- `page`: ページデータ（JSON文字列）
- `page-id`: ページ管理タブの CMS に渡す専用画像スコープ ID（`zcode-cms` と同義）
- `parts-common`: 共通パーツデータ（JSON文字列）
- `parts-individual`: 個別パーツデータ（JSON文字列）
- `images-common`: 共通画像データ（JSON文字列）
- `images-individual`: 個別画像データ（JSON文字列）
- `images-special`: 専用画像データ（JSON文字列）
- `css-common`: 共通パーツ用CSS（文字列）
- `css-individual`: 個別パーツ用CSS（文字列）
- `css-special`: 専用パーツ用CSS（文字列）
- `backend-data`: バックエンドデータ（JSON文字列）
- `config`: 初期設定データ（JSON文字列）。`{"cms": {...}, "dev": {...}}`の形式で指定。詳細は「設定オプション」セクションを参照
- `endpoints`: エンドポイント設定（JSON文字列）
- `enable-parts-manager`: パーツ管理を有効にするか（デフォルト: `true`）
- `enable-images-manager`: 画像管理を有効にするか（デフォルト: `true`）
- `use-shadow-dom`: Shadow DOMを使用するか（`'true'` | `'false'`）

**スロット**:

- `css`: CSSファイルを指定
- `script`: JavaScriptファイルを指定

**メソッド**:

- `getData(path?: string)`: データを取得
- `setData(path: string | object, value?: any)`: データを設定

**プロパティ**:

- `allowDynamicContentInteraction`: 動的コンテンツの動作を有効/無効にする（getter/setter）

**使用例**:

```html
<zcode-editor id="editor" locale="ja">
  <link slot="css" rel="stylesheet" href="/css/common.css" />
  <script slot="script" src="/js/accordion.js"></script>
</zcode-editor>
```

### zcode-studio

制作会社・信頼ユーザー向け管理画面のWebコンポーネント。**UI は `zcode-editor` と同型**（タブ: ページ管理・パーツ管理・画像管理・データビューア、ページ管理内の表示/管理トグルとツールバー）。**ページ管理**は `ZeroCodeCMS` と同一の編集体験（共通/個別/専用のパーツ利用を含む）。**パーツ管理・画像管理**は専用カテゴリのみ編集（共通/個別の切り替え UI なし）。**データビューア**はページ／専用パーツ／専用画像の表示と JSON/HTML 切替（共通・個別のカテゴリタブなし）。`view-mode-changed` イベントは `zcode-editor` と同様に発火する。

**属性**:

- `locale`: ロケール設定（デフォルト: `'ja'`）
- `page`: ページデータ（JSON文字列、**ページ編集タブで編集可能**）
- `page-id`: ページ管理タブの CMS に渡す専用画像スコープ ID
- `parts-common`: 共通パーツデータ（JSON文字列、読み取り専用）
- `parts-individual`: 個別パーツデータ（JSON文字列、読み取り専用）
- `parts-special`: 専用パーツデータ（JSON文字列、**編集可能**）
- `images-common`: 共通画像データ（JSON文字列、読み取り専用）
- `images-individual`: 個別画像データ（JSON文字列、読み取り専用）
- `images-special`: 専用画像データ（JSON文字列、**編集可能**）
- `css-common`: 共通パーツ用CSS（文字列、読み取り専用）
- `css-individual`: 個別パーツ用CSS（文字列、読み取り専用）
- `css-special`: 専用パーツ用CSS（文字列、**編集可能**）
- `backend-data`: バックエンドデータ（JSON文字列）
- `config`: 初期設定データ（JSON文字列）。`{"studio": {...}}`の形式で指定
- `endpoints`: エンドポイント設定（JSON文字列）
- `use-shadow-dom`: Shadow DOMを使用するか（`'true'` | `'false'`）

**スロット**:

- `css`: CSSファイルを指定
- `script`: JavaScriptファイルを指定

**メソッド**:

- `getData(path?: string)`: データを取得
- `setData(path: string | object, value?: any)`: データを設定

**イベント**:

- `save-request`: 保存ボタンクリック時に発火。`source: 'studio'`。`targets` は `zcode-editor` と同様にアクティブなタブとデータビューアの表示に応じて決まる（ページ管理 → `['page', 'images-special']`、専用パーツ → `['parts-special', 'parts-special-css']`、専用画像 → `['images-special']`、データビューアはページ／専用パーツ／専用画像のいずれを表示中かに応じて `page`+`images-special` または `parts-special`+CSS または `images-special`）

**config.studio オプション**:

- `showSaveConfirm`: 保存時の確認ダイアログを表示する（デフォルト: `true`）
- `sanitizePartTemplate`: パーツテンプレート保存時に DOMPurify ベースのサニタイズを実行する（デフォルト: `false`）
- `hiddenCategories`: 指定したカテゴリ（`'common' | 'individual' | 'special'` の配列）をパーツマネージャーから除外する。タブ・一覧に表示されず、追加・編集・削除・並べ替え関数もそのカテゴリに対しては何もしない（ガード済み）。ホストアプリ側で特定カテゴリのパーツ定義を別の手段（コード管理など）で行い、CMS上のGUI編集を禁止したい場合に使う

**使用例**:

```html
<zcode-studio id="studio" locale="ja" config='{"studio":{"sanitizePartTemplate":true}}'>
  <link slot="css" rel="stylesheet" href="/css/common.css" />
  <script slot="script" src="/js/accordion.js"></script>
</zcode-studio>
```

## 設定オプション

### 設定の構造

設定は`cms`、`dev`、`studio`の3つのカテゴリに分離されています。`zcode-cms`と`zcode-editor`の両方で編集モード（CMS）の設定は共有されます。`zcode-studio`は`studio`カテゴリの設定を使用します。

#### localStorageの構造

```json
{
  "cms": {
    "allowDynamicContentInteraction": false,
    "devRightPadding": false,
    "enableContextMenu": false
  },
  "dev": {
    "showDataViewer": false
  }
}
```

#### 初期設定（config属性）

`config`属性で初期設定を指定できます。JSON文字列として指定します。

```html
<zcode-cms
  config='{"cms": {"allowDynamicContentInteraction": true, "devRightPadding": true, "enableContextMenu": true}}'
></zcode-cms>

<zcode-editor
  config='{"cms": {"allowDynamicContentInteraction": true}, "dev": {"showDataViewer": true}}'
></zcode-editor>
```

または、JavaScript変数で指定することもできます：

```javascript
const cmsConfig = {
  cms: {
    allowDynamicContentInteraction: true,
    devRightPadding: true,
    enableContextMenu: true
  }
};

const cmsElement = document.getElementById('test-cms');
cmsElement.setAttribute('config', JSON.stringify(cmsConfig));
```

#### 設定の優先順位

1. **localStorage**: ユーザーが変更した設定（最優先）
2. **config属性**: 初期設定として指定された値
3. **デフォルト値**: 全て`false`

**動作フロー**:

- 初回起動時: `config`属性の値が初期値として使用される
- ユーザーが設定を変更: localStorageに保存される
- 次回起動時: localStorageの値が使用され、`config`属性は無視される

### CMS設定（`cms`）

`zcode-cms`と`zcode-editor`の両方で共有される設定です。

#### 設定項目

- **`allowDynamicContentInteraction`** (デフォルト: `false`)
  - アコーディオン、タブ、モーダル、リンクなどの動的コンテンツの動作を有効/無効にする
  - 設定パネルでは「ページの動作を有効にする」として表示

- **`devRightPadding`** (デフォルト: `false`)
  - 編集パネル表示時にコンテンツの右余白を追加する
  - 設定パネルでは「編集パネル分の余白をつける」として表示

- **`enableContextMenu`** (デフォルト: `false`)
  - 右クリックメニューを有効にする
  - 設定パネルでは「右クリックメニューを有効にする」として表示

- **`scrollIntoViewOnPartEdit`** (デフォルト: `true`)
  - `true` のとき、編集・追加・並べ替え・削除の各モードで、パーツ選択や関連操作（追加完了後の新パーツ、追加キャンセル時の元位置、並べ替え完了後の移動元、削除確認のキャンセル、編集パネル閉じるなど）に合わせてプレビュー内の該当要素へスクロールする
  - 設定パネルでは「パーツ選択時に該当箇所へスクロールする」として表示

### Dev設定（`dev`）

`zcode-editor`専用の設定です。

#### 設定項目

- **`showDataViewer`** (デフォルト: `false`)
  - データビューアを表示する
  - 設定パネルでは「データビューアを表示」として表示

### リッチテキスト設定（`richText`）

`zcode-cms` / `zcode-editor` / `zcode-studio` 共通。リッチテキストエディタのツールバーで使える機能を、プロダクトごとに選択できます。初期設定は、お知らせや紹介文でよく使う機能だけに絞っています。localStorage には保存されず、ユーザーが変更することはできません。

- **`features`** (デフォルト: `["bold", "strike", "link", "bulletList", "orderedList", "history"]`)
  - 有効にする機能 ID の配列。未知の ID は警告して無視する
  - 書式の機能を無効にすると、そのタグは貼り付け時とエディタの出力時に内容を残して取り除く（見出し・引用・無効なリストの項目は段落になる）
  - 「ボタンのみ」の機能は出力に影響せず、無効にしてもツールバーのボタンが消えるだけ

| 機能 ID          | 内容                                     | 出力タグ                   | デフォルト |
| ---------------- | ---------------------------------------- | -------------------------- | ---------- |
| `bold`           | 太字（Cmd/Ctrl+B）                       | `strong`                   | ✅         |
| `strike`         | 取り消し線（Cmd/Ctrl+Shift+X）           | `s`                        | ✅         |
| `link`           | リンク（Cmd/Ctrl+K、新しいタブ指定）     | `a`（href / target / rel） | ✅         |
| `bulletList`     | 箇条書き                                 | `ul` `li`                  | ✅         |
| `orderedList`    | 番号付きリスト                           | `ol` `li`                  | ✅         |
| `italic`         | 斜体（Cmd/Ctrl+I）                       | `em`                       |            |
| `underline`      | 下線（Cmd/Ctrl+U）                       | `u`                        |            |
| `horizontalRule` | 水平線                                   | `hr`                       |            |
| `heading`        | 見出し（h2〜h4）                         | `h2` `h3` `h4`             |            |
| `blockquote`     | 引用                                     | `blockquote`               |            |
| `superscript`    | 上付き                                   | `sup`                      |            |
| `subscript`      | 下付き                                   | `sub`                      |            |
| `history`        | 元に戻す・やり直すのボタン（ボタンのみ） | —                          | ✅         |
| `clearFormat`    | 文字の装飾を解除するボタン（ボタンのみ） | —                          |            |

段落・改行（`p` `br`）は常に使えます。元に戻す・やり直す（Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z）のショートカットは `history` を無効にしても使えます。文字の装飾の解除はリンク以外の装飾を外します。出力には `style` / `class` 属性を含めません（見た目はサイトの CSS で決める）。`target="_blank"` のリンクには `rel="noopener noreferrer"` を付けます。

```html
<zcode-cms
  config='{"richText": {"features": ["bold", "italic", "link", "bulletList", "heading", "history"]}}'
></zcode-cms>
```

機能 ID の一覧は `RICH_TEXT_FEATURES`、デフォルトは `DEFAULT_RICH_TEXT_FEATURES` として export しています。

#### リンクの入力方式（`richText.link`）

リンク先を、ホストが `backendData` で渡す候補に限定できます。どんな URL でも設定できる状態を避けたい場合に使います。

- **`mode`** (デフォルト: `"free"`)
  - `"free"`: URL を自由に入力する
  - `"select"`: 候補からプルダウンで選ぶのみ。URL は入力できない
  - `"both"`: 候補から選ぶか、「URL を直接入力」を選んで自由に入力する
- **`source`**: 候補の配列を指す `backendData` のパス（`{@...}` と同じ書き方。例: `"site.links"`）。`mode` が `select` / `both` のときに必須

候補の各項目は `{ "label": "表示名", "url": "/about", "newTab": false }` の形式です。`label` と `url` が文字列でない項目と、`sanitizeUrl` で拒否される URL は無視します。「新しいタブで開く」は候補の `newTab` で決まり、利用者は変更できません（`both` の自由入力時のみ選べる）。キャレットだけの状態で候補を選ぶと、`label` をリンクの文字として挿入します。

```html
<zcode-cms
  config='{"richText": {"link": {"mode": "select", "source": "site.links"}}}'
  backend-data='{"site": {"links": [{"label": "会社概要", "url": "/about"}, {"label": "公式 SNS", "url": "https://sns.example.com/", "newTab": true}]}}'
></zcode-cms>
```

- `select` では、候補にない URL のリンクを、読み込み・貼り付け・保存時に外す（文字は残す）。候補にある URL のリンクには、候補の `newTab` を適用する（`both` でも同様）
- `backendData` を `endpoints` などで後から渡す場合、候補を受け取るまでは制限せず、`select` ではリンクボタンを表示しない（読み込み前の編集でリンクが消えないようにするため）
- `select` で候補が空配列のときは、リンクボタンを表示せず、既存のリンクはすべて外す

**サーバー側の検証**: この制限はエディタの UI による制限です。開発者ツール等で保存データを直接書き換えることはできるため、リンク先を確実に制限するには、保存を受け付けるサーバー側で `findDisallowedRichTextLinks`（「サニタイズ関数」を参照）を使い、同じ候補で検証してください。

**注意**: `features` はエディタの UI を制限するもので、サニタイズ（`sanitizeRichText`）の許可リストには連動しません。公開表示・SSR では config を参照しないため、許可リストは常に上の表のタグ全体です。

**動作環境**: Shadow DOM 内の選択範囲の取得に `Selection.getComposedRanges` を使うため、リッチテキストの書式の編集には Chrome 137 以降 / Firefox 142 以降 / Safari 17 以降が必要です。それより古いブラウザでは、ツールバーの代わりに「このブラウザでは書式の編集に対応していません」という案内を表示し、文字の入力だけができます（書式のキー操作・貼り付け・元に戻すはブラウザ標準の動作になり、保存時に正規化されます）。Light DOM（`use-shadow-dom="false"`）では制限はありません。

### 画像のファイルの条件（`images`）

画像を追加・差し替えるときのファイルの条件。条件に合わないファイルは、アップロードする前に止めて理由を表示する。

- **`accept`**（デフォルト: `"image/*"`）: input の `accept` と同じ書き方（`"image/png,image/jpeg"`、`".png,.jpg"` など）
- **`maxSize`**: 最大サイズ（バイト）。未指定は制限なし

```html
<zcode-cms
  config='{"images":{"accept":"image/png,image/jpeg,image/webp","maxSize":5000000}}'
></zcode-cms>
```

### 設定モーダル

#### ツールバー用設定（ZeroCodeCMS）

`SettingsPanel`に`mode="toolbar"`を指定した場合に表示される設定：

- **ページの動作を有効にする**: `allowDynamicContentInteraction`の設定
- **編集パネル分の余白をつける**: `devRightPadding`の設定
- **右クリックメニューを有効にする**: `enableContextMenu`の設定
- **パーツ選択時に該当箇所へスクロールする**: `scrollIntoViewOnPartEdit`の設定

#### dev-tabs用設定（ZeroCodeEditor）

`SettingsPanel`に`mode="dev-tabs"`を指定した場合に表示される設定：

- **データビューアを表示**: `showDataViewer`の設定

### 設定の型定義

```typescript
interface CMSSettings {
  allowDynamicContentInteraction?: boolean;
  devRightPadding?: boolean;
  enableContextMenu?: boolean;
  scrollIntoViewOnPartEdit?: boolean;
  showPartDiscoveryOutlines?: boolean;
  showAddBetweenButtons?: boolean;
  showReorderStructureLabels?: boolean;
}

interface DevSettings {
  showDataViewer?: boolean;
}

interface RichTextSettings {
  features?: RichTextFeature[];
  link?: {
    mode?: 'free' | 'select' | 'both';
    source?: string; // backendData のパス
  };
}

interface CMSConfig {
  cms?: CMSSettings;
  dev?: DevSettings;
  studio?: StudioSettings;
  richText?: RichTextSettings;
  images?: { accept?: string; maxSize?: number };
  categoryOrder?: 'common' | 'individual' | 'special';
}

interface UserSettings {
  cms?: CMSSettings;
  dev?: DevSettings;
}
```

### 実装例

```typescript
// ZeroCodeCMS.vue
// configをパース
const parseConfig = (configString?: string): Partial<CMSConfig> => {
  if (!configString) return {};
  try {
    return JSON.parse(configString);
  } catch (e) {
    console.warn('[ZeroCodeCMS] Failed to parse config:', e);
    return {};
  }
};

const config = parseConfig(props.config);

// 初期値の読み込みロジック（優先順位: localStorage > config.cms > デフォルト値）
const getInitialCMSValue = <K extends keyof CMSSettings>(
  key: K,
  defaultValue: NonNullable<CMSSettings[K]>,
  configValue?: boolean
): NonNullable<CMSSettings[K]> => {
  const stored = loadCMSSettings();
  // localStorageに値があればそれを使用（ユーザーが変更した値）
  if (stored[key] !== undefined) {
    return stored[key] as NonNullable<CMSSettings[K]>;
  }
  // localStorageに値がなければ、config.cmsの値を使用（初期設定）
  if (configValue !== undefined) {
    return configValue as NonNullable<CMSSettings[K]>;
  }
  // それもなければデフォルト値
  return defaultValue;
};

// 設定の初期化（デフォルト値は全てfalse）
const devRightPadding = ref(
  getInitialCMSValue('devRightPadding', false, config.cms?.devRightPadding)
);
const allowDynamicContentInteraction = ref(
  getInitialCMSValue(
    'allowDynamicContentInteraction',
    false,
    config.cms?.allowDynamicContentInteraction
  )
);
const enableContextMenu = ref(
  getInitialCMSValue('enableContextMenu', false, config.cms?.enableContextMenu)
);

// 設定変更時にlocalStorageに保存
watch(devRightPadding, (newValue) => {
  saveCMSSettings({ devRightPadding: newValue });
});

watch(allowDynamicContentInteraction, (newValue) => {
  if (viewMode.value === 'manage') {
    saveCMSSettings({ allowDynamicContentInteraction: newValue });
  }
});

watch(enableContextMenu, (newValue) => {
  saveCMSSettings({ enableContextMenu: newValue });
});
```

## 編集モード

### edit（編集モード）

既存のコンポーネントを編集するモード。

**機能**:

- コンポーネントのフィールドを編集
- 親要素への移動（「親要素を選択」ボタン）
- 同じパーツをクリックした場合はパネルを閉じる

### add（追加モード）

新しいコンポーネントを追加するモード。

**機能**:

- パーツ一覧から選択すると既定では「後ろに」即時追加される（編集モードへは移らない）
- 既定で追加パネルは開いたまま続けて選択できる。追加直後のアンカーは追加したコンポーネントになる
- カテゴリタブ行右端の設定アイコンからポップオーバーで「選択した要素の前に追加する」「追加後に編集に移動」「プレビューに＋ボタンを表示」を切り替え可能
- 「追加後に編集に移動」をオンにすると、追加直後に編集モードへ切り替わり、追加したパーツの編集パネルが開く
- 「プレビューに＋ボタンを表示」ON 時、プレビュー上のパーツ間に挿入ボタン（24px・白背景の「＋」、選択中は緑背景）が表示される。`aria-label` で前後を区別。＋クリックは `insertBeforeActive` のみ更新し、チェック「選択した要素の前に追加する」とは独立
- 「選択したパーツ」タブではプレビューカードをクリックすると現在のデータで複製追加できる（オプションは上記と同じ）
- 親要素への移動（「親要素を選択」ボタン）

### delete（削除モード）

コンポーネントを削除するモード。

**機能**:

- 削除確認
- 親要素への移動（「親要素を選択」ボタン）

### reorder（並べ替えモード）

コンポーネントの順序を変更するモード。

**機能**:

- **並べ替えパネル（構造リスト / ミニマップ）**: パーツクリックまたは他モードからの handoff で表示。SortableJS による行 D&D（`page` 直下・各スロットの `[data-reorder-group]`）
- **プレビュー click-click**: 移動元 → 移動先の順クリック（`reorderSiblingsByPath` / insert 移動。D&D と同一ロジック）
- **プレビュー直接 D&D**: 不可（アラート表示）。パネル D&D または click-click を使用
- **構造ラベル**: `showReorderStructureLabels`（ReorderPanel 内オプション、localStorage 永続化）
- **移動先ハイライト**: 移動元選択後、有効な移動先に reorder target outline
- **モード handoff**: 編集・追加・削除から切り替え時、選択パーツを `applyReorderHandoff` で移動元に設定
- 親要素への移動（「親要素を選択」ボタン）

## 親要素選択

各編集モードで使用可能な親要素選択機能。

**機能**:

- 「親要素を選択」ボタンで親要素に移動
- 親要素がない場合はボタンが非表示になる
- 移動時に自動的にスクロールして移動先を表示

## パネル配置

編集パネルは`position: sticky`で配置され、画面右側に固定表示されます。

**実装**:

- `.zcode-panels-wrapper`に`position: sticky`を適用
- パネルが表示されている場合、`zcode-cms-container`に`zcode-dev-padding`クラスが追加され、右余白300pxが設定される（`devRightPadding`設定で有効化した場合）

## テンプレート構文

### フィールド参照

#### テキストフィールド

```
{$fieldName:defaultValue}
{$fieldName}
```

**例**:

```html
<h1>{$title:タイトル}</h1>
<a href="{$url:https://example.com/contact}">{$label}</a>
```

- デフォルト値は省略できる（`{$fieldName}` は空のデフォルト値）。型付きフィールドも `{$fieldName::rich}` / `{$fieldName:rich}` のように省略できる
- デフォルト値には `.` や `:` を含めてよい（URL・メールアドレスなど）
- バリデーション（`:required` など）は型トークンの前後どちらに書いてもよい

#### リッチテキストフィールド

```
{$fieldName:defaultValue:rich}
```

**例**:

```html
<div>{$description:説明文:rich}</div>
```

編集パネルではリッチテキストエディタとして表示されます。使える書式は config の `richText.features` で選択します（「リッチテキスト設定」を参照）。値は見出し・リスト・引用などのブロック要素を含む HTML になるため、`<p>` ではなく `<div>` などのブロック要素の中に置いてください。

#### 画像フィールド

```
{$fieldName:defaultValue:image}
```

`defaultValue` には画像管理で登録した画像ID（例: `img-1`）を指定します。パーツ編集時は「画像ID参照」タブでIDを確認・挿入できます。

**例**:

```html
<img src="{$image:img-1:image}" alt="画像" />
```

#### ラジオボタン

```
($fieldName:option1|option2|option3)
```

**例**:

```html
<div>($color:red|blue|green)</div>
```

#### チェックボックス

```
($fieldName:option1,option2,option3)
```

**例**:

```html
<div>($tags:tag1,tag2,tag3)</div>
```

#### セレクトボックス（単一選択）

```
($fieldName@:option1|option2|option3)
```

**例**:

```html
<div>($color@:red|blue|green)</div>
```

#### セレクトボックス（複数選択）

```
($fieldName@:option1,option2,option3)
```

**例**:

```html
<div>($tags@:tag1,tag2,tag3)</div>
```

#### オプショナルフィールド

```
{$fieldName?:defaultValue}
```

空入力時は`undefined`になります。

**例**:

```html
<div>{$subtitle?:サブタイトル}</div>
```

#### グループ化

```
{$fieldName.groupName:defaultValue}
($fieldName.groupName@:option1|option2)
```

編集パネルでフィールドをグループ化できます。

**例**:

```html
<div>{$title.basic:タイトル}</div>
<div>($color.basic@:red|blue|green)</div>
```

#### バリデーション

```
{$fieldName:defaultValue:required:max=100}
{$fieldName:defaultValue:readonly}
{$fieldName:defaultValue:disabled}
```

**例**:

```html
<input type="text" value="{$title:タイトル:required:max=50}" />
<input type="text" value="{$readonlyField:読み取り専用:readonly}" />
<input type="text" value="{$disabledField:無効化:disabled}" />
```

#### バックエンドデータ

```
{@fieldName}
{@fieldName:defaultValue}
{@user.name}
{@items[0]}
{@items[0].name}
{@items.length}
```

バックエンドから渡されたデータを参照します。`{@fieldName:defaultValue}` は、データが取得できない場合や値が空の場合に `defaultValue` を表示します（`backend-data` 未指定時もデフォルト値を使用）。

**例**:

```html
<h1>{@title:デフォルトタイトル}</h1>
<a href="{@url:/}">リンク</a>
<div>{@items.length}件</div>
```

### 条件分岐・制御

#### 条件分岐（z-if）

`z-if` は表示するかしないかを決めます。fieldName に紐づく形ではありません（fieldName に紐づくのは z-empty）。属性値に指定したキーの真偽で、要素を表示または削除します。

```
<element z-if="showContent">
  <!-- 条件が真の場合に表示 -->
</element>
```

- 真（`true`、非空文字列など）→ 表示
- 偽（`false`、`null`、空文字列、`0`）→ 要素を削除
- 指定キーが存在しない（`undefined`）→ 表示として扱う

**例**:

```html
<div z-if="showContent">
  <p>コンテンツが表示されます</p>
</div>
```

#### タグの動的変更

```
<element z-tag="$tagName:h1|h2|h3">
  <!-- コンテンツ -->
</element>
```

テンプレートで書いたタグ名がデフォルト値として使用されます。

**例**:

```html
<h2 z-tag="$headingTag:h1|h2|h3" class="title">{$title:タイトル}</h2>
```

#### 空要素の削除（z-empty）

`z-empty` は `$fieldName` で指定したフィールドに紐づきます。そのフィールドが空（`undefined`、`null`、空文字列、実質的に空のrichテキスト）の場合、親要素を削除します。

```
<element z-empty="$fieldName">
  <!-- コンテンツ -->
</element>
```

**例**:

```html
<div z-empty="$subtitle">
  <p>{$subtitle?:サブタイトル}</p>
</div>
```

#### ループ

```
<element z-for="item in {@items}">
  <!-- コンテンツ -->
</element>
```

バックエンドデータの配列をループします。

**例**:

```html
<div z-for="shop in {@shops}">
  <h2>{shop.name}</h2>
  <a href="{shop.url}">詳細</a>
</div>
```

### スロット

```
<element z-slot="slotName">
  <!-- スロットコンテンツ -->
</element>
```

**例**:

```html
<div z-slot="header">
  <h1>ヘッダー</h1>
</div>
```

**スロット設定**:

- `PartData`の`slots`プロパティで`allowedParts`を指定することで、スロットに追加可能なパーツを制限できる

⚠️ **セキュリティ注意**: テンプレート構文で属性値にユーザー入力を設定する場合、基本的なエスケープ処理とURL検証が適用されますが、**サーバー側での検証を必ず実装してください。**

## API

### ZeroCodeCMS

#### メソッド

- `getData(path?: string)`: データを取得
  - `path`を指定しない場合: 全体のデータを返す
  - `path`を指定した場合: 指定したパスのデータを返す
- `setData(path: string | object, value?: any)`: データを設定
  - `path`が文字列の場合: 指定したパスに値を設定
  - `path`がオブジェクトの場合: オブジェクト全体を設定
  - ⚠️ **セキュリティ注意**: このメソッドはクライアント側から任意のデータを設定できます。開発者ツールからも呼び出し可能です。**サーバー側での検証を必ず実装してください。**

#### イベント

- `save-request`: 保存ボタンクリック時に発火（保存リクエスト）
  - `detail.requestId`: リクエストID（`save-result`で使用）
  - `detail.source`: 送信元（`'cms'`、`'editor'`、または `'studio'`）
  - `detail.targets`: 保存対象の配列
    - zcode-cms 編集モード: `['page', 'images-special']`
    - zcode-editor / zcode-studio ページ管理: `['page', 'images-special']`
    - zcode-studio: `['parts-special', 'parts-special-css']` または `['images-special']`（編集中のタブに依存）
    - パーツ管理: `[primaryTarget, 'parts-*-css']`
    - 画像管理: `['images-common']` / `['images-individual']` / `['images-special']`
    - ページ編集の保存バンドルには `parts-*-css` は含まれない（パーツ管理で保存）。専用系の編集・保存は `zcode-studio` で行う
  - `detail.timestamp`: タイムスタンプ
  - `detail` に `data` は含まれない。受信側で `getData()` を呼んで取得する。
  - ⚠️ **セキュリティ注意**: `source`を確認し、CMSからのパーツ保存をサーバー側で拒否すること。
- `save-result`: 保存処理完了時に発火（保存結果）
  - `detail.requestId`: `save-request`の`requestId`と同じ値
  - `detail.target`: 保存対象（`'page'`, `'parts-common'`, `'parts-individual'`, `'parts-special'`, `'images-common'`, `'images-individual'`, `'images-special'`, `'parts-common-css'`, `'parts-individual-css'`, `'parts-special-css'`）- 各ターゲットごとに発火される
  - `detail.ok`: 保存成功かどうか
  - `detail.errors`: エラー情報の配列
- `zcode-dom-updated`: DOMが更新されたときに発火

### ZeroCodeEditor

#### メソッド

- `getData(path?: string)`: データを取得
- `setData(path: string | object, value?: any)`: データを設定
  - ⚠️ **セキュリティ注意**: このメソッドはクライアント側から任意のデータを設定できます。開発者ツールからも呼び出し可能です。**サーバー側での検証を必ず実装してください。**

#### プロパティ

- `allowDynamicContentInteraction`: 動的コンテンツの動作を有効/無効にする（getter/setter）

### サーバーサイドレンダリング

#### パッケージのエントリ

- **Node / SSR（推奨）**: `zerocodejs/ssr` から `renderToHtml`、`renderCssToHtml`、`RenderError` を import する。Vue や Web Components を含まない軽量バンドル（`package.json` の `exports["./ssr"]`）。テンプレート処理は **グローバルに `DOMParser` があればそれを利用**し、無い環境では [jsdom](https://github.com/jsdom/jsdom) を自動で読み込み、その `window` を `DOMParser` と DOMPurify の両方に使う（jsdom は任意の peer 依存。SSR で使う場合はホスト側で `npm install jsdom` する）。ESM では `require` が使えないため、Node.js 20.16+ / 22.3+ の `process.getBuiltinModule` 経由で、カレントディレクトリを基準に jsdom を解決する。それより古い Node.js の ESM では、描画前に `globalThis.DOMParser`（と DOMPurify 用の `globalThis.__ZCODE_SSR_WINDOW__`）を jsdom から設定する。`DOMParser` が先に使える場合は jsdom を読み込まない。
- **フルエントリ**: `zerocodejs` 本体からも同じ関数が export されている（ブラウザ用ビルドにまとめて解決する場合や、既存コードとの互換用）。
- **CMS 専用エントリ**: `zerocodejs/cms`（`package.json` の `exports["./cms"]`）。`<zcode-cms>` のみを登録する軽量エントリで、editor / studio・パーツ管理・画像管理・データビューアを含まない。サニタイズ関数・`renderToHtml` / `renderCssToHtml`・`ZeroCodePreview` は本体と同様に export される。リッチテキストエディタは初回利用時に遅延ロードされる（UMD ビルドでは従来どおりインライン）。

#### 関数

- `renderToHtml(data: ZeroCodeData, options?: { enableEditorAttributes?: boolean }): string`: ページコンポーネントからHTML文字列を生成
  - `data`: ZeroCodeData形式のデータ
  - `options.enableEditorAttributes`: 編集用属性を有効にするか（デフォルト: `false`）
  - 戻り値: 生成されたHTML文字列（CSSは含まない）
  - ⚠️ **セキュリティ注意**:
    - この関数は属性値に対して基本的なエスケープ処理とURL検証を行いますが、完全なセキュリティ保証はできません。
    - **パーツテンプレート（`part.body`）は信頼できるソースからのみ使用してください。**
    - **style属性にユーザー入力を直接設定する場合は、サーバー側での検証を推奨します。**
    - **サーバー側でのデータ検証を必ず実装してください。**

- `renderCssToHtml(css: ZeroCodeData['css']): string`: CSSデータから`<style>`タグのHTML文字列を生成
  - `css`: `ZeroCodeData.css`オブジェクト（`{ common?: string; individual?: string; special?: string }`）
  - 戻り値: `<style>`タグを含むHTML文字列（common → individual → special の順）
  - 空・`undefined`のカテゴリはスキップされる
  - CSS内の`</style>`はエスケープされる
  - 各`<style>`タグには`id="zcode-css-style-{category}"`、`data-zcode-css="true"`、`data-zcode-css-category="{category}"`属性が付与される

```javascript
import { renderToHtml, renderCssToHtml } from 'zerocodejs/ssr';

const content = renderToHtml(data, { enableEditorAttributes: false });
const styles = renderCssToHtml(data.css);

// content は <body> に、styles は <head> に配置
// フルパッケージから import する場合: import { ... } from 'zerocodejs';
```

#### サニタイズ関数

以下の関数はサーバーサイドとルール共有を目的として npm パッケージから export されています。

- `sanitizeRichText(html: string): string`: リッチテキストフィールドのサニタイズ（DOMPurify）
- `sanitizeUrl(url: string, context?: 'navigation' | 'embed'): string`: URL の検証・サニタイズ（`javascript:` / `vbscript:` / `file:` と制御文字によるスキーム偽装を拒否）。data URL はラスター画像のみ許可し、SVG の data URL は `context: 'embed'`（`img` の `src` / `poster` 等の埋め込み先）でのみ許可。省略時は安全側の `'navigation'`（`href` / `action` 等の遷移先）として扱う
- `sanitizePartTemplate(html: string): string`: パーツテンプレート HTML のサニタイズ（DOMPurify ベース、ZeroCode テンプレート記法 `z-*` 属性を許可、`<script>` / `<iframe>` 等の危険タグとイベントハンドラ属性を除去）
- `findDisallowedRichTextLinks(html: string, allowedUrls: string[]): string[]`: リッチテキスト内のリンクのうち、`allowedUrls` にない URL を重複なしで返す。リンク先を候補に限定する運用（`richText.link.mode: "select"`）で、サーバー側の検証に使う。比較は `sanitizeUrl` 後の文字列の完全一致。`sanitizeRichText` で除去される危険なリンクは対象にしない

```javascript
import { sanitizePartTemplate, sanitizeRichText, sanitizeUrl } from 'zerocodejs';
```

```javascript
// 保存リクエストの検証例: リッチテキストのリンクが候補内か確認する
import { findDisallowedRichTextLinks } from 'zerocodejs';

const allowedUrls = siteLinks.map((link) => link.url); // backendData で渡した候補と同じもの
const disallowed = findDisallowedRichTextLinks(component.body, allowedUrls);
if (disallowed.length > 0) {
  // save-result で ok: false を返す、または保存を拒否する
}
```

## セキュリティ

### 概要

ZeroCode.jsはフロントエンドライブラリのため、クライアント側での完全なセキュリティ保証はできません。以下の対策を実装してください。

### セキュリティモデル（信頼境界）

ZeroCode.js は Web Component ごとに責務を分け、**HTML を生成できる入力は信頼できる人に限る**ことを前提としている。ライブラリが無害化を保証するのは「信頼しない入力」のみ。

| 区分               | 入力                                                                                                     | 書き込める主体                                   | ライブラリの扱い                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| **信頼する入力**   | パーツテンプレート（`part.body`）、パーツ用CSS、`backendData`、ホストからの API 呼び出し（`setData` 等） | エンジニア（Editor）、制作会社（Studio）、ホスト | そのまま HTML / CSS として描画する（無害化しない） |
| **信頼しない入力** | CMS で入力するフィールド値（テキスト・テキストエリア・リッチテキスト・画像ID・選択肢・タグ）             | CMS 利用者                                       | 公開表示・編集画面の双方で無害化する（下記）       |

**信頼しない入力に対してライブラリが保証すること**（公開表示・編集画面・SSR 共通）:

- テキスト・テキストエリアはテキストノード／属性値として挿入し、HTML として解釈しない
- リッチテキストは DOMPurify の許可リスト（`p` `br` `strong` `em` `s` `u` `sup` `sub` `h2` `h3` `h4` `blockquote` `ul` `ol` `li` `a` `hr`、属性は `href` `target` `rel` のみ）で無害化する。エディタは保存済みの値を読み込むときにも同じ無害化を行う
- URL 属性（`href` `xlink:href` `src` `action` `formaction` `poster`）は、テンプレート記法を含む場合に**すべての展開後の最終値**を `sanitizeUrl` で検査し、`javascript:` 等の危険なスキームを除去する（複数トークンの連結や `{key}` プレースホルダー経由も対象）。テンプレート作者が直接書いた固定値は検査しない
- `z-tag` で選択できるタグは許可リストに限る

**運用上の注意**:

- パーツテンプレートを信頼できない主体に編集させる場合（Studio を外部の制作会社に開放する等）は、`studio.sanitizePartTemplate: true` を有効にしたうえで、**サーバー側でも `sanitizePartTemplate`（npm パッケージから export）を再実行**すること。クライアント側の無害化は API を直接呼ぶことで回避できる
- `backendData` にエンドユーザーの投稿（商品名・レビュー等）を含める場合、その値は信頼する入力として描画される。HTML 挿入はされないが、値に含まれるテンプレート記法（`{$field}` 等）が展開されうるため、必要に応じてサーバー側で除去すること

### CSP（Content Security Policy）

ZeroCode.js は `unsafe-eval` を必要としない（1.0.1-beta.26 以降。現在は翻訳に vue-i18n を使わず、`eval` / `new Function` を使わない自前の実装）。必要なディレクティブは次のとおり（実ブラウザで確認済み）。

| 用途             | ディレクティブ                                               | 理由                                                                 |
| ---------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| 全コンポーネント | `script-src` にライブラリの配信元（自サーバーや unpkg など） |                                                                      |
| 全コンポーネント | `style-src 'unsafe-inline'`                                  | Web Component が UI 用とパーツ用 CSS の `<style>` 要素を注入するため |
| 全コンポーネント | `img-src` に画像の配信元と `data:`                           | パーツの画像と、アップロード前の base64 画像を表示するため           |

- 外部の CDN からは何も読み込まない（Editor / Studio のパーツ管理のコード編集も、Monaco をやめてテキストエリアにした）
- 回帰テスト: `e2e/csp.spec.ts`（`unsafe-eval` を禁止した CSP の下で `zcode-cms` が描画されることを確認）

### 推奨事項

#### 1. サーバー側での検証（必須）

- **データ保存前の検証**: すべてのデータをサーバー側で検証してください
- **パーツテンプレートの検証**: パーツテンプレート（`part.body`）が信頼できるソースからのみ来ることを確認してください
- **送信元の検証**: `save-request`イベントの`source`フィールド（`'cms'` / `'editor'` / `'studio'`）を確認し、送信元に応じたアクセス制御を実装してください。例: `source: 'cms'` からのパーツデータ保存を拒否、`source: 'studio'` は専用系データのみ許可

#### 2. 属性値のセキュリティ

- **URL属性**: `href`, `xlink:href`, `src`, `action`, `formaction`, `poster` 属性には展開後の最終値に対するURL検証が適用されますが、サーバー側での追加検証を推奨します
- **style属性**: style属性にユーザー入力を直接設定する場合は、サーバー側での検証を推奨します
- **その他の属性**: 基本的なエスケープ処理が適用されますが、サーバー側での検証を推奨します

#### 3. パーツテンプレートの管理

- **信頼できるソース**: パーツテンプレートは信頼できるソースからのみ受け入れてください
- **テンプレートの検証**: サーバー側でテンプレートの妥当性を検証してください

#### 4. 認証・認可

- **権限管理**: パーツデータの変更は認証されたユーザーのみ許可してください
- **ロールベースアクセス**: ユーザーのロールに応じて操作を制限してください

### 実装例

```javascript
// クライアント側: detail に data は含まれない。getData() で取得する。
cms.addEventListener('save-request', async (event) => {
  const { requestId, source, targets, timestamp } = event.detail;
  const data = cms.getData();

  for (const target of targets) {
    try {
      if (source === 'cms' && target.startsWith('parts-')) {
        cms.dispatchEvent(
          new CustomEvent('save-result', {
            detail: {
              requestId,
              target,
              ok: false,
              errors: [{ message: '権限がありません', code: 'FORBIDDEN' }]
            }
          })
        );
        continue;
      }

      let dataToSave;
      switch (target) {
        case 'page':
          dataToSave = data.page;
          break;
        case 'parts-common-css':
          dataToSave = data.css?.common || '';
          break;
        case 'parts-individual-css':
          dataToSave = data.css?.individual || '';
          break;
        case 'parts-special-css':
          dataToSave = data.css?.special || '';
          break;
        case 'parts-common':
          dataToSave = data.parts?.common || [];
          break;
        case 'parts-individual':
          dataToSave = data.parts?.individual || [];
          break;
        case 'images-common':
          dataToSave = data.images?.common || [];
          break;
        case 'images-individual':
          dataToSave = data.images?.individual || [];
          break;
        case 'images-special':
          dataToSave = data.images?.special || [];
          break;
        case 'parts-special':
          dataToSave = data.parts?.special || [];
          break;
        default:
          continue;
      }

      // データの検証
      if (!validateDataStructure(dataToSave)) {
        cms.dispatchEvent(
          new CustomEvent('save-result', {
            detail: {
              requestId,
              target,
              ok: false,
              errors: [{ message: '無効なデータです', code: 'INVALID_DATA' }]
            }
          })
        );
        continue;
      }

      // パーツテンプレートの検証
      if (target.startsWith('parts-') && !validatePartTemplate(dataToSave)) {
        cms.dispatchEvent(
          new CustomEvent('save-result', {
            detail: {
              requestId,
              target,
              ok: false,
              errors: [{ message: '無効なテンプレートです', code: 'INVALID_TEMPLATE' }]
            }
          })
        );
        continue;
      }

      // 保存処理
      await saveToDatabase(target, dataToSave);

      // 成功時
      cms.dispatchEvent(
        new CustomEvent('save-result', {
          detail: {
            requestId,
            target,
            ok: true,
            errors: []
          }
        })
      );
    } catch (error) {
      // エラー時
      cms.dispatchEvent(
        new CustomEvent('save-result', {
          detail: {
            requestId,
            target,
            ok: false,
            errors: [{ message: error.message, code: 'SAVE_FAILED' }]
          }
        })
      );
    }
  }
});
```

## パーツ管理

### タイプとパーツ

- **タイプ（Type）**: パーツのグループ。複数のパーツを含む
- **パーツ（Part）**: 実際のコンポーネントテンプレート

### 共通パーツと個別パーツ

- **共通パーツ**: すべてのページで使用可能なパーツ
- **個別パーツ**: 特定のページでのみ使用可能なパーツ

### パーツ管理機能

- タイプの作成・編集・削除
- HTMLタブ編集時のサイドパネル「画像ID参照」: 画像一覧を表示し、テンプレートの `{$field:default:image}` に画像IDをコピー・挿入可能
- パーツの作成・編集・削除
- タイプ間の並べ替え
- パーツのプレビュー表示
- HTML・CSS のコード編集（テキストエリア。パーツは手元のエディタで書いて貼り付け、ここでは登録と小さな修正を行う想定）
- **編集パネルプレビューと表示プレビューの連動**: パーツ編集モーダル内で「編集パネルプレビュー」のフィールドを変更すると、「表示プレビュー」タブおよび拡大モーダルに同じ内容が即時反映される。また、ページ上で同じパーツを使用している先頭のコンポーネントにも値が同期され、表示モードに切り替えた際に反映される。

## 画像管理

### 画像管理機能

- 画像のアップロード
- 画像の編集（ID、名前、URL、alt）
- 画像の削除
- 共通画像と個別画像の管理

### ホストとの連携（`hooks`）

関数は属性（JSON 文字列）では渡せないため、要素の `hooks` プロパティで渡す（Vue のコンポーネントとして使う場合は `hooks` prop）。`zcode-cms` / `zcode-editor` / `zcode-studio` で共通。要素の定義より前に代入してもよく、あとから差し替えてもよい。

```typescript
interface ZeroCodeHooks {
  uploadImage?: (
    file: File,
    context: ImageHookContext
  ) => Promise<{ url: string; id?: string; name?: string }>;
  listImages?: (
    context: ImageHookContext
  ) => Promise<Array<{ id: string; url: string; name?: string }>>;
  beforeSavePart?: (body: string) => string | Promise<string>;
}

interface ImageHookContext {
  category: 'common' | 'individual' | 'special'; // 追加・差し替えるカテゴリ
  pageId?: string; // 要素の page-id 属性
  source: 'cms' | 'editor' | 'studio'; // save-request の source と同じ
  replacingId?: string; // 差し替えのとき、差し替える画像の ID
}
```

```js
const cms = document.querySelector('zcode-cms');
cms.hooks = {
  async uploadImage(file, context) {
    const body = new FormData();
    body.append('file', file);
    body.append('category', context.category);
    const res = await fetch('/api/media', { method: 'POST', body });
    if (!res.ok) throw new Error('upload failed');
    const { id, url } = await res.json();
    return { id, url };
  },
  async listImages(context) {
    return (await fetch('/api/media')).json(); // [{ id, url, name }]
  }
};
```

- **`uploadImage`**: 画像を追加・差し替えた時点で呼ぶ。返した `url` を画像のデータに入れる（`needsUpload` は付けない）。
  - `id` を返すとその ID を使う。ほかの画像（どのカテゴリでも）と重なるときは末尾に `-2` などを付ける。省略時は自動で付ける。`name` の省略時はファイル名。
  - 差し替えでは画像の ID は変えない（ページのデータの参照を保つ）。
  - アップロード中は追加・差し替え・確定のボタンを無効にし、「アップロード中…」を表示する。
  - 例外を投げると（または `url` を返さないと）、エラーを表示して画像を追加・差し替えしない。
  - 追加して保存しなかった画像はサーバーに残る。どこからも参照されていない画像は、ホスト側で定期的に消す運用にする。
  - **未指定のとき**は従来どおり、ブラウザで base64 にして `needsUpload: true` を付ける（保存時にホストがアップロードして URL に置き換える）。
- **`listImages`**: 指定すると、画像管理と画像の選択画面に「メディアから選ぶ」を出す。選んだ画像は、今のカテゴリに `{ id, name, url }` として登録する（サーバーのファイルは複製しない）。同じ URL の画像がすでにあれば、それを使う。
- **`beforeSavePart`**: パーツ管理でパーツを保存する前に、テンプレートを受け取って返す（`config.studio.sanitizePartTemplate` の後に実行）。例外を投げると保存しない。
- 画像の一覧から削除しても、サーバーのファイルは消さない。
- 返した URL も、表示するときは従来どおり URL の無害化（`sanitizeUrl`）を通る。`context.source` で、Studio からのアップロードだけ制限する、といった判断ができる。

### 画像選択モーダル

編集パネルから画像を選択する際に表示されるモーダル。

- 共通画像と個別画像の切り替え
- 画像のプレビュー表示
- 画像の追加・削除

## データビューア

### 機能

- CMSデータをJSON/HTML形式で表示
- データのコピー機能
- 保存ボタンで出し分け（選択中のタブとカテゴリに応じて適切なターゲットで保存）

### タブ構成

データビューアは`ZeroCodeEditor`のメインタブ「データビューアー」として統合されています。

#### メインタブ

- **ページ管理**: ページ編集機能
- **パーツ管理**: パーツ管理機能
- **画像管理**: 画像管理機能
- **データビューアー**: データ表示・コピー機能

#### データビューア内部タブ

- **ページ**: ページデータを表示
- **パーツ**: パーツデータを表示
- **画像**: 画像データを表示

#### フォーマット/カテゴリタブ

- **ページタブ選択時**: JSON / HTML 切り替え
- **パーツ/画像タブ選択時**: 共通 / 個別 切り替え

### 表示モード

- **JSON**: データ構造をJSON形式で表示（全タブで利用可能）
- **HTML**: 生成されたHTMLを表示（ページタブのみ、`zcode`属性は削除され、インデントされる）

### 保存機能

データビューアタブがアクティブな時に保存ボタンを押すと、現在選択されている内部タブとカテゴリに応じて適切なターゲットで`save-request`イベントが発火されます。

**ターゲットの決定**:

- `internalActiveTab === 'page'` → `['page', 'images-special']`
- `internalActiveTab === 'parts'` + `activeCategory === 'common'` → `targets = ['parts-common', 'parts-common-css']`
- `internalActiveTab === 'parts'` + `activeCategory === 'individual'` → `targets = ['parts-individual', 'parts-individual-css']`
- `internalActiveTab === 'parts'` + `activeCategory === 'special'` → `targets = ['parts-special', 'parts-special-css']`
- `internalActiveTab === 'images'` + `activeCategory === 'common'` → `targets = ['images-common']`
- `internalActiveTab === 'images'` + `activeCategory === 'individual'` → `targets = ['images-individual']`

**イベント**:

- `save-request`: 保存リクエストイベント（`common.js`で処理）
  - `detail.requestId`: リクエストID
  - `detail.source`: 送信元（`'cms'`、`'editor'`、または `'studio'`）
  - `detail.targets`: 保存対象の配列（複数のターゲットが含まれる場合がある）
  - `detail.timestamp`: タイムスタンプ

## スタイリング

### CSSクラスプレフィックス

すべてのCSSクラスは`zcode-`プレフィックスを使用します。

**主要なクラス**:

- `.zcode-cms-container`: CMSコンテナ
- `.zcode-dev-container`: エディターコンテナ
- `.zcode-dev-padding`: 編集パネル分の右余白を追加（`devRightPadding`設定で有効化）
- `.zcode-toolbar`: ツールバー
- `.zcode-edit-panel`: 編集パネル
- `.zcode-add-panel`: 追加パネル
- `.zcode-delete-panel`: 削除パネル
- `.zcode-reorder-panel`: 並べ替えパネル
- `.zcode-settings-panel`: 設定パネル
- `.zcode-panels-wrapper`: パネルラッパー（`position: sticky`）

### 呼び出し側のリセットCSSとの共存

クラスは `zcode-` でスコープされていますが、**チェックボックス・ラジオ・`select` などのネイティブコントロール**はグローバルな `input` / `select` 向けリセット（例: `appearance: none`、強い `*` リセット）の影響を受けることがあります。

- **`zerocodejs/style.css`（または `dist/zerocodejs.css`）は、強力なグローバルリセットの後に読み込む**ことを推奨します。
- ライブラリ側では上記コントロールに対し `appearance: auto` などの補強を入れていますが、呼び出し側で **同じセレクタより後に** ゼロコードの CSS が当たる構成にすると確実です。

## 依存関係

### 主要な依存関係

- **Vue 3（3.5 以上）**: UIフレームワーク。peerDependencies で利用者が用意する（`dist` は Vue 3.5 のコンパイラで生成しており、`defineModel` など 3.4 以降の機能も使うため）
- **SortableJS**: 並べ替えパネル内 D&D
- **アイコン**: Lucide の SVG を `src/core/icons/` に手元で持つ（パッケージには依存しない。ライセンスは `create-icon.ts` に記載）

### 開発依存関係

- **TypeScript**: 型安全性
- **Vite**: ビルドツール
- **Vitest**: テストフレームワーク

## ビルドとデプロイ

### 開発

```bash
npm run dev
```

#### ローカル検証用 HTML

| ファイル                          | 内容                                                                       |
| --------------------------------- | -------------------------------------------------------------------------- |
| `test-cms.html`                   | CMS 基本操作                                                               |
| `test-cms-scope.html`             | 専用画像の `page-id` スコープ（記事 A/B 切替・`images-special` JSON 表示） |
| `test-dev.html`                   | Editor（パーツ/画像管理・データビューア含む）                              |
| `test-studio.html`                | Studio                                                                     |
| `test-pub.html` / `test-ssr.html` | 公開出力 / SSR                                                             |

デモの永続化は `public/js/common.js` の `StorageManager`（localStorage）。`test-cms-scope.html` のインスタンス ID は `test-cms-scope`（`test-cms.html` とは別データ）。

### ビルド

```bash
npm run build
```

### 型チェック

```bash
npm run type-check
```

### リント

```bash
npm run lint
```

## ブラウザサポート

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 1.0 で安定させる範囲（草案）

> **草案**: 1.0 リリース前に確定する。ベータ期間中は、以下も含めて破壊的変更がありうる。

1.0 以降は[セマンティック バージョニング](https://semver.org/lang/ja/)に従い、以下の**公開 API** を破壊的に変更する場合はメジャーバージョンを上げる。

### 公開 API（安定させる対象）

- **Web Component**: `<zcode-cms>` / `<zcode-editor>` / `<zcode-studio>` のタグ名と属性（`locale`、`page`、`page-id`、`css-*`、`parts-*`、`images-*`、`config`、`endpoints`、`backend-data`、`use-shadow-dom`、Editor の `enable-parts-manager` / `enable-images-manager`）
- **メソッド**: `getData()` / `setData()`
- **イベント**: `save-request` / `save-result` / `zcode-dom-updated` とその `detail` の形
- **設定**: `config` 属性で受け付ける設定オプション（「設定オプション」の節）
- **データ形式**: `ZeroCodeData`（`version` を含む）。形式を変える場合は `version` を上げ、`migrateZeroCodeData()` で旧形式から自動で移行できるようにする
- **テンプレート記法**: フィールド・選択肢・バリデーション・バックエンドデータ参照・`z-if` / `z-tag` / `z-empty` / `z-for` / `z-slot`
- **npm エントリと export**: `zerocodejs`・`zerocodejs/cms`・`zerocodejs/ssr` と、そこから export する関数・型（`renderToHtml`、`renderCssToHtml`、`RenderError`、`sanitizeRichText`、`sanitizeUrl`、`sanitizePartTemplate`、`findDisallowedRichTextLinks`、`ZERO_CODE_DATA_VERSION`、`migrateZeroCodeData`、`RICH_TEXT_FEATURES`、`DEFAULT_RICH_TEXT_FEATURES`、型定義）
- **公開 HTML**: 公開表示（`enableEditorAttributes: false`）の出力に、編集用の `data-zcode-*` 属性やラッパー要素を含めないこと

### 安定させない対象（予告なく変わりうる）

- 管理画面 UI の DOM 構造・CSS クラス名（`zcode-*`）・見た目
- 編集モードで出力される `data-zcode-*` 属性
- `localStorage` のキーと内容（ユーザー設定の保存）
- Vue コンポーネントとしての直接利用（`ZeroCodeCMS` などの export）と、`src/` 配下の内部関数

### 変更の進め方

- 公開 API を廃止する場合は、少なくとも1つ前のマイナーバージョンで非推奨にし、CHANGELOG とコンソール警告で予告する
- セキュリティ修正は、公開 API の挙動を変える場合でもパッチ／マイナーバージョンで行うことがある（CHANGELOG の「セキュリティ」に明記する）

## ライセンス

MIT License

---

**最終更新日**: 2026年6月
