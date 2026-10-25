import { ref, watch, type Ref } from 'vue';
import type { CMSConfig, CMSSettings } from '../../../types';
import { saveCMSSettings } from '../../../core/utils/storage';
import {
  resolveCmsSettingDefault,
  resolveCmsSettingsDefaultsAfterClear
} from '../../../core/utils/cms-settings-reset';

/** 変えたらすぐ localStorage に残す設定（allowDynamicContentInteraction は表示モードで一時的に変わるため CMS 側で扱う） */
const PERSISTED_KEYS = [
  'devRightPadding',
  'enableContextMenu',
  'showSaveConfirm',
  'scrollIntoViewOnPartEdit',
  'showPartDiscoveryOutlines',
  'showAddBetweenButtons',
  'showReorderStructureLabels'
] as const satisfies readonly (keyof CMSSettings)[];

type PersistedKey = (typeof PERSISTED_KEYS)[number];

/**
 * CMS の利用者ごとの設定。初期値は localStorage > config.cms > コードの既定値
 */
export function useCmsSettings(config: Partial<CMSConfig>) {
  const settings = Object.fromEntries(
    PERSISTED_KEYS.map((key) => [key, ref(resolveCmsSettingDefault(key, config))])
  ) as Record<PersistedKey, Ref<boolean>>;

  for (const key of PERSISTED_KEYS) {
    watch(settings[key], (value) => saveCMSSettings({ [key]: value }));
  }

  /** keys を localStorage から消し、残った既定値に戻す。戻した値を返す（keys に CMS 側で扱う設定が含まれる場合用） */
  function resetSettings(keys: readonly (keyof CMSSettings)[]): Partial<CMSSettings> {
    const defaults = resolveCmsSettingsDefaultsAfterClear(keys, config);
    for (const key of keys) {
      const value = defaults[key];
      if (key in settings && value !== undefined) {
        settings[key as PersistedKey].value = value;
      }
    }
    return defaults;
  }

  return { ...settings, resetSettings };
}
