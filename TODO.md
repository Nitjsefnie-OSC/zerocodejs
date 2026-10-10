# ZeroCode.js 実装TODO

> **このファイルの目的**: 実装タスクの一覧と進捗管理です。各タスクの詳細、実装方針、実装状況を記載しています。

**開発開始時**: タスクの詳細を確認し、`AGENTS.md`の「開発開始時のチェックリスト」を参照してください。

## Phase 1: 基盤整備（優先度: 高）

### 1. ✅ ローカルストレージ設定保持【完了】

- **複雑度**: 低
- **内容**: UI切り替え系の設定をローカルストレージに保存
- **対象設定**:
  - 「ページの動作を有効にする」チェックボックス
  - 「テンプレート記法の予測変換」チェックボックス
  - その他のUI設定
- **実装方針**:
  - ユーザー設定を `localStorage` に保存
  - ページ読込時に設定を復元
  - 設定変更時に自動保存
- **実装済み**: 2025年12月5日
  - `src/core/utils/storage.ts` を新規作成
  - 保存対象: `allowDynamicContentInteraction`, `showDataViewer`, `devRightPadding`, `enableTemplateSuggestions`
  - ストレージキー: `zcode-user-settings`

### 2. 権限注意書き（編集用）【スキップ】

- **複雑度**: 低
- **内容**: エンジニア向け管理画面（`zcode-editor`）に権限者専用である旨の注意書きを表示
- **実装方針**:
  - 警告バナーをヘッダーに追加
  - 「この画面は管理者専用です」等のメッセージ
  - 目立つデザイン（背景色、アイコン等）
- **スキップ理由**:
  - 権限管理はサーバー側で実装されるため、フロントエンドの注意書きは実質的なセキュリティ効果がない
  - セキュリティ注意は既にドキュメント（README.md、TECHNICAL_SPECIFICATION.md）に記載済み
  - UIの煩雑化を避けるため
- **スキップ日**: 2025年12月

### 3. ✅ ブラウザバック対応【保留】

- **複雑度**: 低〜中
- **内容**: 編集中にブラウザの戻るボタンで離脱するのを防止
- **実装方針**:
  - `beforeunload` イベントで警告表示
  - 未保存の変更がある場合のみ警告
  - 「変更が保存されていません。本当に離脱しますか？」
- **実装済み**: 2025年12月5日
  - 初期データのスナップショットを保存
  - `cmsData` の変更を監視して未保存変更を検知
  - 保存完了時に `zcode-saved` イベントを発火
  - 未保存変更がある場合のみ `beforeunload` で警告表示

---

## Phase 2: 編集体験の改善（優先度: 高）

### 4. ✅ 複数保存ポイント（編集用）【完了】

- **複雑度**: 中
- **内容**: 各編集操作ごとに個別保存が必要な現状を改善
- **実装方針**:
  - ZeroCode側に保存ボタンを設置（左下固定）
  - 呼び出し側でボタンクリックを検知して保存処理を実行
  - カスタムイベント `save-request` を発火
- **対象**:
  - ページ用の保存ボタン（ZeroCodeCMS）
  - パーツ用（共通/個別）の保存ボタン（ZeroCodeEditor経由）
  - 画像用（共通/個別）の保存ボタン（ZeroCodeEditor経由）
  - データビューア用の保存ボタン（ZeroCodeEditor経由、選択中のタブとカテゴリに応じて出し分け）
- **実装済み**: 2025年12月5日（データビューア対応: 2025年12月）
  - 各コンポーネントに保存ボタンを追加（左下固定）
  - イベント発火機能を実装（Web Component経由）
  - CSSスタイルを追加
  - イベント詳細: `{ target: 'page' | 'parts-common' | 'parts-individual' | 'images-common' | 'images-individual', timestamp: number }`
  - リセットボタンは呼び出し側で実装（本番環境では不要のため、ZeroCode側には実装しない）
  - データビューアタブでも保存機能を実装（`internalActiveTab`と`activeCategory`に応じて適切なターゲットで保存）
  - データ永続化を`localStorage`に変更（別窓でのデータ連動のため、2025年1月）

### 5. ✅ データビューアー改善（編集用）【完了】

- **複雑度**: 中
- **内容**: データビューアーを見やすく改善し、保存機能を追加
- **実装方針**:
  - メインタブとして統合（ページ管理/パーツ管理/画像管理/データビューアー）
  - 内部タブ切り替えUI（ページ / パーツ / 画像）
  - フォーマット/カテゴリタブ（JSON/HTML、共通/個別）
  - JSON/HTMLフォーマット表示（ページのみHTML対応）
  - コピー機能
  - 保存ボタンで出し分け（選択中のタブとカテゴリに応じて適切なターゲットで保存）
- **実装済み**: 2025年12月
  - データビューアをメインタブ「データビューアー」として統合
  - 内部タブ（ページ/パーツ/画像）とフォーマット/カテゴリタブを実装
  - コピー機能を実装（右上にアイコンボタン）
  - 編集モードを削除（表示専用）
  - 保存ボタンで出し分け機能を実装
    - `internalActiveTab === 'page'` → `target = 'page'`
    - `internalActiveTab === 'parts'` → `activeCategory`に応じて`'parts-common'`または`'parts-individual'`
    - `internalActiveTab === 'images'` → `activeCategory`に応じて`'images-common'`または`'images-individual'`
  - `DataViewer.vue`で`defineExpose({ internalActiveTab, activeCategory })`を実装
  - `ZeroCodeEditor.vue`の`handleSave()`でデータビューアタブの処理を追加

### 6. 使い方の説明【保留】

- **複雑度**: 低〜中
- **内容**: オンボーディング、ヘルプ機能の追加
- **実装方針**:
  - ツールチップ（各機能の簡易説明）
  - ヘルプモーダル（詳細な使い方）
  - チュートリアルモード（初回起動時）
  - ~~ドキュメントへのリンク~~（削除：技術ドキュメントは一般ユーザーには不適切）
- **保留理由**:
  - 技術ドキュメント（`docs.html`）はエンジニア向けの内容で、一般ユーザーには不適切
  - 既存のUIが直感的で、追加のヘルプ機能の必要性が低い
  - ユーザー向けの簡易ガイドを作成する場合は、別途検討が必要
