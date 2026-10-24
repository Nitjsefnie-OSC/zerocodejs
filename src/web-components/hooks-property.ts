import { shallowRef, type App, type ShallowRef } from 'vue';
import { zcodeElementHooksKey } from '../core/injectionKeys';
import type { ZeroCodeHooks } from '../types';

/**
 * 要素の hooks プロパティの入れ物。要素が作り直す Vue アプリをまたいで同じものを渡す。
 * カスタム要素の定義より先に el.hooks が代入された場合（スクリプトの読み込み順）は、
 * インスタンス自身のプロパティになっているため、取り出してから入れ直す。
 */
export function createHooksProperty(element: HTMLElement & { hooks?: ZeroCodeHooks }) {
  const hooks: ShallowRef<ZeroCodeHooks | undefined> = shallowRef();
  if (Object.prototype.hasOwnProperty.call(element, 'hooks')) {
    hooks.value = element.hooks;
    delete element.hooks;
  }
  return {
    hooks,
    provide(app: App) {
      app.provide(zcodeElementHooksKey, hooks);
    }
  };
}
