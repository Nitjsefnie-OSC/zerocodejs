// Light DOM Web Component として登録
import './web-components/zcode-cms';
import './web-components/zcode-editor';
import './web-components/zcode-studio';

// CSS スタイルをインポート
import './styles/zcode-cms.css';

// 型定義エクスポート
export * from './types';

// サーバーサイド用のレンダリング関数をエクスポート
export { renderToHtml, renderCssToHtml, RenderError } from './core/renderer/renderer';

// サニタイズ関数のエクスポート（サーバーサイドとルール共有用）
export { sanitizeRichText, sanitizeUrl, sanitizePartTemplate } from './core/utils/sanitize';
export type { UrlContext } from './core/utils/sanitize';

export {
  RICH_TEXT_FEATURES,
  DEFAULT_RICH_TEXT_FEATURES
} from './features/editor/rich-text/features';
export type { RichTextFeature } from './features/editor/rich-text/features';

export { ZERO_CODE_DATA_VERSION, migrateZeroCodeData } from './core/utils/data-version';

// コンポーネントのエクスポート（Vue環境で直接使いたい場合）
export { default as ZeroCodePreview } from './components/ZeroCodePreview.vue';
export { default as ZeroCodeCMS } from './components/ZeroCodeCMS.vue';
export { default as ZeroCodeEditor } from './components/ZeroCodeEditor.vue';
export { default as ZeroCodeStudio } from './components/ZeroCodeStudio.vue';