- **試行実装と削除**: 2025年12月
  - 設定パネルに「ドキュメントを見る」リンクを追加したが、技術ドキュメントは一般ユーザーには不適切と判断し削除

---

## Phase 3: CMS機能強化（優先度: 中）

### 7. ✅ 編集モードのグループ化【完了】

- **複雑度**: 中
- **内容**: 編集パネルのフィールドをグループ化して見やすく
- **記法**: ドット記法（`.`）
  ```html
  {$フィールド名.グループ名:デフォルト値} ($フィールド名.グループ名@:選択肢1|選択肢2)
  ```
- **実装方針**:
  - グループ指定は**オプション**（指定なしは「other」グループ）
  - グループ名は**英語のみ**（UI表示はグループ名をそのまま表示）
  - 編集パネルにグループ切り替えタブ（複数グループがある場合のみ表示）
  - 正規表現パターンの追加
    ```typescript
    const TEXT_FIELD_WITH_GROUP = /\{\$(\w+)\.(\w+):([^}]+)\}/g;
    const SELECT_FIELD_WITH_GROUP = /\(\$(\w+)\.(\w+)@:([^)]+)\)/g;
    ```
- **実装済み**: 2025年12月
  - `template-processor.ts`: グループ付き正規表現パターンを追加
  - `FieldInfo`インターフェースに`groupName`を追加
  - `extractFieldsFromTemplate`関数でグループ名を抽出（テキストノードと属性内の両方に対応）
  - `useEditMode.ts`: `editingAvailableFields`に`groupName`を追加
  - `EditPanel.vue`: グループタブUIとフィルタリングロジックを実装
  - CSS: グループタブのスタイルを追加
  - グループ化の記述がない場合は全てのフィールドを表示（タブ非表示）
  - 複数グループがある場合のみタブを表示

### 8. 追加パネルのUI改善【保留】

- **複雑度**: 中
- **内容**: パーツ追加パネルの使いやすさ向上
- **実装方針**:
  - ~~コピー機能（既存パーツの複製）~~ ✅ 実装済み（「選択したパーツ」タブで既存パーツの複製が可能）
  - ~~プレビュー表示（パーツのサムネイル）~~ ✅ 実装済み（`zcode-module-preview-content`で各パーツのプレビュー表示、拡大プレビューモーダルも実装済み）
  - 検索・フィルター機能
  - ドラッグ&ドロップ対応
  - お気に入り機能
- **保留理由**:
  - 既存の機能（コピー機能、プレビュー表示）で十分な操作性を確保できている
  - 提案されている追加機能（検索・フィルター、ドラッグ&ドロップ、お気に入り）の必要性が低いと判断
- **保留日**: 2025年12月

### 9. 英語対応（i18n）

- **複雑度**: 中
- **内容**: 多言語化対応
- **実装方針**:
  - `vue-i18n` の導入
  - 言語切り替えUI（設定パネルヘッダー内）
  - 翻訳ファイルの作成（日本語・英語）
  - ローカルストレージへの保存
  - 将来的に中国語などにも対応可能な設計
- **仕様書**: [I18N_SPECIFICATION.md](./I18N_SPECIFICATION.md)
- **ステータス**: 仕様確定、実装保留

### 10. ✅ バックエンドデータの挿入【完了】

- **複雑度**: 中
- **内容**: 動的URLや共通で使用するデータをバックエンドから渡してテンプレート内で使用可能にする
- **実装方針**:
  - propsで`backend-data`属性を受け取る（JSON文字列）
  - テンプレート記法を拡張: `{@fieldName}` でバックエンドデータを参照
  - 配列対応: `{@items[0]}`, `{@items[0].name}`, `{@items.length}` など
  - URL内のプレースホルダーも展開: `/shop/{shop_id}/` → `/shop/123/`
  - `processTemplateWithDOM`関数に`backendData`パラメータを追加
  - パス解決関数を実装（ネストされたオブジェクト、配列インデックス対応）
- **使用例**:

  ```html
  <!-- テンプレート -->
  <div class="shop-header">
    <h1>{@title}</h1>
    <a href="{@url}">店舗詳細</a>
    <div z-for="menu in {@menus}">
      <a href="{menu.url}">{menu.label}</a>
    </div>
  </div>

  <!-- バックエンドデータ -->
  { "url": "/shop/123/", "title": "A店舗", "menus": [ {"label": "商品", "url": "/shop/123/products"}
  ] }
  ```

- **注意点**:
  - セキュリティ: バックエンドデータは信頼できるソースからのみ使用
  - エスケープ: URLやHTML属性に使用する場合は適切にエスケープ
  - エラーハンドリング: 存在しないパスは空文字を返す
- **実装済み**: 2025年1月
  - `{@fieldName}`記法を実装
  - `resolveBackendDataPath`関数でパス解決を実装
  - `processTemplateWithDOM`関数に`backendData`パラメータを追加
  - 配列インデックス、ネストされたオブジェクトに対応

### 11. ✅ バリデーションチェック&入力制御【完了】

- **複雑度**: 中
- **内容**: CMS側で編集モードや追加モードで、ユーザーの制御が行える仕様を検討
- **実装方針**:
  - フィールド単位のバリデーション設定（文字数、形式、必須チェック）
  - 編集可否の制御（`readonly`、`disabled`相当）
  - 権限に応じた編集制限（既存のCMS→パーツ編集不可は実装済み）
  - テンプレート記法の拡張: `{$field:default:type:required:maxLength=100}` など
  - バリデーションエラーの表示
- **実装済み**: 2025年1月
  - テンプレート記法: `{$field:default:required:max=100}`、`:readonly`、`:disabled`を実装
  - `parseValidationFromTokens`関数でバリデーション記法をパース
  - `EditPanel.vue`でリアルタイムバリデーションを実装
  - エラーメッセージの表示機能を実装
  - 文字数カウンター（`maxLength`指定時）を実装
  - フロントエンドでは`required`と`max`をサポート、複雑なバリデーションはバックエンドで実施

### 12. ✅ 空入力制御【完了】

