import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { mount } from '@vue/test-utils';
import * as uiIcons from './index';
import * as richTextIcons from './rich-text';

const icons = { ...uiIcons, ...richTextIcons };

describe('icons', () => {
  it.each(Object.entries(icons))('%s は SVG を描き、size と属性を引き継ぐ', (_name, icon) => {
    const wrapper = mount({
      render: () => h(icon, { size: 14, class: 'zcode-x', 'aria-hidden': 'true' })
    });
    const svg = wrapper.find('svg');
    expect(svg.attributes()).toMatchObject({
      width: '14',
      height: '14',
      viewBox: '0 0 24 24',
      stroke: 'currentColor',
      class: 'zcode-x',
      'aria-hidden': 'true'
    });
    expect(svg.element.childElementCount).toBeGreaterThan(0);
  });

  it('size を省くと 24px', () => {
    const wrapper = mount({ render: () => h(uiIcons.X) });
    expect(wrapper.find('svg').attributes('width')).toBe('24');
  });
});
