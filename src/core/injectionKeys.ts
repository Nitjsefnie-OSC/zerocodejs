import type { InjectionKey, Ref } from 'vue';
import type { ResolvedRichTextConfig } from '../features/editor/rich-text/features';

/** Teleport 先（Shadow 内ホスト）。未提供時は各所で `body` にフォールバック */
export const zcodeTeleportTargetKey: InjectionKey<Ref<HTMLElement | null>> =
  Symbol('zcodeTeleportTarget');

/** リッチテキストエディタの設定（config の richText）。未提供時はデフォルト */
export const zcodeRichTextConfigKey: InjectionKey<ResolvedRichTextConfig> =
  Symbol('zcodeRichTextConfig');
