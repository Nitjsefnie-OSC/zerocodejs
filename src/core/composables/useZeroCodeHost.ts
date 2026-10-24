import { computed, inject, provide, type ComputedRef } from 'vue';
import type { ImageUploadSettings, ZeroCodeHooks, ZeroCodeSource } from '../../types';
import { zcodeElementHooksKey, zcodeHostKey } from '../injectionKeys';

export interface ZeroCodeHost {
  source: ZeroCodeSource;
  hooks: ComputedRef<ZeroCodeHooks>;
  images: ImageUploadSettings;
}

/**
 * 最上位のコンポーネント（CMS / Editor / Studio）で呼ぶ。Editor・Studio の中の CMS では、
 * 外側が決めたものをそのまま使う。hooks は prop を優先し、なければ Web Component のプロパティ。
 */
export function provideZeroCodeHost(options: {
  source: ZeroCodeSource;
  hooks: () => ZeroCodeHooks | undefined;
  images?: ImageUploadSettings;
}): ZeroCodeHost {
  const outer = inject(zcodeHostKey, null);
  if (outer) return outer;
  const elementHooks = inject(zcodeElementHooksKey, null);
  const host: ZeroCodeHost = {
    source: options.source,
    hooks: computed(() => options.hooks() ?? elementHooks?.value ?? {}),
    images: options.images ?? {}
  };
  provide(zcodeHostKey, host);
  return host;
}

export function useZeroCodeHost(): ZeroCodeHost {
  return (
    inject(zcodeHostKey, null) ?? {
      source: 'cms',
      hooks: computed(() => ({})),
      images: {}
    }
  );
}