- **複雑度**: 中
- **内容**: 現在編集モードのテキスト入力が必ずデフォルト値が入るが、ユーザーが何も入力しなかった場合は、何も設定しない仕様をオプションとして検討
- **実装方針**:
  - テンプレート記法を拡張: `{$field?:default}` でオプショナルフィールドを指定
  - `extractFieldsFromTemplate`で`?`記号を検出
  - `createComponentFromTypeRecursive`でオプショナルフィールドは`undefined`を設定
  - 既存データとの互換性を維持（`?`がない場合は従来通りデフォルト値を設定）
- **使用例**:

  ```html
  <!-- オプショナルフィールド -->
  <div>{$text?:デフォルト値:rich}</div>

  <!-- 空入力時はundefined、テンプレート側でz-ifで制御可能 -->
  <div z-if="{$text}">
    <p>{$text?:デフォルト値:rich}</p>
  </div>
  ```

- **注意点**:
  - 既存データとの互換性（既存はデフォルト値あり）
  - 空値の扱い（`undefined` vs `null` vs `''`）
  - テンプレート側での条件分岐（`z-if`で空値チェック）
- **実装済み**: 2025年1月
  - `{$field?:default}`記法を実装（テキスト、リッチテキスト、テキストエリア、画像に対応）
  - `extractFieldsFromTemplate`で`?`記号を検出して`optional: true`を設定
  - オプショナルフィールドは空入力時`undefined`を設定
  - 属性値がオプショナルフィールドのみで空の場合は属性を削除

### 13. ✅ 複数対応【完了】

- **複雑度**: 中
- **内容**: 複数のZeroCodeインスタンスに対応できるか確認・実装
- **実装方針**:
  - インスタンスIDを付与して分離
  - イベントリスナーのスコープを各インスタンスごとに分離
  - IDの重複回避（`generateId()`の確認）
  - ローカルストレージのキーをインスタンスごとに分離（`sessionStorage`から`localStorage`に変更）
  - `common.js`のイベントリスナーをインスタンス単位で管理
- **実装済み**: 2025年1月
  - `getInstanceId()`関数でインスタンスIDを取得または生成
  - `getStorageKey()`関数でインスタンスごとにストレージキーを分離
  - `StorageManager`でインスタンスIDに対応した保存・読み込みを実装（`localStorage`を使用）
  - `setupSaveResetListeners()`で各コンポーネントに個別にイベントリスナーを設定
  - インスタンス間でのデータ分離を実現
  - 別窓でのデータ連動のため、`sessionStorage`から`localStorage`に変更（2025年1月）

### 14. ✅ 共通と個別の位置を交換【完了】

- **複雑度**: 低
- **内容**: タブの順序をpropsで任意指定できるようにする
- **実装方針**:
  - `CMSConfig`に`categoryOrder`を追加（`'common'` | `'individual'`）
  - `PartsManagerPanel.vue`、`ImagesManagerPanel.vue`、`DataViewer.vue`で適用
  - デフォルトは`'common'`（既存の動作を維持）
- **実装箇所**:
  - `src/types/index.ts`: `CMSConfig`インターフェースに追加
  - `PartsManagerPanel.vue`: タブの順序を制御
  - `ImagesManagerPanel.vue`: タブの順序を制御
  - `DataViewer.vue`: カテゴリタブの順序を制御
- **実装済み**: 2025年1月
  - `CMSConfig`に`categoryOrder?: 'common' | 'individual'`を追加
  - 各パネルで`categoryOrder`に基づいてタブの順序と初期選択を制御
  - `categoryOrder === 'individual'`の場合、個別タブを先に表示し初期選択

### 15. ✅ タグの動的変更【完了】

- **複雑度**: 中
- **内容**: HTMLタグを動的に変更できる機能（例: h1~h6を選べる、divやliを切り替える）
- **実装方針**:
  - 新しい属性 `z-tag` を追加
  - 記法: `<h2 z-tag="$tagName:h1|h2|h3">{$content:コンテンツ}</h2>`
  - テンプレートで書いたタグ名がデフォルト値として使用される
  - 選択肢を指定可能（`z-tag="$tagName:h1|h2|h3"`）または全量表示
  - `$tagName` フィールドの値でタグ名を動的に変更
  - 編集パネルでセレクトボックスでタグを選択
  - 対応タグ: h1-h6, div, p, span, li, ul, ol, section, article, aside, nav, header, footer, main, figure, figcaption, blockquote, pre, code, table, thead, tbody, tr, th, td
  - `extractFieldsFromTemplate` で `z-tag` 属性を検出してフィールドとして登録
  - `processTemplateWithDOM` で `z-tag` 属性を処理してタグ名を動的に変更
  - フィールドタイプは `tag` として扱い、編集パネルでタグ選択UIを表示
- **使用例**:

  ```html
  <!-- 見出しタグを動的に変更（h2をデフォルト） -->
  <h2 z-tag="$headingTag:h1|h2|h3" class="title">{$title:タイトル}</h2>
  <!-- headingTagが"h1"の場合 → <h1 class="title">タイトル</h1> -->
  <!-- headingTagが"h2"の場合 → <h2 class="title">タイトル</h2> -->

  <!-- リストアイテムのタグを変更 -->
  <li z-tag="$itemTag:li|div|span" class="list-item">{$item:項目}</li>
  <!-- itemTagが"li"の場合 → <li class="list-item">項目</li> -->
  <!-- itemTagが"div"の場合 → <div class="list-item">項目</div> -->
  ```

- **実装済み**: 2025年1月
  - `src/core/utils/template-processor.ts`: `z-tag` 属性の検出と処理を実装
  - `src/features/editor/components/EditPanel.vue`: タグ選択UIを実装
  - `src/features/editor/composables/useEditMode.ts`: タグフィールドの処理を実装
  - `src/styles/zcode-cms.css`: タグ選択エディタのスタイルを追加
  - `docs.html`: ドキュメント追加
  - `src/features/parts-manager/components/MonacoEditor.vue`: 予測変換に追加

### 16. ✅ テストコード【実装済み・順次拡充】

- **複雑度**: 中〜高
- **実装状況**:
  - ✅ 単体テスト: Vitest（テンプレート処理・パス操作・並べ替え等のコアロジック、`npm run test`）。CI で全件実行
  - ✅ E2Eテスト: Playwright（2026年7月導入）。`e2e/cms-smoke.spec.ts` で「追加 → 編集 → 並べ替え → 保存イベント発火」を検証（`npm run test:e2e`）。CI の `e2e` ジョブで chromium 実行
  - 未着手: 統合テスト（Web Component 属性・イベントの網羅）、E2E のシナリオ拡充（editor / studio、画像選択、スロット操作）
