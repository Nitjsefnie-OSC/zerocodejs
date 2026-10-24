import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createZeroCodeI18n, useI18n } from './index';
import ja from './locales/ja';
import en from './locales/en';

function keys(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );
}

describe('createZeroCodeI18n', () => {
  it('ロケールの文言を返し、{name} を引数で置き換える', () => {
    expect(createZeroCodeI18n('ja').t('editPanel.id', { id: 'a1' })).toBe('ID: a1');
    expect(createZeroCodeI18n('en').t('common.cancel')).toBe('Cancel');
  });

  it('引数にない名前は空文字にし、{$field} のようなテンプレート記法は残す', () => {
    const { t } = createZeroCodeI18n('ja');
    expect(t('editPanel.id')).toBe('ID: ');
    expect(t('partsManager.imageIdReferenceDesc')).toContain('{$field:default:image}');
  });

  it('文言がなければ ja にフォールバックし、ja にもなければキーを返す', () => {
    const i18n = createZeroCodeI18n('en');
    expect(i18n.t('no.such.key')).toBe('no.such.key');
    expect(i18n.t('common')).toBe('common');
  });

  it('ja と en のキーがそろっている', () => {
    expect(keys(en).sort()).toEqual(keys(ja).sort());
  });
});

describe('useI18n / $t', () => {
  it('locale を変えるとテンプレートの表示が切り替わる', async () => {
    const i18n = createZeroCodeI18n('ja');
    const Comp = defineComponent({
      setup() {
        const { t } = useI18n();
        return () => h('div', [h('span', t('common.cancel'))]);
      }
    });
    const Global = defineComponent({ template: '<span>{{ $t("common.cancel") }}</span>' });
    const wrapper = mount(Comp, { global: { plugins: [i18n] } });
    const globalWrapper = mount(Global, { global: { plugins: [i18n] } });
    expect(wrapper.text()).toBe(ja.common.cancel);
    expect(globalWrapper.text()).toBe(ja.common.cancel);

    i18n.locale.value = 'en';
    await nextTick();
    expect(wrapper.text()).toBe('Cancel');
    expect(globalWrapper.text()).toBe('Cancel');
  });

  it('プラグインを入れずに useI18n を呼ぶとエラーにする', () => {
    const Comp = defineComponent({
      setup() {
        useI18n();
        return () => null;
      }
    });
    expect(() => mount(Comp)).toThrow('i18n is not installed');
  });
});
