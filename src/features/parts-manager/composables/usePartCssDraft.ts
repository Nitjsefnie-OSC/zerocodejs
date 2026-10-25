import { computed, nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import type { ImageCategory, ZeroCodeData } from '../../../types';

type CssMap = Partial<Record<ImageCategory, string>>;

const CATEGORY_ORDER: readonly ImageCategory[] = ['common', 'individual', 'special'];

/**
 * パーツ編集モーダルの CSS の下書きと、モーダルのプレビューに当てるページの CSS。
 * 下書きは保存するまでデータに入れず、プレビューでは表示中のカテゴリの CSS だけ下書きに差し替える
 */
export function usePartCssDraft(options: {
  cmsData: () => ZeroCodeData;
  activeCategory: Ref<ImageCategory>;
  isOpen: Ref<boolean>;
  /** ファイルで管理するカテゴリ（開いている間に元の CSS が差し替えられたら下書きも追従する） */
  isFileManaged: Ref<boolean>;
  teleportTarget: Ref<HTMLElement | null> | null;
}) {
  const { activeCategory, isOpen } = options;
  const cssDraft = ref('');
  const cssDraftInitial = ref('');
  const styleElements = new Map<ImageCategory, HTMLStyleElement>();

  const currentCss = computed(() => options.cmsData().css?.[activeCategory.value] ?? '');
  const isCssDirty = computed(() => cssDraft.value !== cssDraftInitial.value);

  function resetDraft(css: string) {
    cssDraftInitial.value = css;
    cssDraft.value = css;
  }

  function appendStyleElement(styleElement: HTMLStyleElement) {
    const root = options.teleportTarget?.value?.getRootNode();
    if (root instanceof ShadowRoot) {
      root.appendChild(styleElement);
    } else {
      document.head.appendChild(styleElement);
    }
  }

  function applyPreviewCss(cssMap: CssMap) {
    for (const category of CATEGORY_ORDER) {
      const css = cssMap[category];
      let styleElement = styleElements.get(category);
      if (!css?.trim()) {
        styleElement?.remove();
        styleElements.delete(category);
        continue;
      }
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = `zcode-css-style-parts-manager-preview-${category}`;
        styleElement.setAttribute('data-zcode-css', 'true');
        styleElement.setAttribute('data-zcode-css-parts-preview', 'true');
        styleElement.setAttribute('data-zcode-css-category', category);
        appendStyleElement(styleElement);
        styleElements.set(category, styleElement);
      }
      styleElement.textContent = css;
    }
  }

  function cleanupPreviewCss() {
    styleElements.forEach((el) => el.remove());
    styleElements.clear();
  }

  watch(
    isOpen,
    (open) => {
      if (!open) {
        cleanupPreviewCss();
        return;
      }
      nextTick(() => {
        resetDraft(currentCss.value);
        applyPreviewCss({ ...options.cmsData().css });
      });
    },
    { immediate: true }
  );

  watch(currentCss, (css) => {
    if (isOpen.value && options.isFileManaged.value) resetDraft(css);
  });

  watch(activeCategory, () => {
    if (isOpen.value) nextTick(() => resetDraft(currentCss.value));
  });

  watch([cssDraft, isOpen, activeCategory], ([css, open, category]) => {
    if (!open) return;
    nextTick(() => applyPreviewCss({ ...options.cmsData().css, [category]: css ?? '' }));
  });

  onBeforeUnmount(cleanupPreviewCss);

  return {
    cssDraft,
    isCssDirty,
    /** 保存した下書きを、次に変えたかどうかの基準にする */
    markDraftSaved: () => {
      cssDraftInitial.value = cssDraft.value;
    },
    discardDraft: () => {
      cssDraft.value = cssDraftInitial.value;
      cleanupPreviewCss();
    }
  };
}
