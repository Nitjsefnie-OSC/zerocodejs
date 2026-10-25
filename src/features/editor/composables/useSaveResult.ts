import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import { useI18n } from '../../../i18n';

export type SaveResultError = { path?: string; field?: string; message?: string; code?: string };

export type SaveErrorBanner = {
  visible: boolean;
  message: string;
  requestId?: string;
  target?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);

export function parseSaveResultErrors(input: unknown): SaveResultError[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isObject).map((e) => ({
    path: optionalString(e.path),
    field: optionalString(e.field),
    message: optionalString(e.message),
    code: optionalString(e.code)
  }));
}

/** errors のうち、指定したパスのコンポーネント（パス指定のないものを含む）のフィールドのエラー */
export function fieldErrorsForPath(
  errors: SaveResultError[],
  path: string | null
): Record<string, string> {
  if (!path) return {};
  const result: Record<string, string> = {};
  for (const err of errors) {
    if (!err.field || !err.message) continue;
    if (err.path && err.path !== path) continue;
    result[err.field] = err.message;
  }
  return result;
}

/**
 * ホストから届く save-result を受け取り、失敗時のバナーと編集中のフィールドのエラーに反映する
 */
export function useSaveResult(
  getHostElement: () => HTMLElement | null,
  editingComponentPath: Ref<string | null | undefined>
) {
  const { t } = useI18n();
  const fieldErrors = ref<Record<string, string>>({});
  const lastErrors = ref<SaveResultError[]>([]);
  const saveErrorBanner = ref<SaveErrorBanner>({ visible: false, message: '' });

  function applyFieldErrors() {
    fieldErrors.value = fieldErrorsForPath(lastErrors.value, editingComponentPath.value || null);
  }

  function clearFieldError(fieldName: string) {
    if (!fieldErrors.value[fieldName]) return;
    const next = { ...fieldErrors.value };
    delete next[fieldName];
    fieldErrors.value = next;
  }

  function handleSaveResult(e: Event) {
    const detail = (e as CustomEvent<unknown>).detail;
    if (!isObject(detail)) return;

    if (detail.ok === true) {
      saveErrorBanner.value = { visible: false, message: '' };
      lastErrors.value = [];
      fieldErrors.value = {};
      return;
    }
    if (detail.ok !== false) return;

    const errors = parseSaveResultErrors(detail.errors);
    lastErrors.value = errors;

    const count = errors.length;
    const firstMessage = errors[0]?.message || null;
    saveErrorBanner.value = {
      visible: true,
      requestId: optionalString(detail.requestId),
      target: optionalString(detail.target),
      message: firstMessage
        ? t('editor.saveFailedWithMessage', { count, message: firstMessage })
        : t('editor.saveFailedWithCount', { count })
    };

    applyFieldErrors();
  }

  watch(editingComponentPath, applyFieldErrors);

  let host: HTMLElement | null = null;
  onMounted(() => {
    host = getHostElement();
    host?.addEventListener('save-result', handleSaveResult);
  });
  onUnmounted(() => {
    host?.removeEventListener('save-result', handleSaveResult);
    host = null;
  });

  return { fieldErrors, saveErrorBanner, clearFieldError };
}