- **検討事項（残）**:
  - テストカバレッジの目標値

---

## Phase 4: 高度な機能（優先度: 中〜低）

### 17. API対応

- **複雑度**: 中〜高
- **内容**: バックエンドとの連携機能
- **実装方針**:
  - **ZeroCode.js側**: 保存リクエストイベントの発火（保存ボタンクリック時のみ）
  - **ユーザー側**: イベントをリッスンして保存先を選択
    - セッションストレージ（既存、`common.js`）
    - API経由（ユーザーが実装）
    - localStorage、IndexedDB等（ユーザーが実装）
  - **責務分離**:
    - ZeroCode.js: データの入出力インターフェース、編集UI
    - ユーザー: データの保存先選択、保存・読込ロジック、ローディング状態の管理
- **実装済み**: 2025年1月
  - `save-request` イベント（保存ボタンクリック時のみ発火）
  - `save-result` イベント（保存結果・エラーハンドリング）
  - `requestId` によるリクエスト/レスポンスの対応付け
  - **方針**: 保存ボタン以外での自動保存は行わない（`change`イベントは削除済み）
- **ローディング状態の管理について**:
  - ローディング状態の管理（UI表示）は呼び出し側で実装する
  - 理由: 責務分離の観点から、保存・読込ロジックの一部として呼び出し側で管理する方が適切
  - 実装方法: `save-request`イベント受信時にローディングUIを表示し、`save-result`イベント受信時に非表示にする

### 18. スマホ対応＆デザイン調整

- **複雑度**: 中〜高
- **内容**: レスポンシブ対応、全体的なデザイン改善
- **実装方針**:
  - モバイルでの操作性確保
  - タッチ操作対応
  - 画面サイズに応じたレイアウト変更
  - パネルの折りたたみ
  - ~~スワイプジェスチャー~~（スキップ）
- **実装済み**: 2025年1月
  - レスポンシブ対応（`@media (max-width: 768px)`）
  - パネルのモバイル配置（画面下部固定）
  - ツールバーのモバイル最適化
  - タッチスクロール対応（`-webkit-overflow-scrolling: touch`）
  - 保存ボタンのFABスタイル
- **スキップ理由**:
  - スワイプジェスチャーの需要が低いと判断
  - 既存のレスポンシブ対応でモバイルでの操作性は確保できている
  - 実装コストに対して効果が限定的
- **スキップ日**: 2025年1月

### 19. アクセシビリティ対応【検討事項】

- **複雑度**: 中〜高
- **内容**: キーボード操作、スクリーンリーダー対応
- **実装方針**:
  - ARIA属性の追加
  - フォーカス管理
  - キーボードショートカット
  - スクリーンリーダー対応
  - コントラスト比の確保
- **保留理由**:
  - 現時点では優先度が低いと判断
  - 必要に応じて将来的に検討
- **保留日**: 2025年1月

### 20. 複数保存ポイント（バージョン管理）【検討事項】

- **複雑度**: 中〜高
- **内容**: 履歴管理、復元機能
- **実装方針**:
  - 保存履歴の記録
  - タイムスタンプ付きスナップショット
  - 履歴一覧表示
  - 任意の時点に復元
  - 差分表示
- **保留理由**:
  - 現時点では優先度が低いと判断
  - 必要に応じて将来的に検討
- **保留日**: 2025年1月

---

## Phase 5: ユーザーテスト反映（ZeroCode.js Issue 分割）

> **背景**: 社内ユーザーテスト（2026年）等で得られたフィードバックのうち、**ZeroCode.js の編集 UI に限定**して対応する項目。埋め込み先プロダクト固有（公開画面・スタッフ紐付け・下書きフロー等）は本 Phase の対象外。
>
> **進め方**: 下記 Issue を **ZC-1 → ZC-5 の順** に1件ずつ解消する。GitHub Issue 作成時は ID（`ZC-n`）をタイトルに含めると追いやすい。

### 実装順序と依存関係

| 順  | ID   | タイトル                                           | 優先理由                                            |
| --- | ---- | -------------------------------------------------- | --------------------------------------------------- |
| 1   | ZC-1 | 編集プレビューで z-empty によりパーツ内容が消える  | 信頼を損なうバグ。ZC-2 と同根                       |
| 2   | ZC-2 | リッチテキスト空値の正規化                         | ZC-1 の補完。EditPanel と template-processor の整合 |
| 3   | ZC-3 | 編集パネル内ドラッグでパネルが閉じる／内容が消える | 再現確認後。ZC-1/2 と独立しうる                     |
| 4   | ZC-4 | パーツ間の追加ボタン                               | UX 改善。空スロットの `+` パターン拡張              |
| 5   | ZC-5 | 並べ替え D&D（構造リスト・スロット含む）           | 工数大。既存 `reorderComponents` を流用             |

```
ZC-1 / ZC-2 ──→ ZC-4 ──→ ZC-5
ZC-3（並行可）
```

---

### ZC-1. 編集プレビューで z-empty によりパーツ内容が消える【完了】

- **複雑度**: 低〜中
- **症状**: リッチテキストのプレースホルダーを削除してパネルを閉じると、プレビュー上はパーツ枠だけ残り再入力しづらい
- **原因（仮説）**: `processZEmpty` が `enableEditorAttributes: true`（編集プレビュー）でも空フィールド時に要素を DOM から削除している
- **実装方針**:
  - 編集プレビュー（`enableEditorAttributes: true`）では `z-empty` 対象要素を **削除せず** 属性のみ除去、またはプレースホルダー構造を維持
  - 公開レンダリング（`enableEditorAttributes: false`）では従来どおり空要素を削除
  - `template-processor.test.ts` に編集モード用ケースを追加
- **主な変更箇所**:
  - `src/core/utils/template-processor.ts`（`processZEmpty`, `isEmptyForZEmpty`）
- **受け入れ条件**:
  - `z-empty="$content"` + 空リッチテキストでも、編集プレビュー上でパーツ内に入力可能な構造が残る
  - 公開 HTML では空のとき要素が出力されない（従来どおり）
