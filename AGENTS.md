# ZeroCode.js - エージェント向けガイドライン

> **このファイルの目的**: AIエージェントがZeroCode.jsを効率的に開発するためのガイドラインです。実装方針、データ構造、テンプレート記法、ファイル構成などの情報を提供します。

## 📑 目次

- [📚 ドキュメントの読み方ガイド](#-ドキュメントの読み方ガイド)
  - [開発開始時の推奨フロー](#開発開始時の推奨フロー)
  - [各mdファイルの役割](#各mdファイルの役割)
  - [クイックリファレンス](#クイックリファレンス)
- [開発状況](#開発状況)
- [コメントアウトに関する方針](#コメントアウトに関する方針)
- [コードスタイル](#コードスタイル)
- [HTMLタグの使用方針](#htmlタグの使用方針)
- [データ構造](#データ構造)
- [テンプレート記法](#テンプレート記法)
- [コンポーネント初期化](#コンポーネント初期化)
- [イベント](#イベント)
- [ファイル構成](#ファイル構成)
- [実装済み機能](#実装済み機能)
- [開発開始時のチェックリスト](#開発開始時のチェックリスト)
- [実装時の注意事項](#実装時の注意事項)
- [実装パターン集](#実装パターン集)
- [トラブルシューティング](#トラブルシューティング)
- [参考リンク](#参考リンク)

## 📚 ドキュメントの読み方ガイド

### 開発開始時の推奨フロー

1. **タスクの理解**
   - `TODO.md`でタスクの詳細を確認
   - 実装済み機能の一覧を確認（`AGENTS.md`の「実装済み機能」セクション）

2. **実装前の確認**
   - `AGENTS.md`の「実装時の注意事項」を確認
   - 関連するテンプレート記法を確認（`AGENTS.md`の「テンプレート記法」セクション）
   - データ構造を確認（`AGENTS.md`の「データ構造」セクション）

3. **実装中の参照**
   - ファイル構成を確認（`AGENTS.md`の「ファイル構成」セクション）
   - 参考リンクから実装例を確認

4. **実装後の更新**
   - `TODO.md`の該当タスクを完了に更新
   - `AGENTS.md`の「実装済み機能」に追加（必要に応じて）
   - `TECHNICAL_SPECIFICATION.md`を更新（API変更がある場合）

### 各mdファイルの役割

| ファイル                       | 目的                               | いつ読むか                                                                 |
| ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------- |
| **AGENTS.md**                  | AI開発向けの実装ガイドライン       | **常に最初に読む**。実装方針、データ構造、テンプレート記法、注意事項を確認 |
| **TODO.md**                    | 実装タスクの一覧と進捗             | タスクの詳細を確認する時、実装完了時に更新                                 |
| **TECHNICAL_SPECIFICATION.md** | 技術仕様書（API詳細）              | APIの詳細仕様を確認する時、外部向けドキュメントとして参照                  |
| **README.md**                  | プロジェクト概要とクイックスタート | プロジェクトの全体像を把握する時                                           |
| **I18N_SPECIFICATION.md**      | 多言語対応の仕様書                 | i18n機能を実装する時のみ                                                   |

### クイックリファレンス

#### よく使う情報へのリンク

- **テンプレート記法一覧**: [AGENTS.md - テンプレート記法](#テンプレート記法)
- **データ構造**: [AGENTS.md - データ構造](#データ構造)
- **イベント仕様**: [AGENTS.md - イベント](#イベント)
- **ファイル構成**: [AGENTS.md - ファイル構成](#ファイル構成)
- **実装済み機能**: [AGENTS.md - 実装済み機能](#実装済み機能)
- **実装時の注意事項**: [AGENTS.md - 実装時の注意事項](#実装時の注意事項)

#### よくある質問（FAQ）

**Q: 新しいテンプレート記法を追加するには？**

- A: フィールド記法のパースは `src/core/utils/field-syntax.ts` の `scanFieldTokens` に一元化されている。記法の変更は (1) `field-syntax.ts` のトークナイザ、(2) `field-extractor.ts` の `FieldInfo` へのマッピング、(3) `template-processor.ts` のコンテキスト別解決関数（`resolveTextLikeValue` 等）の3箇所で完結する。`AGENTS.md`の「テンプレート記法の実装」セクションを参照。

**Q: 新しいイベントを追加するには？**

- A: `src/components/ZeroCodeCMS.vue`または`ZeroCodeEditor.vue`で`dispatchEvent`を呼び出し。`AGENTS.md`の「イベント処理」セクションを参照。

**Q: 新しいコンポーザブルを作成するには？**

- A: `src/features/`配下に適切なディレクトリを作成。`AGENTS.md`の「ファイル構成」セクションを参照。

**Q: データ保存の仕様を確認したい**

- A: `AGENTS.md`の「データ保存の仕様」セクションを参照。`save-request`イベントのみが保存ポイント。

**Q: テンプレート記法の処理順序がわからない**

- A: `AGENTS.md`の「テンプレート記法の処理順序」セクションを参照。`z-if` → `z-tag` → `z-empty` → `z-for` → `z-slot`の順で処理。

**Q: コンポーネントの初期化タイミングは？**

- A: データ読み込み時（`page`属性が設定された時点）に自動実行。`AGENTS.md`の「コンポーネント初期化」セクションを参照。

**Q: オプショナルフィールドと通常フィールドの違いは？**

- A: オプショナルフィールド（`{$field?:default}`）は初期化されず`undefined`のまま。通常フィールドはデフォルト値で初期化。`AGENTS.md`の「コンポーネント初期化」セクションを参照。

## 開発状況

**現在はリリース前の開発段階です。**

- 後方互換性を考慮する必要はありません
- 既存のAPIやインターフェースを変更しても問題ありません
- 破壊的変更（Breaking Changes）を気にせずに実装できます
- コードの改善やリファクタリングを優先してください

## コメントアウトに関する方針

### 実装時の説明コメントは不要

実装時に更新内容の説明をコメントアウトとして記載する必要はありません。

**推奨しない例:**

```typescript
// グループ名を追加
groupName: field.groupName,

// グループ付きパターンを先に処理
const textWithGroupRegex = new RegExp(...);
```

**推奨する例:**

```typescript
groupName: field.groupName,

const textWithGroupRegex = new RegExp(...);
```

### コメントを記載する場合

以下の場合のみ、コメントを記載してください：

1. **複雑なロジックの説明**: コードだけでは理解が困難な場合
2. **TODO/FIXME**: 将来の改善点や既知の問題
3. **外部依存関係の説明**: 外部ライブラリやAPIの仕様に関する説明
4. **型定義の説明**: 複雑な型定義やインターフェースの説明

**例:**

```typescript
// TODO: パフォーマンス最適化が必要（大量データ時に遅延が発生する可能性）
// FIXME: エッジケースでnull参照エラーが発生する可能性あり

/**
 * テンプレートからフィールド情報を抽出する
 * @param template - HTMLテンプレート文字列
 * @returns 抽出されたフィールド情報の配列
 */
```

## コードスタイル

- 自己説明的なコードを心がける
- 変数名や関数名で意図を明確にする
- 必要最小限のコメントのみ記載

### Git（pre-commit）

- `git commit` 時に Husky が **lint-staged** を実行する。staged の `*.{vue,js,jsx,cjs,mjs,ts,tsx,cts,mts}` に **ESLint --fix** と **Prettier**、`*.{json,md,css,html,yml,yaml}` は **Prettier** のみ。
- 初回は `npm install` の `prepare` で Husky が有効になる（`core.hooksPath` が `.husky/_`）。
- 手動確認: `npm run lint` / `npm run format:check`
- **コミットメッセージ・コミットタイミング**（Cursor / Claude Code 共通）: `.cursor/rules/commit.mdc` と `commit-timing.mdc` を参照。Git フックでメッセージ形式を検証する場合は **commitlint** 等の別途導入が必要。

### Claude Code 自動化

このプロジェクト用に用意されている Claude Code の自動化一覧。

| 種類     | 名前                  | 場所                                                       | 使い方                                                                                                                     |
| -------- | --------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Skill    | new-part-template     | `.claude/skills/new-part-template/`                        | ユーザー専用。テンプレートDSLの新パターンについて頼むと、fixture（`sample-templates.ts`）とテストケースをセットで生成      |
| Subagent | template-dsl-reviewer | `.claude/agents/template-dsl-reviewer.md`                  | テンプレート処理系（`template-processor.ts` 等）の変更時、DSL特有のバグ（処理順序違反、XSS、区切り文字衝突など）をレビュー |
| Subagent | ui-reviewer           | `.claude/agents/ui-reviewer.md`                            | 編集UI（パネル・モーダル・並べ替え等）の変更時、アクセシビリティ（キーボード操作・ARIA）をレビュー                         |
| Hook     | 型チェック自動実行    | `.claude/settings.json` + `.claude/hooks/type-check.sh`    | `.ts`/`.vue`/`.tsx` を編集した直後に `vue-tsc --noEmit` を自動実行し、失敗時のみ結果をClaudeに通知                         |
| Hook     | 関連テスト自動実行    | `.claude/settings.json` + `.claude/hooks/related-tests.sh` | 同上のタイミングで `vitest related --run` を自動実行し、失敗時のみ結果をClaudeに通知                                       |
| MCP      | context7              | `.mcp.json`                                                | Monaco Editor / vue-i18n 等のドキュメント検索（要 `/mcp` で承認）                                                          |
| MCP      | github                | `.mcp.json`                                                | Issue/PR操作（要 `/mcp` で承認 + 初回利用時にGitHub OAuth認証）                                                            |

**有効化の注意**: hooksの設定は Claude Code のセッション開始時に存在した `.claude/` 配下のみ監視されるため、追加・変更後は一度 `/hooks` を開くか Claude Code を再起動する必要がある。MCPサーバーはプロジェクトスコープ登録のため `/mcp` での承認が別途必要。

## HTMLタグの使用方針

**適用範囲**: この方針は **ZeroCodeのUIコンポーネント**（パネル、ツールバー、編集画面など `src/` 配下のVueコンポーネント）にのみ適用します。ユーザーが記述する**パーツのテンプレート**には適用しません。パーツでは `z-tag` により見出し・段落などのタグを選択可能にできます。

ZeroCodeのUIが呼び出し側のCSS（リセットCSSやデフォルトCSS）の影響を受けないよう、**UI部分では**`div`や`span`を用い、適切なクラス名と必要に応じて`role`を付与してください。

### ZeroCodeのUIでの書き方

#### 1. 見出しとして意味がある箇所

`role="heading"`と`aria-level`を設定します。

```vue
<div class="zcode-panel-header-title" role="heading" aria-level="3">
  編集中: {{ editingComponent.type }}
</div>
```

#### 2. 段落・テキスト表示

`role`属性は不要です。

```vue
<div class="zcode-edit-fields-text">ID: {{ editingComponent.id }}</div>
```

#### 3. リストとして意味がある箇所

`role="list"`と`role="listitem"`を設定します。

```vue
<div role="list" class="zcode-help-section-list">
  <div role="listitem" class="zcode-help-section-item">項目1</div>
  <div role="listitem" class="zcode-help-section-item">項目2</div>
</div>
```

### アクセシビリティについて

- 見出しとして意味がある箇所のみ`role="heading"`と`aria-level`を設定
- 単なるテキスト表示の場合は`role`属性は不要
- タブ操作程度でCMSとしての機能ができれば十分（スクリーンリーダー対応は必須ではない）

### 例外

- `button`タグは機能維持のため、CSSで防御する方針
- フォーム要素（`input`, `textarea`, `select`など）は機能上必要なため使用可能

### Shadow DOM とホストスタイル

`src/styles/zcode-cms.css` 先頭の `:host` は、`<zcode-cms>` / `<zcode-editor>` / `<zcode-studio>` がシャドウルートへスタイルを注入するときのみ意味を持ち、ホストページからの継承を `all: initial` で切り直す（ホストが見えないタイポグラフィ・配色をライブラリ側で決めない）。レイアウト上、`display: block` と `box-sizing: border-box` のみ明示する。サイト固有の見た目は `slot="css"` やホスト側で足す。Light DOM（`use-shadow-dom="false"`）では `:host` は適用されない。

## データ構造

### ZeroCodeData

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

### カテゴリ名（UI と内部キー）

- **UI 表示**: 共通 / 個別 / **専用**
- **内部キー**（JSON・属性・`save-request` の target）: `common` / `individual` / **`special`**（例: `parts.special`, `images-special`, `parts-special-css`）

### ComponentData

```typescript
interface ComponentData {
  id: string;
  part_id: string; // パーツID（タイトル変更時も紐付けが維持される）
  [key: string]: any; // フィールドの値（テンプレート記法で定義されたフィールド）
  slots?: Record<string, ComponentData[] | SlotConfig>; // スロットの子コンポーネント
}
```

### SlotConfig

```typescript
interface SlotConfig {
  allowedParts?: string[]; // 許可されるパーツID
  children?: ComponentData[]; // 子コンポーネント（既存の形式との互換性）
}
```

### TypeData

```typescript
interface TypeData {
  id: string; // タイプID（タイプ変更時も紐付けが維持される）
  type: string;
  description: string;
  parts: PartData[];
}
```

### PartData

```typescript
interface PartData {
  id: string; // パーツID（タイトル変更時も紐付けが維持される）
  title: string;
  description: string;
  body: string; // パーツのテンプレート（HTML文字列）
  slots?: Record<string, { allowedParts?: string[] }>; // スロット設定
  slotOnly?: boolean; // スロット専用パーツ
}
```

### ImageData

```typescript
interface ImageData {
  id: string;
  name: string;
  url: string;
  mimeType?: string; // MIMEタイプ（base64画像の場合）
  needsUpload?: boolean; // アップロードが必要かどうか
  scope?: 'shared' | 'page'; // 専用画像のみ。未指定または shared は全ページで選択可能
  pageId?: string; // scope が page のとき、当該 page-id の編集画面でのみ選択可能
}
```

#### 専用画像のスコープ（`page-id`）

- 詳細仕様: [TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md) の「専用画像のスコープ」
- ローカル検証: [test-cms-scope.html](./test-cms-scope.html)（`npm run dev` → `/test-cms-scope.html`）
- 実装: [image-scope.ts](./src/core/utils/image-scope.ts)

## テンプレート記法

### 実装済みのテンプレート記法

#### フィールド記法

- **テキストフィールド**: `{$fieldName:defaultValue}`
- **テキストエリア**: `{$fieldName:defaultValue:textarea}`
- **リッチテキスト**: `{$fieldName:defaultValue:rich}`
- **画像フィールド**: `{$fieldName:defaultValue:image}`
- **オプショナルフィールド**: `{$fieldName?:defaultValue}`（空入力時は`undefined`）
- **グループ化**: `{$fieldName.groupName:defaultValue}`

#### 選択肢記法

- **ラジオボタン（単一選択）**: `($fieldName:option1|option2|option3)`
- **チェックボックス（複数選択）**: `($fieldName:option1,option2,option3)`
- **セレクトボックス（単一選択）**: `($fieldName@:option1|option2|option3)`
- **セレクトボックス（複数選択）**: `($fieldName@:option1,option2,option3)`

各オプションは `表示ラベル=保存値` と書ける（例: `($status:下書き=draft|公開=published)`）。`=` を含めない場合はその文字列がラベル兼保存値。値に含まれた `|` や `,` は選択肢の区切りとは別途扱う必要があるため、通常は値側にそれらは使わない運用とする。

#### バリデーション記法

- **必須**: `{$fieldName:defaultValue:required}`
- **最大文字数**: `{$fieldName:defaultValue:max=100}`
- **読み取り専用**: `{$fieldName:defaultValue:readonly}`
- **無効化**: `{$fieldName:defaultValue:disabled}`
- **複数指定**: `{$fieldName:defaultValue:required:max=50}`
- **デフォルト値の省略**: `{$fieldName}`（テキスト）、`{$fieldName::rich}` / `{$fieldName:rich}`（型付き）はデフォルト値が空のフィールドとして扱う
- **validation の位置**: 型トークンの前後どちらに書いてもよい（`{$f:既定:required:rich}` と `{$f:既定:rich:required}` は同じ）
- **デフォルト値の `.` と `:`**: デフォルト値に `.` や `:` を含めてよい（例: `{$url:https://example.com/path}`、`{$mail:mailto:info@example.com}`）

#### バックエンドデータ

- **基本参照**: `{@fieldName}`
- **デフォルト付き参照**: `{@fieldName:defaultValue}`（データ未取得・パス不存在・null/undefined/空文字のときフォールバック）
- **ネスト参照**: `{@user.name}`
- **配列参照**: `{@items[0]}`, `{@items[0].name}`
- **配列のlength**: `{@items.length}`
- **URL内プレースホルダー**: `/shop/{shop_id}/products`

#### 条件分岐・制御

- **条件分岐**: `z-if="key"`（表示するかしないか。指定キーの真偽で表示/削除。fieldName に紐づく形ではない）
- **タグの動的変更**: `z-tag="$tagName:h1|h2|h3"`（テンプレートで書いたタグ名がデフォルト値）
- **空要素の削除**: `z-empty="$fieldName"`（**fieldName に紐づく**。フィールドが空の場合、親要素を削除）
- **ループ**: `z-for="item in {@items}"`（バックエンドデータの配列をループ）
- **スロット**: `z-slot="slotName"`（子コンポーネントを挿入する位置）

### テンプレート記法の処理順序

`processTemplateWithDOM`関数内での処理順序：

1. テキストノード・属性内の値フィールド展開（バックエンドデータ → `{$...}` フィールド。`field-syntax.ts` の `scanFieldTokens` によるトークンスキャンで一括処理）
2. 選択肢記法 `($...)` の展開（値フィールドとは別パス）
3. `z-if`条件分岐処理（表示 on/off。条件が偽の場合は要素を削除、処理後に`z-if`属性を削除）
4. `z-tag`タグ名の動的変更処理（タグ名を変更し、`z-tag`属性は新しい要素にコピーしない）
5. `z-empty`条件分岐処理（**fieldName に紐づく**。フィールドが空の場合は要素を削除、処理後に`z-empty`属性を削除）
6. `z-for`ループ処理（バックエンドデータの配列をループ、処理後に`z-for`属性を削除）
7. `z-slot`処理（スロットに子コンポーネントを挿入、処理後に`z-slot`属性を削除）

**補足**: かつて存在した「optional→group→通常、rich/textarea/image→text の順で正規表現を評価しないと誤マッチする」という順序契約は、トークナイザ化（2026年7月）により消滅した。フィールド記法のパースを変更する場合は `field-syntax.ts` のみを見ればよい。

## コンポーネント初期化

### 自動初期化の仕様

データ読み込み時（`page`属性が設定された時点）に、`initializeAllComponentFields`関数が自動的に実行されます。

**動作:**

- すべてのコンポーネント（スロット内も含む）に対して再帰的に処理
- テンプレートに定義されている通常フィールドで、コンポーネントデータに存在しない（`undefined`）場合、デフォルト値で初期化
- オプショナルフィールド（`{$field?:default}`）は初期化されず、`undefined`のまま
- スロット内の子コンポーネントも再帰的に処理

**デフォルト値:**

- テキスト/テキストエリア: テンプレートで指定されたデフォルト値、または空文字列
- リッチテキスト: デフォルト値がある場合は`<p>デフォルト値</p>`、ない場合は`<p></p>`
- 画像: テンプレートで指定されたデフォルト値、または空文字列
- ラジオボタン/セレクトボックス: 最初の選択肢の保存値（`ラベル=値` のときは値）
- チェックボックス/複数選択セレクト: 空配列`[]`
- ブール値: `true`
- タグ: テンプレートで書いたタグ名（選択肢に含まれていない場合は選択肢の最初の保存値）

**実装箇所:**

- `src/core/utils/component-initializer.ts`: `initializeAllComponentFields`関数
- `src/core/composables/useZeroCodeData.ts`: `loadDataFromProps`関数内で呼び出し

## イベント

### save-request

**発火タイミング**: 保存ボタンクリック時のみ

**イベント詳細:**

```typescript
{
  requestId: string; // リクエストID（save-resultイベントで使用）
  source: 'cms' | 'editor' | 'studio'; // 送信元
  targets: string[]; // 保存対象の配列（複数のターゲットが含まれる場合がある）
  timestamp: number; // タイムスタンプ
}
```

**targets配列の仕様:**

- **zcode-cms の編集モード**: `['page', 'images-special']`（ページと専用画像をまとめて保存対象として通知。ホストは `getData()` と `targets` に応じて永続化を決定）
- **zcode-editor のページ管理タブ**: `['page', 'images-special']`（ページ本体と専用画像プール。編集内の画像選択モーダルで専用画像を変更した場合もホストが永続化できる）
- **zcode-studio**: `zcode-editor` と同型のタブ・保存ルール。ページ管理: `['page', 'images-special']`、専用パーツ管理: `['parts-special', 'parts-special-css']`、専用画像管理: `['images-special']`、データビューアは表示中がページ／専用パーツ／専用画像に応じて `page`+`images-special` または `parts-special`+CSS または `images-special`（共通・個別のデータビュー切替はなし）
- **パーツ管理（`primaryTarget: 'parts-common'` 等）**: `[primaryTarget, 'parts-*-css']`（カテゴリに応じたCSSターゲット）
- **画像管理**: `['images-common']` / `['images-individual']` / `['images-special']`
- **データビューア**: 選択中のタブとカテゴリに応じて決定

**注意:** `event.detail` に `data` は含まれない。受信側で `cms.getData()` を呼んで取得する。

**注意事項:**

- `change`イベントは削除済み（保存ボタン以外での自動保存は行わない）
- 画像追加時の自動保存は行わない
- 編集モードのUIでは共通・個別のパーツ用CSSは編集できない（パーツ管理で編集）。専用パーツの編集は `zcode-studio` で行う

### save-result

**発火タイミング**: 保存処理完了時（成功・失敗問わず）

**イベント詳細:**

```typescript
{
  requestId: string; // save-requestのrequestIdと同じ値
  target: string; // 保存対象（'page', 'parts-common', 'parts-individual', 'parts-special', 'images-common', 'images-individual', 'images-special', 'parts-common-css', 'parts-individual-css', 'parts-special-css'）
  ok: boolean; // 保存成功かどうか
  errors: Array<{
    path?: string; // コンポーネントのパス（オプション）
    field?: string; // フィールド名
    message: string; // エラーメッセージ
    code?: string; // エラーコード（オプション）
  }>;
}
```

### zcode-dom-updated

**発火タイミング**: DOMが更新されたとき（コンポーネントの追加・削除・並べ替え、フィールドの編集など）

**用途**: 動的コンテンツ（アコーディオン、タブ、モーダルなど）の初期化

## ファイル構成

### 主要なコンポーネント

- `src/components/ZeroCodeCMS.vue`: ユーザー用管理画面
- `src/components/ZeroCodeEditor.vue`: エンジニア用管理画面（ZeroCodeCMS + パーツ管理・画像管理・データビューア）
- `src/components/ZeroCodeStudio.vue`: 制作会社向け管理画面（専用パーツ・専用CSS・専用画像のみ編集可、それ以外は読み取り専用プレビュー）
- `src/components/ZeroCodePreview.vue`: プレビュー表示用コンポーネント

### コアコンポーザブル

- `src/core/composables/useZeroCodeData.ts`: データ管理（読み込み、取得、設定）
- `src/core/composables/useZeroCodeRenderer.ts`: レンダリング処理

### 機能別コンポーザブル

#### エディタ機能

- `src/features/editor/composables/useEditMode.ts`: 編集モード
- `src/features/editor/composables/useEditorMode.ts`: エディタモード（モード切り替え）
- `src/features/editor/composables/useClickHandlers.ts`: クリックハンドラー
- `src/features/editor/composables/useModeSwitcher.ts`: モード切り替え
- `src/features/editor/composables/useContextMenu.ts`: 右クリックメニュー
- `src/features/editor/composables/useOutlineManager.ts`: アウトライン管理（ホバー・選択状態の表示）

#### モード別機能

- `src/features/add/composables/useAddMode.ts`: 追加モード（追加パネル用）
- `src/features/delete/composables/useDeleteMode.ts`: 削除モード（削除パネル用）
- `src/features/reorder/composables/useReorderMode.ts`: 並べ替えモード（並べ替えパネル用）

#### その他機能

- `src/features/parent-selector/composables/useParentSelector.ts`: 親要素選択
- `src/features/parts-manager/composables/usePartsManager.ts`: パーツ管理
- `src/features/images-manager/composables/useImagesManager.ts`: 画像管理

### ユーティリティ関数

- `src/core/utils/field-syntax.ts`: フィールド記法の単一トークナイザ（`scanFieldTokens`）。DSL文法の一次定義
- `src/core/utils/field-extractor.ts`: テンプレートからのフィールド情報抽出（トークン → `FieldInfo` へのマッピング）
- `src/core/utils/template-processor.ts`: テンプレート処理（トークン → 値展開、z-\* 制御属性、スロット）
- `src/core/utils/component-initializer.ts`: コンポーネント初期化（不足フィールドの自動初期化）
- `src/core/utils/storage.ts`: ローカルストレージ管理（ユーザー設定の保存・読み込み）
- `src/core/utils/dom-utils.ts`: DOM操作ユーティリティ
- `src/core/utils/sanitize.ts`: サニタイズ処理（リッチテキスト、URL、属性値、パーツテンプレート）
- `src/core/utils/path-utils.ts`: パス操作ユーティリティ
- `src/core/utils/image-utils.ts`: 画像処理ユーティリティ
- `src/core/utils/image-scope.ts`: 専用画像の page-id スコープ（フィルタ・追加デフォルト）
- `src/features/parts-manager/monaco-cdn.ts`: Monaco を CDN から読み込む版（`MONACO_VERSION`）。devDependencies の `monaco-editor` と一致させる（`monaco-cdn.test.ts` と E2E で一致、CI の `scripts/audit-monaco.mjs` で脆弱性を検査）
- `src/core/utils/data-version.ts`: データ形式のバージョン（`ZERO_CODE_DATA_VERSION`）と移行処理（`migrateZeroCodeData`）。データ形式を変える場合は version を上げて `MIGRATIONS` に移行処理を追加する
- `src/core/utils/css-manager.ts`: CSS管理
- `src/core/utils/validation.ts`: バリデーション処理
- `src/features/editor/rich-text/`: 自前のリッチテキストエディタのコア（Vue 非依存）
  - `features.ts`: 機能 ID・デフォルト・config の解決（`resolveRichTextFeatures`）
  - `dom.ts`: 編集操作（文字装飾・ブロック・リスト・リンク・水平線）。`execCommand` は使わない
  - `normalize.ts`: 読み込み・貼り付け・出力時の正規化（意味を持つタグのみ、機能制限の適用）
  - `selection.ts`: Shadow DOM 内の選択範囲（`getComposedRanges` / `setBaseAndExtent`）と履歴用のシリアライズ
  - `history.ts`: 元に戻す・やり直しのスナップショット履歴

### レンダラー

- `src/core/renderer/renderer.ts`: レンダリング処理（HTML生成）

### npm エントリポイント

- `src/index.ts`: メインエントリ `zerocodejs`（cms / editor / studio すべて登録。ES + UMD）
- `src/cms-entry.ts`: `zerocodejs/cms` の軽量エントリ（`<zcode-cms>` のみ登録。パーツ管理・画像管理・データビューア・Monaco を含まない）
- `src/ssr-entry.ts`: `zerocodejs/ssr` の公開エントリ（`renderToHtml`、`renderCssToHtml`、`RenderError` のみ。`vite.ssr.config.ts` で `dist/zerocode-ssr.es.js` を生成）

### ビルド構成

- `vite.config.ts`: ES ビルド（`index` + `cms-entry` のマルチエントリ、共有チャンク分割あり。`RichTextEditor` は遅延ロードで別チャンク）
- `vite.umd.config.ts`: CDN 向け UMD 単一ファイル（`inlineDynamicImports` で遅延ロードをインライン化）
- `package.json` の `size-limit` でエントリ別サイズ上限を管理（CI の `Bundle size check` で検証、`npm run size`）

### 検証用 HTML（ルート）

| ファイル                          | 用途                                                                   |
| --------------------------------- | ---------------------------------------------------------------------- |
| `test-cms.html`                   | CMS 基本デモ（インスタンス ID: `test-cms`）                            |
| `test-cms-scope.html`             | 専用画像の `page-id` スコープ検証（インスタンス ID: `test-cms-scope`） |
| `test-dev.html`                   | Editor 全機能デモ                                                      |
| `test-studio.html`                | Studio デモ                                                            |
| `test-pub.html` / `test-ssr.html` | 公開 HTML / SSR 確認                                                   |

起動: `npm run dev` → 各 HTML をブラウザで開く。永続化のモックは `public/js/common.js` の `StorageManager`。

## 実装済み機能

### 完了済み機能

1. ✅ **ローカルストレージ設定保持**（2025年12月5日）
2. ✅ **ブラウザバック対応**（2025年12月5日）
3. ✅ **複数保存ポイント**（2025年12月5日）
4. ✅ **データビューアー改善**（2025年12月）
5. ✅ **編集モードのグループ化**（2025年12月）
6. ✅ **バックエンドデータの挿入**（2025年1月）
7. ✅ **バリデーションチェック&入力制御**（2025年1月）
8. ✅ **空入力制御**（2025年1月）
9. ✅ **複数対応**（2025年1月）
10. ✅ **共通と個別の位置を交換**（2025年1月）
11. ✅ **API対応**（2025年1月）
12. ✅ **スマホ対応**（2025年1月、スワイプジェスチャーはスキップ）
13. ✅ **タグの動的変更**（2025年1月）
14. ✅ **データ永続化の改善**（2025年1月）
    - `sessionStorage`から`localStorage`に変更（別窓でのデータ連動のため）
    - 呼び出し側でリセットボタンを実装（本番環境では不要のため、ZeroCode側には実装しない）
15. ✅ **専用パーツ・画像管理の統一**（2025年1月→2026年3月改修）
    - `zcode-cms` / `zcode-editor` から専用パーツ管理モーダル（`enableSpecialParts`）を削除
    - 専用パーツ・専用CSS・専用画像の編集は `zcode-studio` に一元化
    - 画像選択モーダル（`ImageSelectModal`）は純粋な選択UIに簡素化
16. ✅ **パーツ管理の編集パネルプレビューと表示プレビューの連動**（2025年2月）
    - 編集パネルでフィールドを変更すると「表示プレビュー」タブ・拡大モーダルに同一内容を表示
    - 同じ part_id のページ上コンポーネント（先頭1件）にも値を同期し、表示モード切り替え時に反映
    - `getPartPreviewHtmlWithComponent`（usePartsManager）、`findFirstComponentWithPartId`（path-utils）を追加
17. ✅ **パーツ管理の画像ID参照パネル**（2025年2月）
    - HTMLタブ編集時にサイドパネルに「画像ID参照」タブを追加
    - 画像一覧（サムネイル・ID・名前）を表示、コピー・挿入ボタンでテンプレートに画像IDを挿入可能
    - `{$field:default:image}` の default に指定する画像IDを参照しやすくする
18. ✅ **パーツ編集プレビューの debounce**（2025年2月）
    - テンプレート編集時のプレビュー更新を 300ms debounce
    - 入力のたびに発生していた「Image not found」警告の連発を抑制

19. ✅ **ZeroCodeStudio（制作会社向けコンポーネント）**（2026年3月）
    - `<zcode-studio>` Web Component（シェルは `zcode-editor` と同型、ページ管理は CMS 同等、パーツ/画像/データは専用系に限定）
    - `save-request` の `source: 'studio'` を追加（サーバー側での権限チェック用）
    - パーツテンプレート用サニタイズ関数 `sanitizePartTemplate` を追加（DOMPurify ベース、z-\* 属性許可）
    - `beforeSavePart` フック、`sanitizePartTemplate` オプトインを config から設定可能
    - サニタイズ関数を npm パッケージから export（サーバーとルール共有用）

20. ✅ **Husky + lint-staged（pre-commit）**（2026年3月）

- `git commit` 時に staged ファイルへ ESLint --fix / Prettier を実行
- `eslint-config-prettier` で ESLint と Prettier の競合を回避

21. ✅ **並べ替え D&D・構造リスト（ZC-5）**（2026年6月）

- ReorderPanel 内 SortableJS D&D（page 直下・スロット内）
- プレビュー click-click フォールバック（`reorderSiblingsByPath` で D&D と insert 統一）
- 構造ラベル（`showReorderStructureLabels`）、モード handoff、ミニマップ locate UX
- `page-reorder.ts` に group 解決・移動 API を集約

22. ✅ **専用画像のページスコープ（Phase 1）**（2026年6月）

- `ImageData` に `scope` / `pageId` を追加
- `page-id` 属性（`zcode-cms` / `zcode-editor` / `zcode-studio`）
- CMS 画像選択モーダルで shared + 当該 page のみ表示、追加時は page スコープ
- `src/core/utils/image-scope.ts` でフィルタ・追加デフォルトを共通化
- 検証用 `test-cms-scope.html` を追加

23. ✅ **英語対応（i18n）**（2026年1月）

- vue-i18n ベースで日英のUIロケールを実装（`src/i18n/locales/ja.ts` / `en.ts`）
- 各 Web Component の `locale` 属性で切り替え

24. ✅ **ユニットテスト（Vitest）**（順次拡充中）

- テンプレート処理・パス操作・並べ替え等のコアロジックをカバー（`npm run test`）
- 編集時に関連テストを自動実行（`.claude/hooks/related-tests.sh`）、CI でも全件実行

25. ✅ **E2Eテスト（Playwright）**（2026年7月）

- `e2e/cms-smoke.spec.ts`: `test-cms.html` に対し「パーツ追加 → 編集 → 並べ替え → 保存で `save-request`（`targets: ['page', 'images-special']`）発火」を検証するスモークテスト
- `e2e/rich-text-lazy.spec.ts`: 遅延ロードされるリッチテキストエディタの表示を検証
- `e2e/rich-text-editor.spec.ts`: リッチテキストの書式・リスト・リンク・Undo・貼り付けを検証（chromium / webkit / firefox の3ブラウザで実行）
- 実行: `npm run test:e2e`（vite dev サーバーは `playwright.config.ts` の webServer で自動起動）。UI モード: `npm run test:e2e:ui`
- CI では `e2e` ジョブとして chromium で実行、失敗時は Playwright レポートをアーティファクトに保存
- 注意: パーツ追加直後の選択は編集モードへハンドオフされ編集パネルが自動で開く（テストはこの挙動に依存）

26. ✅ **テンプレートDSL処理系のパーサー化**（2026年7月）

- `field-syntax.ts` を新設: フィールド記法・選択肢記法の単一トークナイザ `scanFieldTokens`（マスタ正規表現2本）
- `field-extractor.ts`（943→約200行）と `template-processor.ts`（1,387→約880行）をトークナイザベースに再設計
- 「optional→group→通常、型→text」の正規表現評価順序契約が消滅。記法追加は field-syntax + マッピング + 解決関数の3箇所で完結
- `VALID_Z_TAG_NAMES`（z-tag のタグ一覧）を field-syntax に一元化、`EditPanelField` を `FieldInfo` の拡張に統一
- キャラクタリゼーションテスト（スナップショット91件）で出力の同一性を機械的に検証。公開API・出力挙動は不変

27. ✅ **ドキュメント・デモサイトの再構成**（2026年7月）

- `docs.html`（2,888行の単一ページ）を4ページに分割: はじめに / テンプレート記法（`docs-template.html`）/ 管理画面とAPI（`docs-api.html`）/ バックエンド連携（`docs-backend.html`）
- 横断検索: `public/js/docs-search-index.js`（自動生成、`scripts/build-docs-search-index.mjs` で再生成）+ 共通 `public/js/docs.js`
- docs 冒頭に読者タイプ別「読む順ガイド」、英語読者への README 案内
- index.html を日本語デフォルトに統一（EN切替維持）、Studio / SSR / Light DOM デモへの導線を追加
- デモページ4枚の「テスト」表記を解消し、「このデモで試せること」ガイドバナーを設置

28. ✅ **モーダルのキーボードアクセシビリティ**（2026年7月）

- `src/core/composables/useModalA11y.ts` を新設: Esc で閉じる（モーダルスタックで最前面のみ・IME 変換取消は無視・`shouldIgnoreEscape` オプション）、Tab のフォーカストラップ、開閉時のフォーカス移動/復元
- 適用: 保存確認ダイアログ / ImageSelectModal（選択・画像編集オーバーレイ）/ パーツ管理のタイプ・パーツ編集モーダル / 抽出済み4モーダル
- ポップオーバー（`usePanelOptionsPopover`）は capture フェーズ + `preventDefault` で先に Esc を処理し、背後のモーダルを閉じない
- Monaco エディタ内の Esc は `shouldIgnoreEscape`（composedPath に `.monaco-editor`）で除外

29. ✅ **バンドル分割と軽量 cms エントリ**（2026年7月）

- `zerocodejs/cms` サブパスを追加（`<zcode-cms>` のみ。初期ロード 圧縮後約100KB、従来比 約6割減）
- Tiptap（RichTextEditor）を `defineAsyncComponent` で遅延ロード化（約115KB を初回のリッチテキスト編集時のみ取得）
- ES ビルドをマルチエントリ + チャンク分割に変更、UMD は `vite.umd.config.ts` で単一ファイルを維持
- size-limit をCIに導入（`npm run size`）

30. ✅ **アクセシビリティ改善（Lighthouse 100点）**（2026年7月）

- 全デモ・ドキュメントページで Lighthouse アクセシビリティスコア 100 を達成（index / docs 4ページ / test-cms / test-dev / test-studio）
- ツールバーのモード切替・保存・設定ボタンに `aria-label` + `aria-pressed` を追加（モバイル幅でテキストが `display:none` になりアクセシブルネームが消えていた問題の修正）
- Editor / Studio の DevTabs タブボタンに `aria-pressed`、設定ボタンに `aria-label` を追加
- コントラスト修正: サイト共通グレー `#7f8c8d`→`#5f6e70`、デモヘッダー背景の暗色化、docs の `code`・パンくず・バッジ・フッター等（すべて WCAG AA 4.5:1 以上を計算検証）
- `.zcode-toolbar-mode-label` 背景を `rgba(55,65,81,0.95)` に変更、`.zcode-dev-tab.active` 背景を `#2563eb` に変更
- ランドマーク: index.html に `<main>`、デモページの `.l-container` に `role="main"` を追加
- サンプルパーツテンプレートの `role="listitem"` の親（`event__items` / `info__items` / `faq__items`）に `role="list"` を追加

31. ✅ **モーダルa11yフォローアップ（ui-reviewer指摘の残課題）**（2026年7月）

- `ImagesManagerPanel.vue` のカテゴリ情報モーダルを `CategoryInfoModal.vue` に統合し重複実装を解消（`useModalA11y` が自動適用）
- `AddPanel.vue` のパーツ拡大プレビューモーダルに `useModalA11y` を適用
- `ImageSelectModal` の画像グリッド（全カテゴリ）に `role="button"` + `tabindex="0"` + Enter/Space ハンドラを追加し、キーボードのみで画像選択可能に
- パーツ編集モーダルにダーティ判定（`usePartsManager.ts` の `isPartDirty`）を追加。未保存の変更がある状態での Esc / × / オーバーレイクリックは `confirm()` で破棄意図を確認してから閉じる
- `ImagesManagerPanel.vue` の画像編集モーダル（差し替え用）にも `useModalA11y` を適用
- `sanitizePartTemplate` の `srcset` 属性の安全性を検証: DOMPurify（v3系）が `srcset` 内の危険なスキーム（`javascript:` 等）を検出すると属性ごと除去することを確認し、`sanitize.test.ts` に特性テストとして固定（実装変更なし。安全側であることが判明したため）

32. ✅ **脆弱性診断の必須対応**（2026年9月）

- DOMPurify 3.4.16 / Tiptap 3.31.3 / ws 8.21 へ更新（既知脆弱性の解消。monaco-editor 同梱の DOMPurify は Editor のコード編集専用のため対象外）
- リッチテキストを編集モードでも無害化（改ざんデータによる Editor / Studio での XSS を防止）
- URL 属性を全展開後の最終値で検査、`xlink:href` を対象に追加（トークン連結・`{key}` プレースホルダー経由の `javascript:` を防止）
- 信頼境界を `TECHNICAL_SPECIFICATION.md` / `docs-backend.html` に明記。回帰テストは `template-processor.security.test.ts`

33. ✅ **リッチテキストエディタの自作化（Tiptap 依存の削除）と機能選択**（2026年10月）

- Tiptap（13パッケージ＋ProseMirror）を削除し、`src/features/editor/rich-text/` に自前実装。遅延チャンクは約115KB→約10KB、UMD は約118KB
- config の `richText.features` でプロダクトごとに使える機能を選択。初期設定は最小限（太字・取り消し線・リンク・箇条書き・番号付きリスト＋元に戻す/やり直すのボタン `history`）。オプトイン: 斜体・下線・水平線・見出し h2〜h4・引用・上付き・下付き・文字の装飾を解除するボタン `clearFormat`（`history` / `clearFormat` はボタンのみで出力に影響しない）
- `sanitizeRichText` の許可リストに `h2` `h3` `h4` `blockquote` `sup` `sub` を追加（config には連動させない）
- 見出し・リスト等のブロック要素で始まるリッチテキストの値を `<p>` で包まないよう修正（包むと HTML の解析で空の `<p>` が生まれていた）
- 動作環境: Chrome 137+ / Firefox 142+ / Safari 17+（`getComposedRanges`）
- E2E を chromium / webkit / firefox で実行（CI の `e2e` ジョブで3ブラウザをインストール）
- 非対応ブラウザ（`getComposedRanges` も `ShadowRoot.getSelection` もない環境）ではツールバーの代わりに案内を表示し、標準の入力に任せる（`isSelectionSupported`）。ランダムな入力・操作列による性質テストを追加し、正規化の不具合を修正。自作を見直す基準を TODO.md に記載
- リンクの入力方式 `richText.link`（2026年10月）: `mode: 'free' | 'select' | 'both'`、候補は `source` で指定した `backendData` のパスの配列（`{ label, url, newTab? }`）。`select` では候補外のリンクを読み込み・貼り付け・保存時に外し、候補の `newTab` を適用。候補の取得前は制限せずリンクボタンを隠す。サーバー検証用に `findDisallowedRichTextLinks` を export。`getBackendDataValue`（template-utils）で backendData の生の値を取り出す
- キーボード操作（ui-reviewer 指摘を反映）: ツールバーはロービング tabindex（Tab で止まるのは1つ、←→ / Home / End で移動）、選択範囲がなくてもボタン操作で本文末尾から開始、リンクボタンは `aria-expanded` / `aria-controls`、リンクフォーム内の Esc は外へ伝えない、Mac の修飾キーは Cmd のみ（Ctrl+B 等の標準カーソル操作を奪わない）、`readonly` / `disabled` フィールドは編集不可。`useModalA11y` のフォーカストラップに `[contenteditable="true"]` を追加

### 未実装（スコープ関連）

- **専用パーツのページスコープ**: Phase 2 以降で検討（画像 Phase 1 完了後）
- **Studio / Editor 画像管理でのスコープ編集 UI**: 現状は全件表示・追加時 `shared`（CMS モーダルが主戦場）

### 保留・スキップ機能

- **権限注意書き**: スキップ（サーバー側で実装されるため）
- **使い方の説明**: 保留（技術ドキュメントは一般ユーザーには不適切）
- **追加パネルのUI改善**: 保留（既存機能で十分）
- **アクセシビリティ対応**: 検討事項（優先度低）
- **複数保存ポイント（バージョン管理）**: 検討事項（優先度低）

### 未実装機能

- （現時点でなし。バンドル分割・テンプレート処理系のパーサー化は改善候補として CHANGELOG / レビュー参照）

## 開発開始時のチェックリスト

新しい機能を実装する前に、以下を確認してください：

### ✅ 実装前の確認事項

- [ ] `TODO.md`でタスクの詳細を確認
- [ ] 関連する既存機能を確認（`AGENTS.md`の「実装済み機能」セクション）
- [ ] データ構造を確認（`AGENTS.md`の「データ構造」セクション）
- [ ] テンプレート記法の仕様を確認（`AGENTS.md`の「テンプレート記法」セクション）
- [ ] 実装時の注意事項を確認（`AGENTS.md`の「実装時の注意事項」セクション）
- [ ] ファイル構成を確認（`AGENTS.md`の「ファイル構成」セクション）
- [ ] 関連する既存コードを確認（参考リンクから）

### ✅ 実装中の確認事項

- [ ] コーディングスタイルに従っている（`AGENTS.md`の「コードスタイル」セクション）
- [ ] HTMLタグの使用方針に従っている（`AGENTS.md`の「HTMLタグの使用方針」セクション）
- [ ] テンプレート記法の処理順序を守っている（`AGENTS.md`の「テンプレート記法の処理順序」セクション）
- [ ] イベントの仕様に従っている（`AGENTS.md`の「イベント」セクション）

### ✅ 実装後の更新事項

- [ ] `TODO.md`の該当タスクを完了に更新
- [ ] `AGENTS.md`の「実装済み機能」に追加（必要に応じて）
- [ ] `TECHNICAL_SPECIFICATION.md`を更新（API変更がある場合）
- [ ] `docs*.html`（4ページ構成）を更新（ユーザー向けドキュメントに影響がある場合）。見出しを追加・変更したら `node scripts/build-docs-search-index.mjs` で検索インデックスを再生成

## 実装時の注意事項

### データ保存の仕様

- **保存は`save-request`イベントのみ**: `change`イベントは削除済み
- **保存ボタンクリック時のみ発火**: 自動保存は行わない
- **画像追加時の自動保存は行わない**: 保存ボタンで一括保存
- **編集モードでの保存対象（zcode-cms）**: `['page', 'images-special']`。**編集モードでの保存対象（zcode-editor / zcode-studio のページ管理タブ）**: `['page', 'images-special']`（共通・個別の `parts-*-css` はページ編集のバンドルには含めず、パーツ管理タブの保存で扱う）
- **パーツ管理での保存対象**: `parts-common`/`parts-individual`/`parts-special`、対応する`parts-common-css`/`parts-individual-css`/`parts-special-css`

### テンプレート記法の実装

- **処理順序を守る**: `z-if` → `z-tag` → `z-empty` → `z-for` → `z-slot`の順で処理
- **特殊属性の削除**: 各処理内で個別に属性を削除（`z-if`、`z-empty`、`z-for`、`z-slot`は処理後に削除、`z-tag`は新しい要素にコピーしない）
- **セキュリティ**: 有効なタグ名のみ許可（`z-tag`の場合）
- **信頼境界**: パーツテンプレート・CSS・`backendData` は信頼する入力（無害化しない）、CMS のフィールド値は信頼しない入力（公開・編集・SSR すべてで無害化）。詳細は `TECHNICAL_SPECIFICATION.md` の「セキュリティモデル（信頼境界）」
- **URL 属性**: トークン単位ではなく、`markTemplatedUrlAttributes` / `sanitizeMarkedUrlAttributes` で全展開後の最終値を検査する。URL 属性を追加する場合は `isUrlAttribute` に追加する
- **CSP**: `unsafe-eval` を必要としない状態を保つ（`eval` / `new Function` を使わない。vue-i18n は各 vite 設定の `__INTLIFY_JIT_COMPILATION__: true` で JIT コンパイル）。回帰テストは `e2e/csp.spec.ts`
- **DOMPurify のテスト**: happy-dom 上では DOMPurify 3.4 の無害化が機能しないため、無害化を検証するテストは `// @vitest-environment jsdom` を付ける
- **リッチテキストエディタ**: `document.execCommand` で編集操作をしない（文字装飾は計算済みスタイルで判定されて見出し内で `font-weight: normal` の span が入る、WebKit では Shadow DOM 内のリスト操作がホスト要素を壊す）。操作は `src/features/editor/rich-text/dom.ts` にタグ基準で実装し、Undo も自前の履歴で扱う。選択範囲は `selection.ts` 経由で読み書きする（WebKit では `getSelection().getRangeAt()` / `addRange()` が shadow 内で使えない）
- **リッチテキストの性質テスト**: `src/features/editor/rich-text/rich-text.property.test.ts` がランダムな入力・操作列で正規化と編集操作の性質を検証する。失敗時のメッセージの seed は `RICH_TEXT_PROPERTY_FROM=<seed> RICH_TEXT_PROPERTY_RUNS=1` で再現できる。jsdom は1プロセスで大量に DOM を作るほど遅くなるため、多く回すときは `FROM` をずらして分割する
- **リッチテキストの機能を増やす前に**: TODO.md の「自作を見直す基準」を確認する（表・埋め込み・入れ子リスト・共同編集などは自作を広げず、ProseMirror 系への回帰を含めて再検討する）
- **リッチテキストの機能**: 機能を追加する場合は `features.ts`（ID）、`dom.ts`（操作）、`normalize.ts`（許可タグ・機能制限）、`sanitize.ts` の `sanitizeRichText` の許可リスト、`RichTextEditor.vue`（ツールバー）、i18n の `richText` を更新する
- **オプショナルフィールド**: `undefined`のまま残す（初期化しない）

### コンポーネント初期化

- **データ読み込み時に自動実行**: `loadDataFromProps`関数内で`initializeAllComponentFields`を呼び出し
- **再帰的処理**: スロット内の子コンポーネントも処理
- **オプショナルフィールドはスキップ**: `undefined`のまま

### イベント処理

- **`save-request`イベント**: 保存ボタンクリック時のみ発火
- **`save-result`イベント**: 各ターゲットごとに発火（`requestId`で対応付け）
- **`zcode-dom-updated`イベント**: DOM更新時に発火（動的コンテンツの初期化用）

## 実装パターン集

よく使う実装パターンをまとめています。新しい機能を実装する際の参考にしてください。

### パターン1: 新しいテンプレート記法を追加する

**手順:**

1. `extractFieldsFromTemplate`でフィールド情報を抽出
2. `processTemplateWithDOM`でテンプレートを処理
3. 編集パネルでUIを追加（必要に応じて）

**例: 新しいフィールドタイプ「カラー」を追加する場合**

```typescript
// src/core/utils/template-processor.ts

// 1. extractFieldsFromTemplateで抽出
const colorRegex = /\{\$(\w+):([^:}]+):color\}/g;
// ... マッチした場合、type: 'color'を設定

// 2. processTemplateWithDOMで処理
if (field.type === 'color') {
  const colorValue = component[field.name] || field.defaultValue;
  // カラー値で置換
}
```

### パターン2: 新しいイベントを発火する

**手順:**

1. `dispatchEvent`でカスタムイベントを発火
2. イベント詳細を`detail`に含める
3. `TECHNICAL_SPECIFICATION.md`に仕様を記載

**例: `component-added`イベントを追加する場合**

```typescript
// src/components/ZeroCodeCMS.vue

const handleAddComponent = () => {
  // ... コンポーネント追加処理

  dispatchEvent('component-added', {
    componentId: newComponent.id,
    partId: newComponent.part_id,
    path: componentPath,
    timestamp: Date.now()
  });
};
```

### パターン3: 新しいコンポーザブルを作成する

**手順:**

1. `src/features/`配下に適切なディレクトリを作成
2. `composables/`ディレクトリに`use*.ts`を作成
3. Composition APIのパターンに従う

**例: `useValidation.ts`を作成する場合**

```typescript
// src/features/validation/composables/useValidation.ts

import { ref, computed } from 'vue';
import type { ComponentData } from '../../../types';

export function useValidation() {
  const errors = ref<Record<string, string>>({});

  const validate = (component: ComponentData, fieldName: string) => {
    // バリデーション処理
  };

  const isValid = computed(() => {
    return Object.keys(errors.value).length === 0;
  });

  return {
    errors,
    validate,
    isValid
  };
}
```

### パターン4: データの取得・設定を行う

**手順:**

1. `useZeroCodeData`から`getData`と`setData`を取得
2. パスを指定してデータを操作

**例: コンポーネントのフィールドを更新する場合**

```typescript
import { useZeroCodeData } from '@/core/composables/useZeroCodeData';

const { getData, setData } = useZeroCodeData();

// データ取得
const component = getData('page', [0]); // page[0]のコンポーネント

// データ設定
setData('page', [0, 'title'], '新しいタイトル');
```

**注意**: `getData`と`setData`の実際のAPIは異なります。正しい使用方法は以下を参照：

```typescript
// 実際のAPI（useZeroCodeData.tsより）
const { getData, setData } = useZeroCodeData(props);

// データ取得（パス文字列で指定）
const pageData = getData('page'); // pageデータ全体
const component = pageData[0]; // 最初のコンポーネント

// データ設定（パス文字列と値で指定）
setData('page.0.title', '新しいタイトル');
// または全体更新
setData({ page: [...], parts: {...}, ... });
```

### パターン5: テンプレート記法の処理順序を守る

**重要**: テンプレート記法は必ず以下の順序で処理してください。

```typescript
// src/core/utils/template-processor.ts の processTemplateWithDOM 内

// 1. テキストノードの変数展開
// 2. 属性内の変数展開
// 3. z-if 処理
// 4. z-tag 処理
// 5. z-empty 処理
// 6. z-for 処理
// 7. z-slot 処理
```

### パターン6: コンポーネントの初期化処理を追加する

**手順:**

1. `component-initializer.ts`の`getDefaultFieldValue`に新しいタイプを追加
2. 必要に応じて`initializeComponentFields`を拡張

**例: 新しいフィールドタイプのデフォルト値を設定**

```typescript
// src/core/utils/component-initializer.ts

function getDefaultFieldValue(field: FieldInfo): any {
  switch (field.type) {
    case 'color':
      return field.defaultValue || '#000000';
    // ... 他のタイプ
  }
}
```

## トラブルシューティング

よくある問題と解決方法をまとめています。

### 問題1: テンプレート記法が正しく処理されない

**症状:**

- フィールドが表示されない
- デフォルト値が適用されない
- 条件分岐が動作しない

**確認事項:**

1. テンプレート記法の構文が正しいか確認
2. `extractFieldsFromTemplate`でフィールドが正しく抽出されているか確認
3. `processTemplateWithDOM`の処理順序が正しいか確認
4. ブラウザのコンソールでエラーがないか確認

**解決方法:**

```typescript
// デバッグ用: フィールド情報を確認
const fields = extractFieldsFromTemplate(template);
console.log('Extracted fields:', fields);

// デバッグ用: 処理後のHTMLを確認
const processed = processTemplateWithDOM(template, component, ...);
console.log('Processed HTML:', processed);
```

### 問題2: イベントが発火しない

**症状:**

- `save-request`イベントが発火しない
- カスタムイベントがリスナーに届かない

**確認事項:**

1. `dispatchEvent`が正しく呼び出されているか確認
2. イベント名が正しいか確認（ケバブケース: `save-request`）
3. イベントリスナーが正しく設定されているか確認
4. Web Componentsのイベントバブリングを確認

**解決方法:**

```typescript
// イベント発火の確認
const event = dispatchEvent('save-request', { ... });
console.log('Event dispatched:', event);

// イベントリスナーの確認
element.addEventListener('save-request', (e) => {
  console.log('Event received:', e.detail);
});
```

### 問題3: データが保存されない

**症状:**

- 保存ボタンをクリックしてもデータが更新されない
- `save-result`イベントでエラーが返る

**確認事項:**

1. `save-request`イベントが正しく発火しているか確認
2. `targets`配列が正しく設定されているか確認
3. サーバー側のエラーレスポンスを確認
4. バリデーションエラーがないか確認

**解決方法:**

```typescript
// save-requestイベントの確認
element.addEventListener('save-request', (e) => {
  console.log('Save request:', e.detail);
  // targets配列を確認
  console.log('Targets:', e.detail.targets);
});

// save-resultイベントの確認
element.addEventListener('save-result', (e) => {
  console.log('Save result:', e.detail);
  if (!e.detail.ok) {
    console.error('Errors:', e.detail.errors);
  }
});
```

### 問題4: コンポーネントの初期化が動作しない

**症状:**

- 新しいフィールドが初期化されない
- デフォルト値が適用されない

**確認事項:**

1. `initializeAllComponentFields`が呼び出されているか確認
2. オプショナルフィールドの場合は初期化されない（仕様）
3. テンプレートにフィールドが定義されているか確認

**解決方法:**

```typescript
// 初期化処理の確認
import { initializeAllComponentFields } from '@/core/utils/component-initializer';

// データ読み込み後に自動実行されるが、手動で確認する場合
const initialized = initializeAllComponentFields(cmsData);
console.log('Initialized components:', initialized);
```

### 問題5: テンプレート記法の処理順序が正しくない

**症状:**

- `z-if`と`z-for`が同時に使えない
- 条件分岐が期待通りに動作しない

**確認事項:**

1. 処理順序が正しいか確認（`z-if` → `z-tag` → `z-empty` → `z-for` → `z-slot`）
2. 特殊属性が正しく削除されているか確認
3. ネストされた記法の処理を確認

**解決方法:**

```typescript
// 処理順序の確認
// processTemplateWithDOM内で各処理の前後にログを追加
console.log('Processing z-if...');
// z-if処理
console.log('Processing z-tag...');
// z-tag処理
// ...
```

### 問題6: パフォーマンスの問題

**症状:**

- 大量のコンポーネントで遅延が発生する
- レンダリングが重い

**確認事項:**

1. 不要な再レンダリングがないか確認
2. 大量データの処理方法を確認
3. メモ化が必要か確認

**解決方法:**

```typescript
// パフォーマンス測定
const start = performance.now();
// 処理実行
const end = performance.now();
console.log(`Processing time: ${end - start}ms`);

// Vueのcomputedやwatchの最適化
const expensiveValue = computed(() => {
  // 重い処理
});
```

## 参考リンク

### 主要なソースファイル

- [テンプレートプロセッサー](./src/core/utils/template-processor.ts) - テンプレート記法の処理
- [コンポーネント初期化](./src/core/utils/component-initializer.ts) - フィールドの自動初期化
- [ZeroCodeCMS](./src/components/ZeroCodeCMS.vue) - ユーザー用管理画面
- [ZeroCodeEditor](./src/components/ZeroCodeEditor.vue) - エンジニア用管理画面
- [データ管理](./src/core/composables/useZeroCodeData.ts) - データの読み込み・取得・設定
- [SSR エントリ](./src/ssr-entry.ts) - npm サブパス `zerocodejs/ssr`

### ドキュメント

- [TODO.md](./TODO.md) - 実装タスク一覧
- [技術仕様書](./TECHNICAL_SPECIFICATION.md) - 外部向け技術仕様
- [ドキュメント](./docs.html) - ユーザー向けドキュメント（はじめに / [テンプレート記法](./docs-template.html) / [管理画面とAPI](./docs-api.html) / [バックエンド連携](./docs-backend.html) の4ページ構成）

---

**最終更新日**: 2026年6月
