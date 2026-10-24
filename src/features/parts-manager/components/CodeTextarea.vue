<template>
  <textarea
    ref="textareaRef"
    class="zcode-code-textarea"
    :value="modelValue"
    :aria-label="label"
    spellcheck="false"
    autocapitalize="off"
    autocomplete="off"
    autocorrect="off"
    wrap="off"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  modelValue: string;
  label?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

defineExpose({
  insertTextAtCursor(text: string) {
    const textarea = textareaRef.value;
    if (!textarea) return;
    textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.focus();
    emit('update:modelValue', textarea.value);
  }
});
</script>
