import ZeroCodeEditor from '../components/ZeroCodeEditor.vue';
import { ZeroCodeElement } from './zerocode-element';

/** <zcode-editor>: 開発者向けの管理画面（cms の機能 ＋ パーツ管理・画像管理・データビューア） */
class ZeroCodeEditorElement extends ZeroCodeElement {
  static get observedAttributes() {
    return [...ZeroCodeElement.sharedAttributes, 'enable-parts-manager', 'enable-images-manager'];
  }

  protected readonly component = ZeroCodeEditor;

  protected extraProps() {
    return {
      enablePartsManager: this.getAttribute('enable-parts-manager') !== 'false',
      enableImagesManager: this.getAttribute('enable-images-manager') !== 'false'
    };
  }
}

if (!customElements.get('zcode-editor')) {
  customElements.define('zcode-editor', ZeroCodeEditorElement);
}

export { ZeroCodeEditorElement };
