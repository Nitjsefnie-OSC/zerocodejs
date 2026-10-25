import { createApp, type App, type Component } from 'vue';
import cssText from '../styles/zcode-cms.css?inline';
import { injectShadowDOMExtension } from '../core/utils/dom-utils';
import { determineLocale, setupI18n } from '../core/utils/i18n-setup';
import { logger } from '../core/utils/logger';
import { createHooksProperty } from './hooks-property';
import type { ZeroCodeHooks } from '../types';

/** マウントしたコンポーネントが公開しているもの（ZeroCodeCMS / Editor / Studio の defineExpose） */
interface ZeroCodeComponentInstance {
  getData?: (path?: string) => unknown;
  setData?: (path: string | object, value?: unknown) => unknown;
  allowDynamicContentInteraction?: boolean | { value: boolean };
}

/** injectShadowDOMExtension（dom-utils）がシャドウルートと window に付ける情報 */
type ExtendedShadowRoot = ShadowRoot & {
  __zecJQueryExtended?: boolean;
  __zecEventListeners?: Map<string, Array<{ eventName: string; handler: EventListener }>>;
};
type WindowWithShadowRoots = Window & { __zecShadowRoots?: Map<string, ShadowRoot> };

type SavedScript = Pick<
  HTMLScriptElement,
  'src' | 'type' | 'async' | 'defer' | 'integrity' | 'crossOrigin'
>;

const SHARED_ATTRIBUTES = [
  'locale',
  'page',
  'page-id',
  'css-common',
  'css-individual',
  'css-special',
  'parts-common',
  'parts-individual',
  'parts-special',
  'images-common',
  'images-individual',
  'images-special',
  'config',
  'endpoints',
  'backend-data',
  'use-shadow-dom'
];

function isJQueryScript(script: HTMLScriptElement): boolean {
  return script.src.includes('jquery') || script.src.includes('code.jquery.com');
}

function copyScript(script: SavedScript, src = script.src): HTMLScriptElement {
  const copy = document.createElement('script');
  copy.src = src;
  if (script.type) copy.type = script.type;
  if (script.async) copy.async = true;
  if (script.defer) copy.defer = true;
  if (script.integrity) copy.integrity = script.integrity;
  if (script.crossOrigin) copy.crossOrigin = script.crossOrigin;
  copy.onerror = (error) => logger.error(`Failed to load script: ${script.src}`, error);
  return copy;
}

/**
 * <zcode-cms> / <zcode-editor> / <zcode-studio> の共通部分。
 * 属性から Vue アプリを作ってマウントし、属性が変わったら作り直す。
 * Shadow DOM（デフォルト）と Light DOM（use-shadow-dom="false"）の両方に対応する。
 */
export abstract class ZeroCodeElement extends HTMLElement {
  static readonly sharedAttributes = SHARED_ATTRIBUTES;

  /** マウントする Vue コンポーネント */
  protected abstract readonly component: Component;

  /** 共通の属性以外に、コンポーネントへ渡す props */
  protected extraProps(): Record<string, unknown> {
    return {};
  }

  private app: App | null = null;
  private componentInstance: ZeroCodeComponentInstance | null = null;
  private _shadowRoot: ExtendedShadowRoot | null = null;
  private savedScriptSlots: SavedScript[] = [];
  private lightDOMScriptsLoaded = false;
  private hooksProperty = createHooksProperty(this);
  private readonly onShadowDOMUpdated = () => this.handleDOMUpdated();
  private readonly onLightDOMUpdated = () => this.handleLightDOMUpdated();

  /** ホストの関数（画像のアップロード・メディアの一覧・パーツ保存前の処理） */
  get hooks(): ZeroCodeHooks | undefined {
    return this.hooksProperty.hooks.value;
  }

  set hooks(value: ZeroCodeHooks | undefined) {
    this.hooksProperty.hooks.value = value;
  }

  connectedCallback() {
    if (this.app) return;

    if (this.getAttribute('use-shadow-dom') !== 'false') {
      this.setupShadowDOM();
      window.addEventListener('zcode-dom-updated', this.onShadowDOMUpdated);
    } else {
      this.setupLightDOM();
      window.addEventListener('zcode-dom-updated', this.onLightDOMUpdated);
    }
  }

