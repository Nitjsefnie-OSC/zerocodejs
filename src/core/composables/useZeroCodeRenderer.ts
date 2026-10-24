import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useI18n } from '../../i18n';
import type { ZeroCodeData, ComponentData, PartData } from '../../types';
import {
  renderComponentCore,
  RenderError,
  type RenderComponentCoreContext
} from '../renderer/renderer';
import { findPartById } from '../utils/path-utils';
import { joinPageHtmlWithAddButtons } from '../utils/page-add-buttons';

function renderErrorToHtml(error: RenderError): string {
  return `<div class="zcode-error-message" data-error-code="${error.code}">${error.message}</div>`;
}

export function useZeroCodeRenderer(
  cmsData: MaybeRefOrGetter<ZeroCodeData>,
  enableEditorAttributes: boolean = true
) {
  const { t } = useI18n();

  function findPart(partId: string): PartData | null {
    return findPartById(partId, toValue(cmsData).parts);
  }

  const context = computed<RenderComponentCoreContext>(() => {
    const data = toValue(cmsData);
    return {
      findPart,
      enableEditorAttributes,
      imagesCommon: data.images.common,
      imagesIndividual: data.images.individual,
      imagesSpecial: data.images.special,
      backendData: data.backendData,
      options: enableEditorAttributes
        ? {
            translations: {
              addSlotButton: t('emptyState.addPart'),
              addBeforeButton: t('addPanel.addBefore'),
              addAfterButton: t('addPanel.addAfter')
            }
          }
        : undefined
    };
  });

  function renderComponentToHtml(
    component: ComponentData,
    path: string = '',
    processedPaths: Set<string> = new Set()
  ): string {
    try {
      return renderComponentCore(
        component,
        path,
        processedPaths,
        context.value,
        (childComponent, childPath) =>
          renderComponentToHtml(childComponent, childPath, processedPaths)
      );
    } catch (error) {
      if (error instanceof RenderError) {
        return renderErrorToHtml(error);
      }
      throw error;
    }
  }

  function renderComponentPreviewHtml(
    component: ComponentData,
    path: string = '',
    processedPaths: Set<string> = new Set()
  ): string {
    const previewContext: RenderComponentCoreContext = {
      ...context.value,
      enableEditorAttributes: false,
      options: undefined
    };

    try {
      return renderComponentCore(
        component,
        path,
        processedPaths,
        previewContext,
        (childComponent, childPath) =>
          renderComponentPreviewHtml(childComponent, childPath, processedPaths)
      );
    } catch (error) {
      if (error instanceof RenderError) {
        return renderErrorToHtml(error);
      }
      throw error;
    }
  }

  const fullPageHtml = computed(() => {
    const data = toValue(cmsData);
    const pageHtmlParts = data.page.map((component, index) =>
      renderComponentToHtml(component, `page.${index}`)
    );
    return joinPageHtmlWithAddButtons(pageHtmlParts, enableEditorAttributes, {
      before: t('addPanel.addBefore'),
      after: t('addPanel.addAfter')
    });
  });

  return {
    fullPageHtml,
    renderComponentToHtml,
    renderComponentPreviewHtml,
    findPart
  };
}
