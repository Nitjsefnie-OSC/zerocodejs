import ZeroCodeCMS from '../components/ZeroCodeCMS.vue';
import { ZeroCodeElement } from './zerocode-element';

/** <zcode-cms>: 運営者向けの管理画面（ページの編集・追加・並べ替え・削除） */
class ZeroCodeCMSElement extends ZeroCodeElement {
  static get observedAttributes() {
    return ZeroCodeElement.sharedAttributes;
  }

  protected readonly component = ZeroCodeCMS;
}

if (!customElements.get('zcode-cms')) {
  customElements.define('zcode-cms', ZeroCodeCMSElement);
}

export { ZeroCodeCMSElement };