  disconnectedCallback() {
    this.unmountApp();

    const shadowRoot = this._shadowRoot;
    if (shadowRoot) {
      const listeners = shadowRoot.__zecEventListeners;
      if (listeners) {
        listeners.forEach((listenerArray) => {
          listenerArray.forEach((listener) => {
            shadowRoot.removeEventListener(listener.eventName, listener.handler, true);
          });
        });
        listeners.clear();
      }

      const roots = (window as WindowWithShadowRoots).__zecShadowRoots;
      if (roots) {
        for (const [key, root] of roots.entries()) {
          if (root === shadowRoot) roots.delete(key);
        }
      }
    }
    this._shadowRoot = null;

    window.removeEventListener('zcode-dom-updated', this.onShadowDOMUpdated);
    window.removeEventListener('zcode-dom-updated', this.onLightDOMUpdated);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;

    if (name === 'use-shadow-dom') {
      this.unmountApp();
      if (this._shadowRoot) {
        this._shadowRoot.innerHTML = '';
        this._shadowRoot = null;
      }
      this.connectedCallback();
      return;
    }

    if (this.app) {
      this.unmountApp();
      this.connectedCallback();
    }
  }

  getData(path?: string) {
    return this.componentInstance?.getData ? this.componentInstance.getData(path) : null;
  }

  setData(path: string | object, value?: unknown) {
    return this.componentInstance?.setData ? this.componentInstance.setData(path, value) : false;
  }

  get allowDynamicContentInteraction(): boolean {
    const allow = this.componentInstance?.allowDynamicContentInteraction;
    if (allow === undefined) return true;
    return typeof allow === 'object' ? allow.value : allow;
  }

  set allowDynamicContentInteraction(value: boolean) {
    const instance = this.componentInstance;
    if (!instance || instance.allowDynamicContentInteraction === undefined) return;
    if (typeof instance.allowDynamicContentInteraction === 'object') {
      instance.allowDynamicContentInteraction.value = value;
    } else {
      instance.allowDynamicContentInteraction = value;
    }
  }

  private createAppFromAttributes(): App {
    const locale = determineLocale(this);
    const app = createApp(this.component, {
      locale,
      page: this.getAttribute('page') || '[]',
      pageId: this.getAttribute('page-id') || undefined,
      cssCommon: this.getAttribute('css-common'),
      cssIndividual: this.getAttribute('css-individual'),
      cssSpecial: this.getAttribute('css-special'),
      partsCommon: this.getAttribute('parts-common') || '[]',
      partsIndividual: this.getAttribute('parts-individual') || '[]',
      partsSpecial: this.getAttribute('parts-special') || '[]',
      imagesCommon: this.getAttribute('images-common') || '[]',
      imagesIndividual: this.getAttribute('images-individual') || '[]',
      imagesSpecial: this.getAttribute('images-special') || '[]',
      config: this.getAttribute('config') || '',
      endpoints: this.getAttribute('endpoints') || '',
      backendData: this.getAttribute('backend-data') || '',
      ...this.extraProps()
    });
    setupI18n(app, locale);
    this.hooksProperty.provide(app);
    return app;
  }

  private unmountApp() {
    if (this.app) {
      this.app.unmount();
      this.app = null;
    }
    this.componentInstance = null;
  }

  private setupLightDOM() {
    // Vue がマウント先の子要素を置き換えるため、作り直しても読み込めるよう script のスロットを控えておく
    const scriptSlots = Array.from(this.querySelectorAll<HTMLScriptElement>('[slot="script"]'));
    if (scriptSlots.length > 0) {
      this.savedScriptSlots = scriptSlots.map(
        ({ src, type, async, defer, integrity, crossOrigin }) => ({
          src,
          type,
          async,
          defer,
          integrity,
          crossOrigin
        })
      );
    }

    this.app = this.createAppFromAttributes();
    this.componentInstance = this.app.mount(this) as ZeroCodeComponentInstance;
    this.injectLightDOMCSS();
  }

