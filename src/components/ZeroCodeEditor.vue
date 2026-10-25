<template>
  <ZeroCodeWorkspace ref="workspaceRef" v-bind="props" source="editor" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ZeroCodeWorkspace from './ZeroCodeWorkspace.vue';
import type { ZeroCodeDataProps } from './props';

const props = withDefaults(
  defineProps<
    ZeroCodeDataProps & {
      enablePartsManager?: boolean;
      enableImagesManager?: boolean;
    }
  >(),
  { enablePartsManager: true, enableImagesManager: true }
);

const workspaceRef = ref<InstanceType<typeof ZeroCodeWorkspace> | null>(null);

defineExpose({
  getData: (path?: string) => workspaceRef.value?.getData(path),
  setData: (path: string | Record<string, unknown>, value?: unknown) =>
    workspaceRef.value?.setData(path, value) ?? false,
  allowDynamicContentInteraction: computed({
    get: () => workspaceRef.value?.allowDynamicContentInteraction ?? false,
    set: (value: boolean) => {
      if (workspaceRef.value) workspaceRef.value.allowDynamicContentInteraction = value;
    }
  })
});
</script>
