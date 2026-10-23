// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RichTextEditor from './RichTextEditor.vue';
import { createZeroCodeI18n } from '../../../i18n';
import { zcodeRichTextFeaturesKey } from '../../../core/injectionKeys';
import { resolveRichTextFeatures } from '../rich-text/features';

function mountEditor(
  modelValue: string,
  features?: unknown,
  extraProps: { readonly?: boolean; disabled?: boolean } = {}
) {
  return mount(RichTextEditor, {
    props: { modelValue, ...extraProps },
    attachTo: document.body,
    global: {
      plugins: [createZeroCodeI18n('ja')],
      provide:
        features === undefined
          ? {}
          : { [zcodeRichTextFeaturesKey as symbol]: resolveRichTextFeatures(features) }
    }
  });
}

const buttonLabels = (wrapper: ReturnType<typeof mountEditor>) =>
  wrapper.findAll('.zcode-rich-text-toolbar button').map((b) => b.attributes('aria-label'));

describe('RichTextEditor', () => {
  it('config がなければデフォルトの機能のボタンを表示する', () => {
    const wrapper = mountEditor('<p>a</p>');
    expect(buttonLabels(wrapper)).toEqual([
      '太字',
      '取り消し線',
      '箇条書き',
      '番号付きリスト',
      'リンク',
      '元に戻す',
      'やり直す'
    ]);
    wrapper.unmount();
  });

  it('指定した機能のボタンだけを表示する', () => {
    const wrapper = mountEditor('<p>a</p>', ['heading', 'blockquote', 'subscript', 'clearFormat']);
    expect(buttonLabels(wrapper)).toEqual([
      '下付き',
      '見出し2',
      '見出し3',
      '見出し4',
      '引用',
      '文字の装飾を解除'
    ]);
    wrapper.unmount();
  });

  it('保存済みの値を無害化し、無効な機能のタグを外して表示する', () => {
    const wrapper = mountEditor(
      '<h2>見出し</h2><p><strong>太字</strong><img src=x onerror="alert(1)"></p>',
      ['bold']
    );
    expect(wrapper.find('.zcode-rich-text-editor-content').element.innerHTML).toBe(
      '<p>見出し</p><p><strong>太字</strong></p>'
    );
    wrapper.unmount();
  });

  it('読み込んだだけでは update:modelValue を発火しない', () => {
    const wrapper = mountEditor('<ul><li><p>旧形式</p></li></ul>');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
  });

  it('ツールバーで Tab が止まるのは1つだけで、矢印キーで移動する', async () => {
    const wrapper = mountEditor('<p>a</p>');
    const tabStops = () =>
      wrapper
        .findAll('.zcode-rich-text-toolbar button')
        .filter((b) => b.attributes('tabindex') === '0')
        .map((b) => b.attributes('aria-label'));
    expect(tabStops()).toEqual(['太字']);

    await wrapper.find('.zcode-rich-text-toolbar').trigger('keydown', { key: 'ArrowRight' });
    expect(tabStops()).toEqual(['取り消し線']);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('取り消し線');

    // 無効な「元に戻す」「やり直す」は飛ばす
    await wrapper.find('.zcode-rich-text-toolbar').trigger('keydown', { key: 'End' });
    expect(tabStops()).toEqual(['リンク']);
    await wrapper.find('.zcode-rich-text-toolbar').trigger('keydown', { key: 'ArrowRight' });
    expect(tabStops()).toEqual(['太字']);
    wrapper.unmount();
  });

  it('選択範囲がなくてもツールバーの操作で本文末尾から書式を始められる', async () => {
    const wrapper = mountEditor('<p>a</p>');
    document.getSelection()?.removeAllRanges();
    await wrapper.find('button[aria-label="箇条書き"]').trigger('click');
    expect(wrapper.find('.zcode-rich-text-editor-content').element.innerHTML).toBe(
      '<ul><li>a</li></ul>'
    );
    expect(document.activeElement).toBe(wrapper.find('.zcode-rich-text-editor-content').element);
    wrapper.unmount();
  });

  it('読み取り専用では編集できず、ツールバーも無効にする', () => {
    const wrapper = mountEditor('<p>a</p>', undefined, { readonly: true });
    const content = wrapper.find('.zcode-rich-text-editor-content');
    expect(content.attributes('contenteditable')).toBe('false');
    expect(content.attributes('aria-readonly')).toBe('true');
    expect(
      wrapper
        .findAll('.zcode-rich-text-toolbar button')
        .every((b) => b.attributes('disabled') !== undefined)
    ).toBe(true);
    wrapper.unmount();
  });

  it('リンクボタンはフォームの開閉を aria-expanded で示し、フォーム内の Esc は外へ伝えない', async () => {
    const wrapper = mountEditor('<p>a</p>');
    const linkButton = wrapper.find('button[aria-label="リンク"]');
    expect(linkButton.attributes('aria-pressed')).toBeUndefined();
    expect(linkButton.attributes('aria-expanded')).toBe('false');

    await linkButton.trigger('click');
    expect(linkButton.attributes('aria-expanded')).toBe('true');
    const form = wrapper.find('.zcode-rich-text-link-form');
    expect(linkButton.attributes('aria-controls')).toBe(form.attributes('id'));

    const escapes: KeyboardEvent[] = [];
    const listener = (event: KeyboardEvent) => escapes.push(event);
    document.addEventListener('keydown', listener);
    await wrapper.find('.zcode-rich-text-link-newtab input').trigger('keydown', { key: 'Escape' });
    document.removeEventListener('keydown', listener);

    expect(escapes).toHaveLength(0);
    expect(wrapper.find('.zcode-rich-text-link-form').exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.find('.zcode-rich-text-editor-content').element);
    wrapper.unmount();
  });
});