- **実装済み**: 2026年6月
  - `processZEmpty` で `enableEditorAttributes: true` のとき空要素を削除せず `z-empty` 属性のみ除去
  - `isEmptyForZEmpty` を export（ZC-2 で再利用）
  - 編集モード用テストを追加

---

### ZC-2. リッチテキスト空値の正規化【完了】

- **複雑度**: 低
- **症状**: ZC-1 と同系。TipTap が返す `<p></p>` が「空」と扱われず optional フィールド等で不整合
- **原因（仮説）**: `EditPanel` の `handleRichTextUpdate` が `value === ''` のみ optional 空判定。`isEmptyForZEmpty` と判定基準が不一致
- **実装方針**:
  - 空リッチテキスト判定を共通化（`<p></p>`, `<p> </p>`, `<p><br></p>` 等）
  - `handleRichTextUpdate` / `saveFieldEdit`（useEditMode）で optional 時は `undefined` に正規化
  - `isEmptyForZEmpty` と同じ関数を import して DRY に
- **主な変更箇所**:
  - `src/core/utils/template-processor.ts` または `src/core/utils/validation.ts`（空判定ユーティリティ）
  - `src/features/editor/components/EditPanel.vue`
  - `src/features/editor/composables/useEditMode.ts`
- **受け入れ条件**:
  - リッチテキストを全削除したとき、optional フィールドは `undefined`、必須は `<p></p>` または空として一貫処理
  - ZC-1 のテストと合わせて回帰なし
- **実装済み**: 2026年6月
  - `isEmptyForZEmpty` を EditPanel / useEditMode で共有
  - optional リッチテキストの `<p></p>` 等を空として `undefined` に正規化

---

### ZC-3. 編集パネル内ドラッグでパネルが閉じる／内容が消える【完了（パネル閉じ）】

- **複雑度**: 低
- **症状**: 編集パネル内（input / リッチテキスト等）でテキストを選択し、プレビュー側で mouseup するとパネルが閉じる。社内 UT では「内容が消える」報告もあった
- **原因（確定・パネル閉じ）**: パネル内 pointerdown → プレビュー側 mouseup の click が、選択解除または同一パーツの `handleEditClick` トグルとして処理されていた
- **実装方針（採用）**:
  - `useClickHandlers.ts` で除外 UI 内で開始したジェスチャー中は選択解除・パーツ click を抑制
  - フラグは `click` バブル終了後にリセット
- **実装方針（見送り）**:
  - `RichTextEditor.vue` の `dragstart` 抑制は **外した**（パネル閉じとは別レイヤー。内容消失が再現するかユーザー検証後に再検討）
- **主な変更箇所**:
  - `src/features/editor/composables/useClickHandlers.ts`
  - `src/features/editor/composables/useClickHandlers.test.ts`
- **受け入れ条件**:
  - パネル内で開始した選択ドラッグの mouseup 後も編集パネルが閉じない
  - （任意）リッチテキスト内容が意図せず消えない — `dragstart` 抑制なしで再確認
- **実装済み**: 2026年6月
  - 除外 UI 内で開始したジェスチャーでは `document` の選択解除 click を抑制
  - 同一パーツ上の mouseup で `handleEditClick` がトグル閉じしないよう、プレビューパーツ click も抑制

---

### ZC-4. パーツ間の追加ボタン【完了】

- **複雑度**: 中
- **症状**: 1つ目追加後、2つ目以降の追加方法が分からない。既存パーツクリックが前提で直感的でない
- **実装方針**:
  - 空スロットの `data-zcode-add-slot` と同型で、各 `[data-zcode-path]` の直後（または間）に「+ パーツを追加」を注入
  - `enableEditorAttributes: true` かつ追加モード（または常時表示は設定で切替）のときのみ表示
  - クリック時: `switchMode('add')` → `addTargetPath` 設定 → `confirmAddPart('after')` 相当
  - `useClickHandlers` でイベント委譲（`v-html` 再描画後も有効）
- **参考実装**:
  - `src/core/utils/template-processor.ts`（空スロットボタン）
  - `src/features/preview/PreviewArea.vue`（空ページの `zcode-add-btn`）
  - `src/features/editor/composables/useClickHandlers.ts`（`data-zcode-add-slot` 委譲）
- **主な変更箇所**:
  - 新規: プレビュー DOM 注入ユーティリティ、または renderer 後処理
  - `src/features/add/composables/useAddMode.ts`
  - `src/styles/zcode-cms.css`
  - `src/i18n/locales/ja.ts`, `en.ts`
- **受け入れ条件**:
  - ページ直下のパーツ間から、既存パーツを選ばずに追加位置を指定できる
  - 追加後も AddPanel が開いたまま連続追加しやすい（`continueAdding` 連携）
- **実装済み**: 2026年6月
  - `page-add-buttons.ts` で page 直下・スロット内の兄弟間に挿入ボタンを注入（`enableEditorAttributes: true` 時）
  - 表示は **追加モード + 挿入位置トグル ON**（`.zcode-editor-mode-add.zcode-show-add-between-buttons`）
  - トグル・「追加後に編集に移動」等は追加パネルのオプション（歯車アイコン）内。挿入位置トグルは `CMSSettings.showAddBetweenButtons` で localStorage 永続化
  - 挿入ボタンは 24px 角形・白背景＋緑「＋」、選択中（`is-current`）は緑背景＋白「＋」。`aria-label` に i18n `addPanel.addBefore` / `addPanel.addAfter`
  - 先頭（`page.0` の前）と入れ子スロット内にも対応。追加パネル内プレビューは `renderComponentPreviewHtml`（編集 UI 非注入）
  - `syncAddBetweenButtonCurrentState` / `resolveAddBetweenButtonTarget` で選択中ボタンを同期（`useAddMode` / `useClickHandlers`）。`addInsertBefore`（チェック）と `insertBeforeActive`（実際の挿入方向）を分離
  - `useClickHandlers` で `data-zcode-add-before` / `data-zcode-add-after` を委譲クリック

---

### ZC-5. 並べ替え D&D（構造リスト）【完了】