  private setupShadowDOM() {
    const existingShadowRoot = this.shadowRoot as ExtendedShadowRoot | null;
    const isReRender = !!existingShadowRoot;

    if (existingShadowRoot) {
      this._shadowRoot = existingShadowRoot;
      this._shadowRoot.querySelectorAll('script').forEach((script) => script.remove());
    } else {
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this.injectCSS();
    }

    this.app = this.createAppFromAttributes();
    this.componentInstance = this.app.mount(this._shadowRoot) as ZeroCodeComponentInstance;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => this.injectShadowScripts(isReRender), 100);
      });
    });
  }

  private injectCSS() {
    const shadowRoot = this._shadowRoot;
    if (!shadowRoot) return;

    const defaultStyle = document.createElement('style');
    defaultStyle.textContent = cssText;
    shadowRoot.appendChild(defaultStyle);

    this.querySelectorAll('[slot="css"]').forEach((slot) => {
      const cloned = slot.cloneNode(true) as HTMLElement;
      cloned.removeAttribute('slot');
      shadowRoot.appendChild(cloned);
      slot.remove();
    });
  }

  private injectLightDOMCSS() {
    this.querySelectorAll('[slot="css"]').forEach((slot) => {
      const link = slot.cloneNode(true) as HTMLLinkElement;
      link.removeAttribute('slot');
      document.head.appendChild(link);
    });
  }

  /** slot="script" の外部スクリプトを、jQuery を先に読み込んでから順に入れる */
  private loadScripts(
    scripts: HTMLScriptElement[] | SavedScript[],
    append: (script: HTMLScriptElement) => void,
    onJQueryLoaded: (appendOthers: () => void) => void,
    toElement: (script: SavedScript) => HTMLScriptElement
  ) {
    const external = scripts.filter((script) => {
      if (script.src) return true;
      logger.warn(
        'Inline scripts are not allowed. Only external script files with src attribute are supported.'
      );
      return false;
    });
    const jqueryScripts = external.filter((script) => isJQueryScript(script as HTMLScriptElement));
    const otherScripts = external.filter((script) => !isJQueryScript(script as HTMLScriptElement));
    const appendOthers = () => otherScripts.forEach((script) => append(toElement(script)));

    if (jqueryScripts.length === 0) {
      appendOthers();
      return;
    }
    let loaded = 0;
    jqueryScripts.forEach((script) => {
      const element = toElement(script);
      element.onload = () => {
        loaded++;
        if (loaded === jqueryScripts.length) onJQueryLoaded(appendOthers);
      };
      append(element);
    });
  }

  private injectShadowScripts(forceReload: boolean) {
    const shadowRoot = this._shadowRoot;
    if (!shadowRoot) return;

    const scriptSlots = Array.from(this.querySelectorAll<HTMLScriptElement>('[slot="script"]'));
    const withCacheBuster = (script: SavedScript) => {
      if (!forceReload) return copyScript(script);
      try {
        const url = new URL(script.src, window.location.href);
        url.searchParams.set('_t', Date.now().toString());
        return copyScript(script, url.toString());
      } catch {
        return copyScript(
          script,
          script.src + (script.src.includes('?') ? '&' : '?') + '_t=' + Date.now()
        );
      }
    };
    const removeOriginalSlots = () => scriptSlots.forEach((slot) => slot.remove());

    const hasJQuery = scriptSlots.some((script) => script.src && isJQueryScript(script));
    if (!hasJQuery) injectShadowDOMExtension(shadowRoot, forceReload);

    this.loadScripts(
      scriptSlots,
      (script) => shadowRoot.appendChild(script),
      (appendOthers) => {
        injectShadowDOMExtension(shadowRoot, forceReload);
        setTimeout(() => {
          appendOthers();
          removeOriginalSlots();
        }, 50);
      },
      withCacheBuster
    );
    if (!hasJQuery) removeOriginalSlots();
  }

  private injectLightDOMScripts() {
    const scripts: SavedScript[] =
      this.savedScriptSlots.length > 0
        ? this.savedScriptSlots
        : Array.from(this.querySelectorAll<HTMLScriptElement>('[slot="script"]'));

    this.loadScripts(
      scripts,
      (script) => document.body.appendChild(script),
      (appendOthers) => requestAnimationFrame(appendOthers),
      (script) => copyScript(script)
    );
  }

  private handleDOMUpdated() {
    const shadowRoot = this._shadowRoot;
    if (!shadowRoot || this.getAttribute('use-shadow-dom') !== 'true') return;

    delete shadowRoot.__zecJQueryExtended;
    shadowRoot.querySelector('script[data-zec-shadow-extension]')?.remove();
    injectShadowDOMExtension(shadowRoot, true);
  }

  private handleLightDOMUpdated() {
    if (this.getAttribute('use-shadow-dom') === 'true') return;

    if (!this.lightDOMScriptsLoaded) {
      this.injectLightDOMScripts();
      this.lightDOMScriptsLoaded = true;
    }
  }
}
