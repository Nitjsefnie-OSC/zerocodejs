import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, reactive, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import type { ImageUploadSettings, ZeroCodeData, ZeroCodeHooks } from '../../../types';
import { provideZeroCodeHost } from '../../../core/composables/useZeroCodeHost';
import { zcodeElementHooksKey } from '../../../core/injectionKeys';
import { ImageFileRejected, ImageUploadFailed, useImagesManager } from './useImagesManager';

function createData(): ZeroCodeData {
  return reactive({
    page: [],
    css: {},
    parts: { common: [], individual: [], special: [] },
    images: {
      common: [{ id: 'logo', name: 'logo', url: '/logo.png' }],
      individual: [],
      special: []
    }
  }) as ZeroCodeData;
}

function setup(options: {
  hooks?: ZeroCodeHooks;
  elementHooks?: ZeroCodeHooks;
  images?: ImageUploadSettings;
  pageId?: string;
}) {
  const data = createData();
  let manager!: ReturnType<typeof useImagesManager>;
  const Child = defineComponent({
    setup() {
      manager = useImagesManager(data, { pageId: options.pageId });
      return () => null;
    }
  });
  const Root = defineComponent({
    setup() {
      provideZeroCodeHost({ source: 'studio', hooks: () => options.hooks, images: options.images });
      return () => h(Child);
    }
  });
  const elementHooks = shallowRef(options.elementHooks);
  mount(Root, { global: { provide: { [zcodeElementHooksKey as symbol]: elementHooks } } });
  return { data, manager, elementHooks };
}

const png = (name = 'photo.png') => new File(['x'], name, { type: 'image/png' });

describe('useImagesManager と hooks', () => {
  it('uploadImage がなければ base64 にして needsUpload を付ける', async () => {
    const { data, manager } = setup({});
    manager.activeCategory.value = 'individual';
    const image = await manager.addImage(png());
    expect(image.url.startsWith('data:image/png;base64,')).toBe(true);
    expect(image.needsUpload).toBe(true);
    expect(data.images.individual).toHaveLength(1);
  });

  it('uploadImage があれば、追加した時点でアップロードした URL を入れる', async () => {
    const uploadImage = vi.fn(async () => ({ url: 'https://cdn.example.com/a.png', id: 'logo' }));
    const { data, manager } = setup({ hooks: { uploadImage }, pageId: 'article-1' });
    manager.activeCategory.value = 'special';

    const pending = manager.addImage(png());
    expect(manager.uploading.value).toBe(true);
    const image = await pending;

    expect(manager.uploading.value).toBe(false);
    expect(uploadImage).toHaveBeenCalledWith(expect.any(File), {
      category: 'special',
      pageId: 'article-1',
      source: 'studio'
    });
    expect(image).toEqual({
      id: 'logo-2',
      name: 'photo.png',
      url: 'https://cdn.example.com/a.png',
      mimeType: 'image/png',
      scope: 'page',
      pageId: 'article-1'
    });
    expect(data.images.special).toEqual([image]);
  });

  it('Web Component のプロパティで後から渡した hooks も使う', async () => {
    const { manager, elementHooks } = setup({});
    elementHooks.value = { uploadImage: async () => ({ url: '/uploaded.png' }) };
    const image = await manager.addImage(png());
    expect(image.url).toBe('/uploaded.png');
    expect(image.needsUpload).toBeUndefined();
  });

  it('アップロードに失敗したら画像を追加しない', async () => {
    const { data, manager } = setup({
      hooks: {
        uploadImage: async () => {
          throw new Error('network');
        }
      }
    });
    await expect(manager.addImage(png())).rejects.toBeInstanceOf(ImageUploadFailed);
    expect(manager.uploading.value).toBe(false);
    expect(data.images.common).toHaveLength(1);
  });

  it('種類・サイズの条件に合わないファイルはアップロードしない', async () => {
    const uploadImage = vi.fn(async () => ({ url: '/x.png' }));
    const { manager } = setup({ hooks: { uploadImage }, images: { maxSize: 0.5 } });
    await expect(manager.addImage(png())).rejects.toBeInstanceOf(ImageFileRejected);
    await expect(
      manager.addImage(new File(['x'], 'a.txt', { type: 'text/plain' }))
    ).rejects.toBeInstanceOf(ImageFileRejected);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('差し替えは ID を変えずに URL を入れ替え、needsUpload を外す', async () => {
    const uploadImage = vi.fn(async () => ({ url: '/new.png' }));
    const { manager } = setup({ hooks: { uploadImage } });
    manager.startEditing({ id: 'old', name: 'old', url: 'data:...', needsUpload: true });
    await manager.replaceEditingImageFile(png());
    expect((uploadImage.mock.calls[0] as unknown[])[1]).toMatchObject({ replacingId: 'old' });
    expect(manager.editingImage.value).toEqual({
      id: 'old',
      name: 'old',
      url: '/new.png',
      mimeType: 'image/png'
    });
  });

  it('メディアの画像は URL の参照として登録し、同じ URL は重ねて登録しない', async () => {
    const { data, manager } = setup({
      hooks: { listImages: async () => [{ id: 'm1', url: '/m1.png', name: 'M1' }] }
    });
    expect(manager.canListMedia.value).toBe(true);
    const [media] = await manager.listMediaImages();
    const first = manager.addMediaImage(media);
    const second = manager.addMediaImage(media);
    expect(second.id).toBe(first.id);
    expect(data.images.common.map((image) => image.id)).toEqual(['logo', 'm1']);
  });
});