- **複雑度**: 中〜高
- **症状**: クリック2回の並べ替えが分かりにくい。D&D を期待する
- **実装方針（採用）**:
  - **ReorderPanel 内の構造リスト**（ミニマップ）で SortableJS D&D
  - **Phase A**: page 直下
  - **Phase B**: スロット内も同階層 D&D（各 `[data-reorder-group]` に Sortable。スロット group は別階層クリックでパネル切替）
  - 移動元選択後 → プレビュー側で reorder target outline。リスト行 hover はパネル内ハイライト
  - drop 確定時に `moveStructureGroupByIndex` → `cmsData` 更新 → プレビュー再描画
  - **クリック式**も `reorderSiblingsByPath`（insert）で D&D と同一ロジック
  - プレビュー上の直接 D&D は見送り（アラート）
- **主な変更箇所**:
  - `src/features/reorder/utils/page-reorder.ts`
  - `src/features/reorder/composables/useReorderStructureSortables.ts`
  - `src/features/reorder/components/ReorderStructureTreeRows.vue`
  - `src/features/reorder/composables/useReorderMode.ts`
  - `src/features/reorder/components/ReorderPanel.vue`
  - `src/features/editor/composables/useClickHandlers.ts`（リスト D&D 中の click 抑制）
  - `src/components/ZeroCodeCMS.vue`
- **受け入れ条件**:
  - 並べ替えモードで page 直下・スロット内をパネル内 D&D して順序変更できる
  - プレビューが drop 後に正しい順序になる
  - 移動元選択後、有効な移動先がプレビューで分かる（target outline）
  - クリック２回も D&D と同じ insert 移動で使える
  - 他モードからの切り替えで選択パーツを移動元として引き継ぐ
- **実装済み**: 2026年6月
  - SortableJS + 構造リスト（パーツ title / part_id / スロット名表示）
  - `reorderSiblingsByPath` / `moveStructureGroupByIndex` / `canReorderSiblingPaths`（page-reorder.ts）
  - ミニマップ locate（未選択時カレント化・選択中行再クリックで解除・D&D 後選択解除）
  - `applyReorderHandoff`（モード切替時の移動元引き継ぎ）
  - リスト D&D 中は `reorderListDragging` で preview click を抑制

---

### 専用画像のページスコープ（Phase 1）【完了】

- **複雑度**: 中
- **背景**: 専用画像（`images.special`）が CMS インスタンス全体で1プールのため、記事ごとに分けられない
- **実装方針**:
  - `ImageData` に `scope: 'shared' | 'page'` と `pageId` を追加
  - Web Component 属性 `page-id`（`zcode-cms` / `zcode-editor` / `zcode-studio`）
  - CMS 画像選択モーダル: `page-id` 指定時は shared + 当該 page のみ表示、追加時は `scope: 'page'`
  - 保存 target は従来どおり `images-special`
  - レンダリングの ID 解決は変更なし
- **主な変更箇所**:
  - `src/core/utils/image-scope.ts`
  - `src/features/images-manager/composables/useImagesManager.ts`
  - `src/features/editor/components/ImageSelectModal.vue`
  - `src/components/ZeroCodeCMS.vue`、Web Components
- **検証**:
  - `npm run dev` → [test-cms-scope.html](./test-cms-scope.html)（page-id 切替・JSON パネル）
- **Phase 2（未着手）**: 専用パーツのスコープ、Studio/Editor 画像管理でのスコープ編集 UI
- **実装済み**: 2026年6月

---

### リッチテキストエディタの自作化（Tiptap 依存の削除）＋機能選択【完了】

- **複雑度**: 中〜高
- **背景**: Tiptap は13パッケージ＋ProseMirror 一式（遅延チャンク約115KB、UMD には常時同梱）だが、実際に使うのは文字装飾・リスト・リンクのみ。出力の整形は既に `sanitizeRichText`（DOMPurify）が担っている。依存削減と保守コスト削減のため、`contenteditable` + `execCommand` で自作する
- **原則**: 出力は意味を持つタグのみ。`style` / `class` 属性は出さない（見た目はサイト CSS の責務）
- **機能の上限リスト**:

  | 機能ID                        | 出力タグ                   | デフォルト |
  | ----------------------------- | -------------------------- | ---------- |
  | （常時）段落・改行            | `p` `br`                   | 常時       |
  | `bold`                        | `strong`                   | ✅         |
  | `italic`                      | `em`                       | ✅         |
  | `strike`                      | `s`                        | ✅         |
  | `underline`                   | `u`                        | ✅         |
  | `link`（新しいタブ切替可）    | `a`（href / target / rel） | ✅         |
  | `bulletList`                  | `ul` `li`                  | ✅         |
  | `orderedList`                 | `ol` `li`                  | ✅         |
  | `horizontalRule`              | `hr`                       | ✅         |
  | `heading`（h2〜h4）           | `h2` `h3` `h4`             | オプトイン |
  | `blockquote`                  | `blockquote`               | オプトイン |
  | `superscript` / `subscript`   | `sup` `sub`                | オプトイン |
  | （常時）書式クリア・Undo/Redo | —                          | 常時       |
  - 対象外: 文字色・サイズ・配置・フォント（`style` 属性が必要）、表・画像・埋め込み・コードブロック（パーツ／画像フィールドの領域）

- **実装方針**:
  - config に `richText: { features: [...] }` を追加（未指定時はデフォルト列）。フィールド単位の上書き（例: `{$body::rich=bold,link}`）は必要になってから
  - 機能制限はエディタ側（ツールバー表示・貼り付け時の正規化）で行う。`sanitizeRichText` の許可リストは config に連動させず、上限リスト全体を常に許可する（公開側・SSR は config を知らないため）
  - `sanitize.ts` の `ALLOWED_TAGS` に `h2` `h3` `h4` `blockquote` `sup` `sub` を追加
  - `b`/`i`/`strike`/`div` 等ブラウザ固有の出力は DOMPurify フックで `strong`/`em`/`s`/`p` に正規化
  - `target="_blank"` のリンクには `rel="noopener noreferrer"` を自動付与
  - 見出しレベルの個別指定（`heading: { levels: [3, 4] }`）は将来検討
