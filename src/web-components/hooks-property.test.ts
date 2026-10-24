import { describe, it, expect } from 'vitest';
import { createHooksProperty } from './hooks-property';

describe('createHooksProperty', () => {
  it('定義より先に代入された hooks を取り出して入れ物に移す', () => {
    const uploadImage = async () => ({ url: '/a.png' });
    const element = Object.assign(document.createElement('div'), { hooks: { uploadImage } });
    const property = createHooksProperty(element);
    expect(property.hooks.value).toEqual({ uploadImage });
    expect(Object.prototype.hasOwnProperty.call(element, 'hooks')).toBe(false);
  });
});
