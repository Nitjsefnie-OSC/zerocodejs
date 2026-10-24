import { createApp, type App } from 'vue';
import ZeroCodeStudio from '../components/ZeroCodeStudio.vue';
import cssText from '../styles/zcode-cms.css?inline';
import { injectShadowDOMExtension } from '../core/utils/dom-utils';
import { determineLocale, setupI18n } from '../core/utils/i18n-setup';
import { logger } from '../core/utils/logger';
import { createHooksProperty } from './hooks-property';
import type { ZeroCodeHooks } from '../types';

/**
 * Web Component for ZeroCode.js Studio (専用パーツを編集する画面)
 * シェルは zcode-editor と同型。ページ管理は CMS 同等。パーツ/画像管理とデータビューのパーツ・画像は専用（special）のみ。
 */
class ZeroCodeStudioElement extends HTMLElement {
  private app: App | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private componentInstance: any = null;
  private _shadowRoot: ShadowRoot | null = null;
  private hooksProperty = createHooksProperty(this);

  constructor() {
    super();
  }

  /** ホストの関数（画像のアップロード・メディアの一覧・パーツ保存前の処理） */
  get hooks(): ZeroCodeHooks | undefined {
    return this.hooksProperty.hooks.value;
  }

  set hooks(value: ZeroCodeHooks | undefined) {
    this.hooksProperty.hooks.value = value;
  }

  connectedCallback() {
    if (this.app) {
      return;
    }

    const useShadowDOM = this.getAttribute('use-shadow-dom') !== 'false';

    if (useShadowDOM) {
      this.setupShadowDOM();
      window.addEventListener('zcode-dom-updated', this.handleDOMUpdated.bind(this));
    } else {
      this.setupLightDOM();
      window.addEventListener('zcode-dom-updated', this.handleLightDOMUpdated.bind(this));
    }
  }

  private getCommonProps() {
    return {
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
      backendData: this.getAttribute('backend-data') || ''
    };
  }

  private setupLightDOM() {
    const locale = determineLocale(this);
    const props = this.getCommonProps();

    const scriptSlots = Array.from(this.querySelectorAll('[slot="script"]')) as HTMLScriptElement[];
    if (scriptSlots.length > 0) {
      (this as any).__savedScriptSlots = scriptSlots.map((slot) => ({
        src: slot.src,
        type: slot.type,
        async: slot.async,
        defer: slot.defer,
        integrity: slot.integrity,
        crossOrigin: slot.crossOrigin
      }));
    }

    this.app = createApp(ZeroCodeStudio, { locale, ...props });
    setupI18n(this.app, locale);
    this.hooksProperty.provide(this.app);
    this.componentInstance = this.app.mount(this);
    this.injectLightDOMCSS();
  }

