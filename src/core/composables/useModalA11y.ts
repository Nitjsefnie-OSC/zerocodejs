import { watch, nextTick, onBeforeUnmount, getCurrentInstance, type Ref } from 'vue';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(', ');

// 重なったモーダルで最前面だけが Esc / Tab を処理するためのスタック
const modalStack: symbol[] = [];

/**
 * モーダルのキーボード操作を提供する。
 * - Esc キーで閉じる（重なっている場合は最前面のモーダルのみ）
 * - Tab / Shift+Tab のフォーカスをモーダル内に閉じ込める
 * - 開いたとき最初のフォーカス可能要素へ移動し、閉じたとき元の要素へ戻す
 *
 * @param isOpen - モーダルの開閉状態
 * @param onClose - Esc で閉じる際に呼ぶコールバック
 * @param containerRef - モーダルのコンテンツ要素（フォーカストラップの範囲）
 */
export interface ModalA11yOptions {
  /** true を返すキーイベントでは Esc を無視する（例: 独自のポップアップを持つ入力欄の中） */
  shouldIgnoreEscape?: (event: KeyboardEvent) => boolean;
}

export function useModalA11y(
  isOpen: () => boolean,
  onClose: () => void,
  containerRef: Ref<HTMLElement | null>,
  options: ModalA11yOptions = {}
) {
  const id = Symbol('modal');
  let previousActiveElement: HTMLElement | null = null;

  const isTopModal = () => modalStack[modalStack.length - 1] === id;

  const focusableElements = (): HTMLElement[] => {
    const container = containerRef.value;
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => el.checkVisibility?.() ?? true
    );
  };

  const activeElementDeep = (): Element | null => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return active;
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!isTopModal()) return;
    // 他の要素が処理済みの Esc（ポップオーバーを閉じる等）ではモーダルを閉じない
    if (event.defaultPrevented) return;
    // IME の変換取消の Esc でモーダルを閉じない（keyCode 229 は Safari 対策）
    if (event.isComposing || event.keyCode === 229) return;

    if (event.key === 'Escape') {
      if (options.shouldIgnoreEscape?.(event)) return;
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key === 'Tab') {
      const focusables = focusableElements();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = activeElementDeep();
      const insideModal = active instanceof HTMLElement && containerRef.value?.contains(active);

      if (event.shiftKey) {
        if (!insideModal || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (!insideModal || active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  };

  const activate = () => {
    const active = activeElementDeep();
    previousActiveElement = active instanceof HTMLElement ? active : null;
    modalStack.push(id);
    // ポップオーバー側（usePanelOptionsPopover）は capture フェーズ + preventDefault で
    // 先に Esc を処理するため、こちらはバブルフェーズで登録する
    document.addEventListener('keydown', handleKeydown);
    nextTick(() => {
      focusableElements()[0]?.focus();
    });
  };

  const deactivate = () => {
    const index = modalStack.indexOf(id);
    if (index !== -1) modalStack.splice(index, 1);
    document.removeEventListener('keydown', handleKeydown);
    if (previousActiveElement?.isConnected) {
      previousActiveElement.focus();
    }
    previousActiveElement = null;
  };

  watch(isOpen, (open, wasOpen) => {
    if (open && !wasOpen) activate();
    else if (!open && wasOpen) deactivate();
  });

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      if (isOpen()) deactivate();
    });
  }
}