- **進め方**:
  1. ✅ 未使用の `@tiptap/starter-kit` を削除（2026年10月10日）
  2. ✅ Shadow DOM 内の `contenteditable` で Chrome / Safari(WebKit) / Firefox の動作検証（選択範囲・execCommand・アクティブ状態判定・IME）
  3. ✅ 本実装（正規化の単体テスト含む）
  4. ✅ `e2e/rich-text-editor.spec.ts` を追加し、リッチテキストの E2E を webkit / firefox でも実行
  5. ✅ Tiptap 依存を削除、size-limit の上限を見直し（遅延チャンク 15KB / UMD 130KB）
- **撤退基準**: 検証で Safari の Shadow DOM 対応が実用に耐えない場合は Tiptap を維持し、依存パッケージの整理のみ行う
- **検証結果（2026年10月10日、Playwright: Chromium 149 / WebKit 26.5 / Firefox 151、Shadow DOM 内 contenteditable）**:
  - 文字装飾（bold / italic / underline / strikeThrough / superscript / subscript / createLink / removeFormat）と `formatBlock`（h2〜h4 / blockquote）は3ブラウザで動作
  - **WebKit で `insertUnorderedList` / `insertOrderedList` が壊れる**: 選択範囲がホスト要素に再ターゲットされ、エディタ内に `<zc-host>` と編集領域の複製が挿入される → リストは execCommand を使わず自前の DOM 操作で実装する
  - WebKit では `document.getSelection().addRange()` で shadow 内の Range を設定できず、`anchorNode` / `getRangeAt()` もホスト側に再ターゲットされる → 選択範囲の読み取りは `getComposedRanges`、設定は `setBaseAndExtent` に統一（`shadowRoot.getSelection()` は Chromium のみ）
  - `queryCommandState` は文字装飾では3ブラウザとも機能。ブロック（見出し・引用・リスト）は取れないため、選択範囲の祖先要素から判定する
  - ブラウザ固有の出力: `b` / `i` / `strike`（全ブラウザ）、Chromium のリストが `<p><ul>…</ul></p>` になる、`insertHorizontalRule` が `id="null"` を付ける（Chromium / WebKit）→ 正規化で吸収
  - Cmd/Ctrl+B 等のショートカットは WebKit / Firefox で効かないため keydown で自前処理
  - Enter での段落区切りは `defaultParagraphSeparator=p` で3ブラウザとも `<p>`
  - リストを自前 DOM 操作にするとブラウザ標準の Undo 履歴と混在して壊れるため、Undo/Redo は自前のスナップショット履歴で実装する
  - 見出し・引用も `formatBlock` だと Chromium / WebKit で複数段落が1つの見出しに結合されるため、ブロック操作（リスト・見出し・引用）はすべて自前の DOM 操作に統一する。execCommand は文字装飾・リンク・水平線・書式クリアのみ
  - 上記設計の試作で、3ブラウザともリスト作成/解除・見出し/引用・ショートカット・自前 Undo/Redo が同一結果になり、ホスト要素の破損もないことを確認
  - 最低動作環境: Chrome 137+ / Firefox 142+ / Safari 17+（`getComposedRanges` のため。2026年10月10日合意）
  - **execCommand の文字装飾は、タグではなく計算済みスタイルで状態を判定する**（3ブラウザ共通）: 見出し内（既定で太字）で bold を実行すると `<span style="font-weight: normal;">` が挿入される。逆に CSS で `font-weight: normal` にした見出しでは Chromium / WebKit は何も起きない。編集画面の CSS と公開サイトの CSS は異なるため、出力が CSS に左右されるのは不可 → 文字装飾も自前のラップ/アンラップ（祖先タグで状態判定）で実装し、execCommand は使わない方針に変更
  - アプリ内ブラウザ（Chrome 152 ベース）でも、リスト・見出し・自前 Undo/Redo の動作を確認
  - 日本語 IME の手動確認: OK（2026年10月10日）
- **実装済み**: 2026年10月10日
  - `src/features/editor/rich-text/`（features / dom / normalize / selection / history）＋ `RichTextEditor.vue`
  - config `richText.features`、`zcodeRichTextFeaturesKey` で CMS / Editor / Studio から provide
  - リンクは window.prompt をやめ、ツールバー下のフォーム（URL・新しいタブ・解除）に変更
  - ブロック要素で始まるリッチテキスト値を `<p>` で包まないよう `template-processor.ts` を修正
  - 将来検討: 見出しレベルの個別指定、フィールド単位の機能指定（`{$body::rich=bold,link}`）

---

### 本 Phase の対象外（ホスト側）

以下は ZeroCode.js では対応しない。埋め込み先（ホスト）で別管理する。

- 執筆スタッフ表示、いいね・シェア、ハッシュタグ、記事ナビ
- 基本情報/本文の2画面構成、下書き・公開状態 UI、公開後の画面遷移
- 画像反映バグのうち **ホストの `save-request` / `images-special` 永続化** 側
- 店舗ごとのパーツ編集権限、CSS 編集の露出制御
- ブログ一覧・公開ページのデザイン

---

## 実装順序の推奨

### 短期（1-2週間）

1. ローカルストレージ設定保持
2. ~~権限注意書き~~（スキップ）
3. ブラウザバック対応

### 中期（1-2ヶ月）

4. 複数保存ポイント（自動保存）
5. データビューアー改善
6. 使い方の説明
7. 編集モードのグループ化
8. バックエンドデータの挿入
9. 空入力制御
10. 共通と個別の位置を交換

### 長期（3ヶ月以上）

8. ~~追加パネルのUI改善~~（保留）
9. 英語対応
10. バリデーションチェック&入力制御
11. 複数対応
12. テストコード
13. API対応
14. スマホ対応＆デザイン調整
15. ~~アクセシビリティ対応~~（検討事項）
16. ~~バージョン管理~~（検討事項）
17. z-for ループ記法

### ユーザーテスト反映（2026年〜）

