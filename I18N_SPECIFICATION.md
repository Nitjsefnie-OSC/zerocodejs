# 多言語対応（i18n）仕様書

## 概要

ZeroCode.jsの多言語対応機能の仕様を定義します。日本語と英語をサポートし、将来的に中国語などの他の言語にも対応できる設計とします。

## 目的

- 日本語と英語のUI切り替えを提供
- 将来的に中国語などの他の言語にも対応可能な設計
- ユーザーが簡単に言語を切り替えられるUI

## 実装方針

### 使用ライブラリ

- 外部ライブラリは使わず、自前の小さな実装（`src/i18n/index.ts`）を使う（2026年10月に vue-i18n から置き換え。メジャーバージョンの移行に付き合わないため）
- 対応する機能は、キーによる文言の取得・`{name}` の差し込み・ja へのフォールバック・ロケールの切り替えのみ（複数形・リンク・日付や数値の書式は扱わない）
- Vue 3のComposition APIに対応

### 言語切り替えUIの配置

**推奨配置: 設定パネルヘッダー内（閉じるボタンの左横）**

```
┌─────────────────────────────────────┐
│ 設定    [日本語 ▼] [×]              │
├─────────────────────────────────────┤
│ □ ページの動作を有効にする          │
│ □ 編集パネル分の余白をつける        │
└─────────────────────────────────────┘
```

**理由:**

- 設定項目として自然な配置
- ツールバーが混雑しない
- 他の設定と一緒に管理できる
- 視覚的に分離されている

### 翻訳ファイル構造

```
src/i18n/
├── index.ts              # i18n初期化モジュール
└── locales/
    ├── ja.ts            # 日本語翻訳
    ├── en.ts            # 英語翻訳
    └── zh.ts            # 中国語翻訳（将来追加）
```

### 翻訳ファイルの形式

各言語ファイルは以下の形式で定義：

```typescript
export default {
  common: {
    close: '閉じる',
    save: '保存',
    cancel: 'キャンセル',
    toggleSettingHelp: 'この設定の詳細説明を表示または非表示にします'
    // ...
  },
  toolbar: {
    editMode: '編集',
    addMode: '追加'
    // ...
  },
  addPanel: {
    title: '追加',
    category: {
      common: '共通',
      individual: '個別',
      selected: '選択したパーツ'
    }
    // ...
  }
  // ...
};
```

### 対応言語

- **日本語 (ja)**: デフォルト言語
- **英語 (en)**: 初期実装で対応
- **中国語 (zh)**: 将来の拡張として対応可能

### 言語切り替えの実装

#### UIコンポーネント

設定パネル（`SettingsPanel.vue`）のヘッダーにセレクトボックスを配置：

```vue
<div class="zcode-settings-panel-header">
  <h3>{{ $t('settings.title') }}</h3>
  <div class="zcode-settings-panel-header-actions">
    <select
      :value="currentLocale"
      @change="handleLocaleChange"
      class="zcode-language-select"
      :aria-label="$t('settings.language.label')"
    >
      <option value="ja">{{ $t('settings.language.ja') }}</option>
      <option value="en">{{ $t('settings.language.en') }}</option>
    </select>
    <button @click="$emit('close')" class="zcode-close-btn">
      <X :size="18" />
    </button>
  </div>
</div>
```

#### 言語切り替えの処理

1. ユーザーが言語を選択
2. `useI18n()` の `locale.value` を更新
3. ローカルストレージに保存
4. UIが即座に切り替わる

#### ローカルストレージへの保存

```typescript
import { saveUserSettings } from '../core/utils/storage';

function handleLocaleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const newLocale = target.value as SupportedLocale;

  locale.value = newLocale;
  saveUserSettings({ locale: newLocale });
}
```

### Web Componentでの初期化

#### 初期化時の言語読み込み

Web Component（`zcode-cms.ts`、`zcode-editor.ts`）で初期化時にローカルストレージから言語を読み込む：

