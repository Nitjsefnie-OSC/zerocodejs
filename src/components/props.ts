import type { ZeroCodeHooks } from '../types';

/** CMS / Editor / Studio 共通の props（Web Component の属性に対応する） */
export interface ZeroCodeDataProps {
  locale?: string;
  page?: string;
  /** 専用画像のページスコープ用 ID（記事 ID など）。ホストが `<zcode-cms page-id="...">` で渡す */
  pageId?: string;
  cssCommon?: string;
  cssIndividual?: string;
  cssSpecial?: string;
  partsCommon?: string;
  partsIndividual?: string;
  partsSpecial?: string;
  imagesCommon?: string;
  imagesIndividual?: string;
  imagesSpecial?: string;
  config?: string;
  endpoints?: string;
  backendData?: string;
  /** ホストの関数（画像のアップロードなど）。Web Component では要素の hooks プロパティ */
  hooks?: ZeroCodeHooks;
}