18. [Phase 5: ZC-1 〜 ZC-5](./TODO.md#phase-5-ユーザーテスト反映zerocodejs-issue-分割) — ユーザーテスト反映に基づく ZeroCode.js 編集 UX（**ZC-1 〜 ZC-5 完了**）
19. [専用画像のページスコープ（Phase 1）](./TODO.md#専用画像のページスコープphase-1完了) — **完了**（Phase 2: 専用パーツスコープは未着手）

---

## 保留・検討中

### CSS/JS管理機能

- **結論**: 実装しない
- **理由**:
  - ZeroCode.jsはコンテンツ管理に特化
  - CSS/JSは呼び出し元で記載する設計
  - CSSインジェクション攻撃のリスク
  - アーキテクチャの複雑化

### z-for ループ記法

- **結論**: 実装予定
- **内容**: バックエンドデータやコンポーネントデータの配列をループ処理
- **実装方針**:
  - 記法: `z-for="item in {@items}"` または `z-for="(item, index) in {@items}"`
  - バックエンドデータの配列をループ: `z-for="shop in {@shops}"`
  - コンポーネントデータの配列をループ: `z-for="tag in {$tags}"`
  - インデックス変数のサポート: `z-for="(item, index) in {@items}"`
  - ループ変数のスコープ管理
  - ネストされたループの対応（変数名の衝突に注意）
  - 編集モードでの扱い（配列全体の編集として扱う）
- **使用例**:

  ```html
  <!-- バックエンドデータの配列をループ -->
  <div z-for="shop in {@shops}">
    <h2>{shop.name}</h2>
    <a href="{shop.url}">詳細</a>
  </div>

  <!-- インデックス付きループ -->
  <div z-for="(menu, index) in {@menus}">
    <span>{index + 1}. {menu.label}</span>
  </div>

  <!-- コンポーネントデータの配列をループ -->
  <span z-for="tag in {$tags}" class="tag">{tag}</span>
  ```

- **実装順序**:
  1. 基本的な`z-for`記法（バックエンドデータの配列）
  2. インデックス変数のサポート
  3. コンポーネントデータの配列サポート
  4. 編集モードでの扱い
  5. ネストされたループ（必要に応じて）

---

## 技術的なメモ

### テンプレート記法の現状

- テキストフィールド: `{$field:default}`
- テキストエリア: `{$field:default:textarea}`
- リッチテキスト: `{$field:default:rich}`
- 画像: `{$field:default:image}`
- オプショナルフィールド: `{$field?:default}` ✅ 実装済み
- グループ化: `{$field.group:default}`, `($field.group@:option1|option2)` ✅ 実装済み
- ラジオボタン: `($field:option1|option2)`
- チェックボックス: `($field:option1,option2)`
- セレクトボックス（単一選択）: `($field@:option1|option2)`
- セレクトボックス（複数選択）: `($field@:option1,option2)`
- バリデーション: `{$field:default:required:max=100}`, `:readonly`, `:disabled` ✅ 実装済み
- バックエンドデータ: `{@fieldName}`, `{@items[0]}`, `{@items[0].name}` ✅ 実装済み
- 条件分岐: `z-if="fieldName"` ✅ 実装済み
- タグの動的変更: `z-tag="$tagName:h1|h2|h3"` ✅ 実装済み
- 空要素の削除: `z-empty="$fieldName"` ✅ 実装済み
- ループ: `z-for="item in {@items}"` ✅ 実装済み
- スロット: `z-slot="slotName"` ✅ 実装済み

### ImageData（専用画像スコープ）

- `scope?: 'shared' | 'page'` — 未指定は shared（全 page-id で選択可能）
- `pageId?: string` — `scope: 'page'` のときのみ
- ホストは `<zcode-cms page-id="記事ID">` を渡す。詳細は [TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md)

### 今後追加予定の記法

- インデックス付きループ: `z-for="(item, index) in {@items}"`（検討中）

---

## リファクタリング（継続タスク）

### PartsManagerPanel.vue のパーツ編集モーダル抽出（Phase 2）

- **状況**: Phase 1 完了（2026年7月）。独立モーダル4つ（拡大プレビュー / CSS警告 / カテゴリ情報 / 記法ヘルプ）を子コンポーネント化し 1,538行 → 1,321行
- **残り**: パーツ編集モーダル（約430行）と一覧セクションの抽出
- **設計メモ**: パーツ編集モーダルは `editingPart.part.*` / `cssDraft` / `slotPartFilters` 等への v-model が10箇所以上あり、props 経由では vue/no-mutating-props と衝突する。抽出時は **provide/inject**（`InjectionKey` で usePartsManager の状態スライスを提供）でデータフローを再設計するか、モーダル専用の `usePartEditModal` コンポーザブルに状態を移してから分割する
- **セーフティネット**: `e2e/parts-manager-smoke.spec.ts`（タブ→一覧→モーダル開閉、カテゴリ情報モーダル）。着手前に「テンプレート編集→プレビュー反映→保存」のE2Eを追加すること

### モーダルa11yのフォローアップ（ui-reviewer 指摘・非ブロッキング）【完了】（2026年7月8日）

- ✅ `ImagesManagerPanel.vue` のカテゴリ情報モーダルを `CategoryInfoModal.vue` に置き換え、`useModalA11y` を自動適用
- ✅ `AddPanel.vue` のプレビューモーダルに `useModalA11y` を適用
- ✅ `ImageSelectModal` の画像グリッド（`special`タブ / `all`他タブの両方）に `role="button"` + `tabindex="0"` + Enter/Space ハンドラを追加（`ReorderStructureTreeRows` と同パターン）
- ✅ パーツ編集モーダルにダーティ判定（`usePartsManager.ts` の `isPartDirty`）を追加。Esc / × / オーバーレイクリックいずれも未保存の変更があれば `confirm()` で破棄確認するように変更（`handleCancelPart`）
- ✅ `ImagesManagerPanel.vue` の画像編集モーダル（差し替え用）にも `useModalA11y` を適用

---

## 参考リンク

- [プロジェクトルート](.)
- [技術仕様書](./TECHNICAL_SPECIFICATION.md)
- [AGENTS.md](./AGENTS.md) — AI 向け実装ガイド
- [テンプレートプロセッサー](./src/core/utils/template-processor.ts)
- [image-scope](./src/core/utils/image-scope.ts) — 専用画像スコープ
- [ZeroCodeCMS](./src/components/ZeroCodeCMS.vue)
- [ZeroCodeEditor](./src/components/ZeroCodeEditor.vue)
- [共通JS](./public/js/common.js) — デモ用 StorageManager
- 検証 HTML: [test-cms.html](./test-cms.html), [test-cms-scope.html](./test-cms-scope.html), [test-dev.html](./test-dev.html)

---

**最終更新日**: 2026年7月
