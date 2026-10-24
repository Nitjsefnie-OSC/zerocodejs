// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CodeTextarea from './CodeTextarea.vue';

describe('CodeTextarea', () => {
  it('入力した値を update:modelValue で返す', async () => {
    const wrapper = mount(CodeTextarea, { props: { modelValue: '<p>a</p>', label: 'HTML' } });
    const textarea = wrapper.find('textarea');
    expect(textarea.element.value).toBe('<p>a</p>');
    expect(textarea.attributes('aria-label')).toBe('HTML');
    expect(textarea.attributes('spellcheck')).toBe('false');

    await textarea.setValue('<p>b</p>');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['<p>b</p>']);
  });

  it('insertTextAtCursor は選択範囲を置き換えてカーソルを後ろに置く', () => {
    const wrapper = mount(CodeTextarea, {
      props: { modelValue: '{$img:OLD:image}' },
      attachTo: document.body
    });
    const textarea = wrapper.find('textarea').element;
    textarea.setSelectionRange(6, 9);

    (wrapper.vm as unknown as { insertTextAtCursor(text: string): void }).insertTextAtCursor(
      'img-1'
    );

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['{$img:img-1:image}']);
    expect(textarea.selectionStart).toBe(11);
    wrapper.unmount();
  });
});
