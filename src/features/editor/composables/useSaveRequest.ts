import { ref, type Ref } from 'vue';
import { createRequestId } from '../../../core/composables/useHostEvents';
import { logger } from '../../../core/utils/logger';
import { useI18n } from '../../../i18n';
import type { ZeroCodeSource } from '../../../types';

/**
 * 保存ボタンから save-request を送るまで（必要なら確認ダイアログを挟む）
 */
export function useSaveRequest(options: {
  source: () => ZeroCodeSource;
  getTargets: () => string[];
  showConfirm: Ref<boolean>;
  dispatchEvent: (eventName: string, detail: unknown) => void;
}) {
  const { t } = useI18n();
  const showSaveConfirmDialog = ref(false);
  const pendingSaveTargets = ref<string[]>([]);

  function sendSaveRequest(targets: string[]) {
    options.dispatchEvent('save-request', {
      requestId: createRequestId(),
      source: options.source(),
      targets,
      timestamp: Date.now()
    });
  }

  function requestSave() {
    const targets = options.getTargets();
    if (targets.length === 0) {
      logger.warn(t('editor.noSaveTargets'));
      return;
    }
    if (!options.showConfirm.value) {
      sendSaveRequest(targets);
      return;
    }
    pendingSaveTargets.value = targets;
    showSaveConfirmDialog.value = true;
  }

  function confirmSave() {
    showSaveConfirmDialog.value = false;
    sendSaveRequest(pendingSaveTargets.value);
    pendingSaveTargets.value = [];
  }

  function cancelSave() {
    showSaveConfirmDialog.value = false;
    pendingSaveTargets.value = [];
  }

  return { showSaveConfirmDialog, pendingSaveTargets, requestSave, confirmSave, cancelSave };
}
