import ZeroCodeStudio from '../components/ZeroCodeStudio.vue';
import { ZeroCodeElement } from './zerocode-element';

/**
 * <zcode-studio>: 専用パーツを編集する画面。
 * 画面の構成は zcode-editor と同じで、パーツ管理・画像管理・データビューアで扱えるのは専用カテゴリだけ
 */
class ZeroCodeStudioElement extends ZeroCodeElement {
  static get observedAttributes() {
    return ZeroCodeElement.sharedAttributes;
  }

  protected readonly component = ZeroCodeStudio;
}

if (!customElements.get('zcode-studio')) {
  customElements.define('zcode-studio', ZeroCodeStudioElement);
}

export { ZeroCodeStudioElement };