  private setupShadowDOM() {
    const existingShadowRoot = this.shadowRoot as ShadowRoot | null;
    const isReRender = !!existingShadowRoot;

    if (existingShadowRoot) {
      this._shadowRoot = existingShadowRoot;
      this.clearScripts();
    } else {
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this.injectCSS();
    }

    const locale = determineLocale(this);
    const props = this.getCommonProps();

    this.app = createApp(ZeroCodeStudio, { locale, ...props });
    setupI18n(this.app, locale);
    this.hooksProperty.provide(this.app);
    this.componentInstance = this.app.mount(this._shadowRoot!);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.injectScript(isReRender);
        }, 100);
      });
    });
  }

  private injectCSS() {
    if (!this._shadowRoot) return;

    const defaultStyle = document.createElement('style');
    defaultStyle.textContent = cssText;
    this._shadowRoot.appendChild(defaultStyle);

    const cssSlots = this.querySelectorAll('[slot="css"]');
    cssSlots.forEach((slot) => {
      const cloned = slot.cloneNode(true) as HTMLElement;
      cloned.removeAttribute('slot');
      this._shadowRoot!.appendChild(cloned);
      slot.remove();
    });
  }

  private injectLightDOMCSS() {
    const cssSlots = this.querySelectorAll('[slot="css"]');
    cssSlots.forEach((slot) => {
      const link = slot.cloneNode(true) as HTMLLinkElement;
      link.removeAttribute('slot');
      document.head.appendChild(link);
    });
  }

  private clearScripts() {
    if (!this._shadowRoot) return;
    const scripts = this._shadowRoot.querySelectorAll('script');
    scripts.forEach((script) => script.remove());
  }

  private injectScript(forceReload: boolean = false) {
    if (!this._shadowRoot) return;

    const scriptSlots = this.querySelectorAll('[slot="script"]');
    const scriptSlotsArray = Array.from(scriptSlots);

    const jqueryScripts: HTMLScriptElement[] = [];
    const otherScripts: HTMLScriptElement[] = [];

    scriptSlotsArray.forEach((slot) => {
      const script = slot as HTMLScriptElement;
      if (!script.src) {
        logger.warn(
          'Inline scripts are not allowed. Only external script files with src attribute are supported.'
        );
        return;
      }
      if (script.src.includes('jquery') || script.src.includes('code.jquery.com')) {
        jqueryScripts.push(script);
      } else {
        otherScripts.push(script);
      }
    });

    const injectScriptElement = (script: HTMLScriptElement) => {
      let scriptSrc = script.src;
      if (forceReload) {
        try {
          const url = new URL(script.src, window.location.href);
          url.searchParams.set('_t', Date.now().toString());
          scriptSrc = url.toString();
        } catch (e) {
          scriptSrc = script.src + (script.src.includes('?') ? '&' : '?') + '_t=' + Date.now();
        }
      }
      const newScript = document.createElement('script');
      newScript.src = scriptSrc;
      if (script.type) newScript.type = script.type;
      if (script.async) newScript.async = true;
      if (script.defer) newScript.defer = true;
      if (script.integrity) newScript.integrity = script.integrity;
      if (script.crossOrigin) newScript.crossOrigin = script.crossOrigin;
      newScript.onerror = (error) => {
        logger.error(`Failed to load script: ${script.src}`, error);
      };
      return newScript;
    };

    const removeOriginalSlots = () => {
      scriptSlotsArray.forEach((slot) => slot.remove());
    };

    if (jqueryScripts.length > 0) {
      let jqueryLoadedCount = 0;
      const totalJqueryScripts = jqueryScripts.length;

      jqueryScripts.forEach((script) => {
        const newScript = injectScriptElement(script);
        newScript.onload = () => {
          jqueryLoadedCount++;
          if (jqueryLoadedCount === totalJqueryScripts) {
            injectShadowDOMExtension(this._shadowRoot!, forceReload);
            setTimeout(() => {
              otherScripts.forEach((s) => {
                this._shadowRoot!.appendChild(injectScriptElement(s));
              });
              removeOriginalSlots();
            }, 50);
          }
        };
        this._shadowRoot!.appendChild(newScript);
      });
    } else {
      injectShadowDOMExtension(this._shadowRoot!, forceReload);
      otherScripts.forEach((script) => {
        this._shadowRoot!.appendChild(injectScriptElement(script));
      });
      removeOriginalSlots();
    }
  }

  private injectLightDOMScripts() {
    let scriptSlots: HTMLScriptElement[] = [];

    if ((this as any).__savedScriptSlots && (this as any).__savedScriptSlots.length > 0) {
      scriptSlots = (this as any).__savedScriptSlots.map((slotInfo: any) => {
        const script = document.createElement('script');
        script.src = slotInfo.src;
        if (slotInfo.type) script.type = slotInfo.type;
        if (slotInfo.async) script.async = true;
        if (slotInfo.defer) script.defer = true;
        if (slotInfo.integrity) script.integrity = slotInfo.integrity;
        if (slotInfo.crossOrigin) script.crossOrigin = slotInfo.crossOrigin;
        return script;
      });
    } else {
      const foundSlots = this.querySelectorAll('[slot="script"]');
      scriptSlots = Array.from(foundSlots) as HTMLScriptElement[];
    }

    const jqueryScripts: HTMLScriptElement[] = [];
    const otherScripts: HTMLScriptElement[] = [];

    scriptSlots.forEach((slot) => {
      const script = slot as HTMLScriptElement;
      if (!script.src) {
        logger.warn(
          'Inline scripts are not allowed. Only external script files with src attribute are supported.'
        );
        return;
      }
      if (script.src.includes('jquery') || script.src.includes('code.jquery.com')) {
        jqueryScripts.push(script);
      } else {
        otherScripts.push(script);
      }
    });

    const injectScriptElement = (script: HTMLScriptElement) => {
      const newScript = document.createElement('script');
      newScript.src = script.src;
      if (script.type) newScript.type = script.type;
      if (script.async) newScript.async = true;
      if (script.defer) newScript.defer = true;
      if (script.integrity) newScript.integrity = script.integrity;
      if (script.crossOrigin) newScript.crossOrigin = script.crossOrigin;
      newScript.onerror = (error) => {
        logger.error(`Failed to load script: ${script.src}`, error);
      };
      return newScript;
    };

    if (jqueryScripts.length > 0) {
      let jqueryLoadedCount = 0;
      const totalJqueryScripts = jqueryScripts.length;

      jqueryScripts.forEach((script) => {
        const newScript = injectScriptElement(script);
        newScript.onload = () => {
          jqueryLoadedCount++;
          if (jqueryLoadedCount === totalJqueryScripts) {
            requestAnimationFrame(() => {
              otherScripts.forEach((s) => {
                document.body.appendChild(injectScriptElement(s));
              });
            });
          }
        };
        document.body.appendChild(newScript);
      });
    } else {
      otherScripts.forEach((script) => {
        document.body.appendChild(injectScriptElement(script));
      });
    }
  }

  getData(path?: string) {
    if (this.componentInstance && this.componentInstance.getData) {
      return this.componentInstance.getData(path);
    }
    return null;
  }

  setData(path: string | object, value?: any) {
    if (this.componentInstance && this.componentInstance.setData) {
      return this.componentInstance.setData(path, value);
    }
    return false;
  }

  disconnectedCallback() {
    if (this.app) {
      this.app.unmount();
      this.app = null;
    }
    this.componentInstance = null;

    if (this._shadowRoot) {
      if ((this._shadowRoot as any).__zecEventListeners) {
        const listeners = (this._shadowRoot as any).__zecEventListeners;
        const shadowRoot = this._shadowRoot;
        listeners.forEach((listenerArray: Array<{ eventName: string; handler: EventListener }>) => {
          listenerArray.forEach((listener) => {
            shadowRoot.removeEventListener(listener.eventName, listener.handler, true);
          });
        });
        listeners.clear();
      }

      if ((window as any).__zecShadowRoots) {
        const roots = (window as any).__zecShadowRoots as Map<string, ShadowRoot>;
        const shadowRoot = this._shadowRoot;
        for (const [key, root] of roots.entries()) {
          if (root === shadowRoot) {
            roots.delete(key);
          }
        }
      }
    }

    this._shadowRoot = null;
    window.removeEventListener('zcode-dom-updated', this.handleDOMUpdated.bind(this));
    window.removeEventListener('zcode-dom-updated', this.handleLightDOMUpdated.bind(this));
  }

  private handleDOMUpdated() {
    if (!this._shadowRoot || this.getAttribute('use-shadow-dom') !== 'true') {
      return;
    }
    if ((this._shadowRoot as any).__zecJQueryExtended) {
      delete (this._shadowRoot as any).__zecJQueryExtended;
    }
    const existingExtension = this._shadowRoot.querySelector('script[data-zec-shadow-extension]');
    if (existingExtension) {
      existingExtension.remove();
    }
    injectShadowDOMExtension(this._shadowRoot, true);
  }

  private handleLightDOMUpdated() {
    if (this.getAttribute('use-shadow-dom') === 'true') {
      return;
    }
    if (!(this as any).__lightDOMScriptsLoaded) {
      this.injectLightDOMScripts();
      (this as any).__lightDOMScriptsLoaded = true;
    }
  }

  static get observedAttributes() {
    return [
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
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;

    if (name === 'use-shadow-dom') {
      if (this.app) {
        this.app.unmount();
        this.app = null;
      }
      this.componentInstance = null;
      if (this._shadowRoot) {
        this._shadowRoot.innerHTML = '';
        this._shadowRoot = null;
      }
      this.connectedCallback();
      return;
    }

    if (this.app) {
      this.app.unmount();
      this.app = null;
      this.componentInstance = null;
      this.connectedCallback();
    }
  }
}

if (!customElements.get('zcode-studio')) {
  customElements.define('zcode-studio', ZeroCodeStudioElement);
}

export { ZeroCodeStudioElement };
