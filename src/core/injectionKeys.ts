import type { InjectionKey, Ref } from 'vue';
import type { ResolvedRichTextConfig } from '../features/editor/rich-text/features';
import type { ZeroCodeHooks } from '../types';
import type { ZeroCodeHost } from './composables/useZeroCodeHost';

/** Teleport 先（Shadow 内ホスト）。未提供時は各所で `body` にフォールバック */
export const zcodeTeleportTargetKey: InjectionKey<Ref<HTMLElement | null>> =
  Symbol('zcodeTeleportTarget');

/** リッチテキストエディタの設定（config の richText）。未提供時はデフォルト */
export const zcodeRichTextConfigKey: InjectionKey<ResolvedRichTextConfig> =
  Symbol('zcodeRichTextConfig');

/** Web Component の hooks プロパティ（app.provide で渡す） */
export const zcodeElementHooksKey: InjectionKey<Ref<ZeroCodeHooks | undefined>> =
  Symbol('zcodeElementHooks');

/** 最上位のコンポーネントが決めた、ホストとの連携の情報（useZeroCodeHost） */
export const zcodeHostKey: InjectionKey<ZeroCodeHost> = Symbol('zcodeHost');
