<template>
  <div ref="previewArea">
    <!-- 完全リアクティブなHTMLレンダリング（ラッパーなし） -->
    <!-- eslint-disable-next-line vue/no-v-html -- 描画処理で無害化済みの HTML -->
    <div ref="htmlContainer" v-html="fullPageHtml" />

    <!-- パーツが空の場合（編集機能がある場合のみ表示） -->
    <div v-if="cmsData.page.length === 0 && onAddClick" class="zcode-empty-state">
      <p>{{ $t('emptyState.message') }}</p>
      <button class="zcode-add-btn" @click="onAddClick('page.0')">
        {{ $t('emptyState.addPart') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { ZeroCodeData } from '../../types';
import { PageCSSManager } from '../../core/utils/css-manager';

const props = defineProps<{
  cmsData: ZeroCodeData;
  fullPageHtml: string;
  onAddClick?: (path: string) => void;
  allowDynamicContentInteraction?: boolean;
}>();

const previewArea = ref<HTMLElement | null>(null);
const htmlContainer = ref<HTMLElement | null>(null);
const cssManager = new PageCSSManager();

let observer: MutationObserver | null = null;
let pendingUpdate = false;

const handleClick = (event: MouseEvent) => {
  if (props.allowDynamicContentInteraction === false) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' || target.closest('a')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
};

watch(
  () => props.fullPageHtml,
  () => {
    nextTick(() => {
      if (htmlContainer.value) {
        pendingUpdate = true;

        if (observer) {
          observer.disconnect();
        }

        observer = new MutationObserver(() => {
          if (pendingUpdate) {
            pendingUpdate = false;
            nextTick(() => {
              window.dispatchEvent(new CustomEvent('zcode-dom-updated', {}));
              if (observer) {
                observer.disconnect();
                observer = null;
              }
            });
          }
        });

        observer.observe(htmlContainer.value, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
    });
  },
  { immediate: false }
);

// CSSの変更を監視
watch(
  () => [props.cmsData.css?.common, props.cmsData.css?.individual, props.cmsData.css?.special],
  () => {
    nextTick(() => {
      applyPageCSS();
    });
  },
  { deep: true }
);

// CSSを適用（共通 → 個別 → 専用の順）
function applyPageCSS() {
  if (!previewArea.value) return;

  // Shadow DOMまたはLight DOMのコンテナを取得
  const rootNode = previewArea.value.getRootNode() as ShadowRoot | Document;
  if (rootNode instanceof ShadowRoot) {
    // Shadow DOMを使用している場合はShadow DOM内に注入
    cssManager.setContainer(rootNode);
  } else {
    // Light DOMの場合はdocument.headに注入
    cssManager.setContainer(document.head);
  }

  const cssMap = {
    common: props.cmsData.css?.common,
    individual: props.cmsData.css?.individual,
    special: props.cmsData.css?.special
  };
  cssManager.applyMultipleCSS(cssMap);
}

onMounted(() => {
  nextTick(() => {
    if (htmlContainer.value) {
      window.dispatchEvent(new CustomEvent('zcode-dom-updated', {}));
      // クリックイベントリスナーを追加
      htmlContainer.value.addEventListener('click', handleClick, true);
    }
    // CSSを適用
    applyPageCSS();
  });
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  // クリックイベントリスナーを削除
  if (htmlContainer.value) {
    htmlContainer.value.removeEventListener('click', handleClick, true);
  }
  // CSSマネージャーをクリーンアップ
  cssManager.cleanup();
});

defineExpose({
  previewArea
});
</script>
