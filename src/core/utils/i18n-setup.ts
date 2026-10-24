import type { App } from 'vue';
import type { SupportedLocale } from '../../i18n';
import { createZeroCodeI18n } from '../../i18n';
import { getUserLocale } from '../utils/storage';

/**
 * 言語を決定する（優先順位: localStorage > HTML属性 > デフォルト）
 * @param element - Web Component要素
 * @param defaultLocale - デフォルト言語
 * @returns 決定された言語
 */
export function determineLocale(
  element: HTMLElement,
  defaultLocale: SupportedLocale = 'ja'
): SupportedLocale {
  // ユーザーが設定パネルで変更した言語を最優先
  const savedLocale = getUserLocale(null);
  if (savedLocale) {
    return savedLocale;
  }

  // HTML属性のlocale（初期設定用）
  const attrLocale = element.getAttribute('locale');
  if (attrLocale === 'ja' || attrLocale === 'en') {
    return attrLocale as SupportedLocale;
  }

  // デフォルト
  return defaultLocale;
}

/**
 * i18nインスタンスを初期化してVueアプリに適用
 * @param app - Vueアプリインスタンス
 * @param locale - 言語
 */
export function setupI18n(app: App, locale: SupportedLocale): void {
  app.use(createZeroCodeI18n(locale));
}
