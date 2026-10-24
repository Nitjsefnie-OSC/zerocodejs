import { inject, ref, type App, type InjectionKey, type Ref } from 'vue';
import ja from './locales/ja';
import en from './locales/en';

export type SupportedLocale = 'ja' | 'en';

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: string, params?: TranslateParams) => string;

export interface ZeroCodeI18n {
  locale: Ref<SupportedLocale>;
  t: Translate;
  install(app: App): void;
}

interface MessageTree {
  [key: string]: string | MessageTree;
}

const MESSAGES: Record<SupportedLocale, MessageTree> = { ja, en };
const FALLBACK_LOCALE: SupportedLocale = 'ja';
const I18N_KEY: InjectionKey<ZeroCodeI18n> = Symbol('zcode-i18n');

function lookup(messages: MessageTree, key: string): string | undefined {
  let node: string | MessageTree | undefined = messages;
  for (const segment of key.split('.')) {
    if (typeof node !== 'object') return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * `{name}` を params の値に置き換える（params にない名前は空文字）。
 * `{$field}` のようなテンプレート記法は名前に当たらないのでそのまま残る
 */
function format(message: string, params: TranslateParams): string {
  return message.replace(/\{(\w+)\}/g, (_placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : ''
  );
}

export function createZeroCodeI18n(initialLocale: SupportedLocale = FALLBACK_LOCALE): ZeroCodeI18n {
  const locale = ref<SupportedLocale>(initialLocale);
  const t: Translate = (key, params = {}) => {
    const message = lookup(MESSAGES[locale.value], key) ?? lookup(MESSAGES[FALLBACK_LOCALE], key);
    return message === undefined ? key : format(message, params);
  };
  const i18n: ZeroCodeI18n = {
    locale,
    t,
    install(app) {
      app.provide(I18N_KEY, i18n);
      app.config.globalProperties.$t = t;
    }
  };
  return i18n;
}

export function useI18n(): Pick<ZeroCodeI18n, 'locale' | 't'> {
  const i18n = inject(I18N_KEY);
  if (!i18n) throw new Error('[ZeroCode] i18n is not installed');
  return { locale: i18n.locale, t: i18n.t };
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: Translate;
  }
}
