// zerocodejs/cms: エンドユーザー向け <zcode-cms> のみを含む軽量エントリ
// （パーツ管理・画像管理・データビューアを含まない）
import './web-components/zcode-cms';

import './styles/zcode-cms.css';

export * from './types';

export { renderToHtml, renderCssToHtml, RenderError } from './core/renderer/renderer';

export {
  sanitizeRichText,
  sanitizeUrl,
  sanitizePartTemplate,
  findDisallowedRichTextLinks
} from './core/utils/sanitize';
export type { UrlContext } from './core/utils/sanitize';

export {
  RICH_TEXT_FEATURES,
  DEFAULT_RICH_TEXT_FEATURES
} from './features/editor/rich-text/features';
export type {
  RichTextFeature,
  RichTextLinkMode,
  RichTextLinkOption
} from './features/editor/rich-text/features';

export { ZERO_CODE_DATA_VERSION, migrateZeroCodeData } from './core/utils/data-version';

export { default as ZeroCodePreview } from './components/ZeroCodePreview.vue';
export { default as ZeroCodeCMS } from './components/ZeroCodeCMS.vue';
