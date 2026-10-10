import type { InjectionKey, Ref } from 'vue';
import type { RichTextFeature } from '../features/editor/rich-text/features';

/** Teleport 先（Shadow 内ホスト）。未提供時は各所で `body` にフォールバック */
export const zcodeTeleportTargetKey: InjectionKey<Ref<HTMLElement | null>> =
  Symbol('zcodeTeleportTarget');

/** リッチテキストエディタで有効な機能（config の richText.features）。未提供時はデフォルト */
export const zcodeRichTextFeaturesKey: InjectionKey<ReadonlySet<RichTextFeature>> =
  Symbol('zcodeRichTextFeatures');
