import type { CMSConfig } from '../../types';
import { logger } from './logger';

/** config 属性の JSON 文字列を読む（読めなければ空の設定） */
export function parseConfig(
  configString: string | undefined,
  componentName: string
): Partial<CMSConfig> {
  if (!configString) return {};
  try {
    const config = JSON.parse(configString);
    if (config && typeof config === 'object' && 'studio' in config) {
      logger.warn(
        `${componentName}: config.studio は廃止しました。parts.fileManagedCategories / parts.sanitizeTemplate / dev.showSaveConfirm を使ってください`
      );
    }
    return config;
  } catch (e) {
    logger.warn(`${componentName}: Failed to parse config:`, e);
    return {};
  }
}