```typescript
import { getUserLocale } from '../core/utils/storage';
import { createZeroCodeI18n, type SupportedLocale } from '../i18n';

const attrLocale = this.getAttribute('locale');
const savedLocale = getUserLocale('ja');
const locale = (attrLocale || savedLocale || 'ja') as SupportedLocale;
const i18n = createZeroCodeI18n(locale);

this.app.use(i18n);
```

**優先順位:**

1. HTML属性の`locale`（最優先）
2. ローカルストレージに保存された言語
3. デフォルト（日本語）

### i18n初期化モジュール

```typescript
// src/i18n/index.ts（抜粋）
export type SupportedLocale = 'ja' | 'en';

// Vue プラグイン。install で useI18n 用の provide と、テンプレート用の $t を登録する
export function createZeroCodeI18n(initialLocale: SupportedLocale = 'ja'): ZeroCodeI18n;

// コンポーネント・コンポーザブルの setup 内で使う
export function useI18n(): { locale: Ref<SupportedLocale>; t: Translate };
```

### コンポーネントでの使用

#### テンプレート内

```vue
<template>
  <h3>{{ $t('settings.title') }}</h3>
  <button>{{ $t('common.save') }}</button>
</template>
```

#### スクリプト内

```typescript
import { useI18n } from '../i18n';

const { t } = useI18n();
const message = t('common.save');
```

### 翻訳が必要なUI要素

以下のコンポーネント・機能で翻訳が必要：

1. **共通要素**
   - 閉じる、保存、キャンセル、削除、編集、追加
   - プレビュー、設定、表示、管理

2. **ツールバー**
   - 編集、追加、並べ替え、削除、表示、管理

3. **追加パネル**
   - タイトル、カテゴリ（共通/個別/選択したパーツ）
   - タイプタブ（all）
   - 追加位置選択（前に追加/後に追加）
   - パーツ追加を続ける

4. **編集パネル**
   - 編集中、フィールド、を表示
   - 画像選択、差し替え、クリア

5. **削除パネル**
   - タイトル、確認メッセージ、削除ボタン

6. **並べ替えパネル**
   - タイトル、説明、移動先をクリック

7. **設定パネル**
   - タイトル、言語切り替え
   - ページの動作を有効にする
   - 編集パネル分の余白をつける

8. **パーツ管理**
   - タイプ作成、編集、削除
   - パーツ編集、削除
   - テンプレート記法ヘルプ

9. **画像管理**
   - 画像追加、編集、削除
   - 画像ID、画像名、Alt属性

10. **データビューアー**
    - ページ、パーツ、画像
    - 共通、個別
    - コピー、コピーしました

### 将来の拡張

#### 中国語対応の追加

1. `src/i18n/locales/zh.ts`を作成
2. `src/i18n/index.ts`の`SupportedLocale`型に`'zh'`を追加
3. `src/i18n/index.ts` の `MESSAGES` に `zh` を追加
4. 設定パネルのセレクトボックスに`<option value="zh">`を追加

#### その他の言語

同様の手順で追加可能。

### 注意事項

#### パフォーマンス

- 翻訳ファイルは必要最小限のサイズに保つ
- 動的な翻訳が必要な場合は、パラメータを使用

#### 型安全性

- `SupportedLocale`型を使用して言語コードの型安全性を確保
- 翻訳キーは文字列リテラル型で定義（可能な場合）

## 実装ステップ（参考）

1. 翻訳ファイル構造を作成（`ja.ts`、`en.ts`）
2. i18n初期化モジュールを作成
3. Web Componentでi18nを統合
4. 主要コンポーネントに翻訳を適用
5. 言語切り替えUIを追加（設定パネル）
6. ローカルストレージへの保存機能を実装

## 参考

- `src/i18n/index.ts`（実装）
- `src/i18n/index.test.ts`（差し込み・フォールバック・ja と en のキーの一致・ロケール切り替え）
