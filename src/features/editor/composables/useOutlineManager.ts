const ACTIVE_CLASS_PREFIX = 'zcode-outline-active-';
const HOVER_CLASS_PREFIX = 'zcode-outline-hover-';
const DISCOVER_CLASS_PREFIX = 'zcode-outline-discover-';
export const DISCOVERY_PULSE_CLASS = 'zcode-outline-discover-pulse';
export const REORDER_TARGET_CLASS = 'zcode-outline-reorder-target';
export const REORDER_TARGET_PULSE_CLASS = 'zcode-outline-reorder-target-pulse';

function clearPrefixedClasses(element: HTMLElement, prefix: string) {
  const classesToRemove = Array.from(element.classList).filter((cls) => cls.startsWith(prefix));
  classesToRemove.forEach((cls) => element.classList.remove(cls));
}

// アクティブ時のアウトラインを設定
export function setActiveOutline(element: HTMLElement, mode: string) {
  clearPrefixedClasses(element, ACTIVE_CLASS_PREFIX);
  element.classList.add('zcode-outline-active');
  element.classList.add(`${ACTIVE_CLASS_PREFIX}${mode}`);
}

// アクティブ時のアウトラインを削除
export function removeActiveOutline(element: HTMLElement) {
  element.classList.remove('zcode-outline-active');
  clearPrefixedClasses(element, ACTIVE_CLASS_PREFIX);
}

// ホバー時のアウトラインを設定
export function setHoverOutline(element: HTMLElement, mode: string) {
  clearPrefixedClasses(element, HOVER_CLASS_PREFIX);
  element.classList.add('zcode-outline-hover');
  element.classList.add(`${HOVER_CLASS_PREFIX}${mode}`);
}

// ホバー時のアウトラインを削除
export function removeHoverOutline(element: HTMLElement) {
  element.classList.remove('zcode-outline-hover');
  clearPrefixedClasses(element, HOVER_CLASS_PREFIX);
}

// 未選択時のディスカバリー用アウトライン（薄い点線）
export function setDiscoveryOutline(element: HTMLElement, mode: string, pulse = false) {
  clearPrefixedClasses(element, DISCOVER_CLASS_PREFIX);
  element.classList.remove(DISCOVERY_PULSE_CLASS);
  element.classList.add('zcode-outline-discover');
  element.classList.add(`${DISCOVER_CLASS_PREFIX}${mode}`);
  if (pulse) {
    element.classList.add(DISCOVERY_PULSE_CLASS);
  }
}

export function removeDiscoveryOutline(element: HTMLElement) {
  element.classList.remove('zcode-outline-discover');
  element.classList.remove(DISCOVERY_PULSE_CLASS);
  clearPrefixedClasses(element, DISCOVER_CLASS_PREFIX);
}

export function clearAllDiscoveryPulse(root: HTMLElement) {
  root.querySelectorAll(`.${DISCOVERY_PULSE_CLASS}`).forEach((el) => {
    (el as HTMLElement).classList.remove(DISCOVERY_PULSE_CLASS);
  });
}

export function clearAllDiscoveryOutlines(root: HTMLElement) {
  root.querySelectorAll('.zcode-outline-discover').forEach((el) => {
    removeDiscoveryOutline(el as HTMLElement);
  });
}

export function setReorderTargetOutline(element: HTMLElement, pulse = false) {
  element.classList.remove(REORDER_TARGET_PULSE_CLASS);
  element.classList.add(REORDER_TARGET_CLASS);
  if (pulse) {
    element.classList.add(REORDER_TARGET_PULSE_CLASS);
  }
}

export function removeReorderTargetOutline(element: HTMLElement) {
  element.classList.remove(REORDER_TARGET_CLASS);
  element.classList.remove(REORDER_TARGET_PULSE_CLASS);
}

export function findElementsByZcodePath(root: HTMLElement, path: string): HTMLElement[] {
  return Array.from(root.querySelectorAll(`[data-zcode-path="${path}"]`)) as HTMLElement[];
}

export function findComponentElementsByZcodePath(root: HTMLElement, path: string): HTMLElement[] {
  return Array.from(
    root.querySelectorAll(`[data-zcode-path="${path}"][data-zcode-id]`)
  ) as HTMLElement[];
}

/**
 * スクロール先にする要素を返す。同じパスを持つ追加ボタン（非表示のときは高さ 0）より
 * パーツ本体を優先する
 */
export function findScrollTargetByZcodePath(root: HTMLElement, path: string): HTMLElement | null {
  return (
    findComponentElementsByZcodePath(root, path)[0] ??
    findElementsByZcodePath(root, path)[0] ??
    null
  );
}

export function setActiveOutlineForPath(root: HTMLElement, path: string, mode: string): void {
  findElementsByZcodePath(root, path).forEach((element) => setActiveOutline(element, mode));
}

export function removeActiveOutlineForPath(root: HTMLElement, path: string): void {
  findElementsByZcodePath(root, path).forEach((element) => removeActiveOutline(element));
}

export function removeHoverOutlineForPath(root: HTMLElement, path: string): void {
  findElementsByZcodePath(root, path).forEach((element) => removeHoverOutline(element));
}

export function clearAllReorderTargetPulse(root: HTMLElement) {
  root.querySelectorAll(`.${REORDER_TARGET_PULSE_CLASS}`).forEach((el) => {
    (el as HTMLElement).classList.remove(REORDER_TARGET_PULSE_CLASS);
  });
}

export function clearAllReorderTargetOutlines(root: HTMLElement) {
  root.querySelectorAll(`.${REORDER_TARGET_CLASS}`).forEach((el) => {
    removeReorderTargetOutline(el as HTMLElement);
  });
}
