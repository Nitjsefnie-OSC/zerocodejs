import { getCurrentInstance, type Ref } from 'vue';

const HOST_SELECTOR = 'zcode-cms, zcode-editor, zcode-studio';

/** ノードを含む Web Component の要素（Shadow DOM ではシャドウルートのホスト、Light DOM では最も近い祖先） */
export function findHostElement(node: Node | null | undefined): HTMLElement | null {
  if (!node) return null;
  const root = node.getRootNode();
  if (root instanceof ShadowRoot) return root.host as HTMLElement;
  const element = node instanceof Element ? node : node.parentElement;
  return (element?.closest(HOST_SELECTOR) as HTMLElement | null) ?? null;
}

export function createRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * ホストの要素へイベントを送る。同じページに複数の要素があっても、このコンポーネントを含む要素に届く。
 * setup の中で呼ぶ（コンポーネントの要素を後から辿るため）
 */
export function useHostEvents(elementRef?: Ref<HTMLElement | null>) {
  const instance = getCurrentInstance();

  function getHostElement(): HTMLElement | null {
    return findHostElement(elementRef?.value ?? (instance?.vnode.el as Node | null | undefined));
  }

  function dispatchEvent(eventName: string, detail: unknown) {
    const event = new CustomEvent(eventName, { detail, bubbles: true, composed: true });
    const host = getHostElement();
    if (host) {
      host.dispatchEvent(event);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  return { getHostElement, dispatchEvent };
}
