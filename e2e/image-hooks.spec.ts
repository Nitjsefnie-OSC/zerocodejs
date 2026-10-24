import { test, expect } from '@playwright/test';

const EDITOR_ID = 'test-cms';

test.describe('画像の連携（hooks）', () => {
  test('uploadImage のアップロード中はボタンを止め、返した URL を画像に入れる', async ({
    page
  }) => {
    await page.goto('/test-dev.html');
    const editor = page.locator(`#${EDITOR_ID}`);
    // デモはサンプルデータを入れるときに作り直すため、入ってから操作する
    await expect(editor.locator('[data-zcode-id][data-zcode-path="page.0"]')).toBeVisible();
    await editor.getByRole('button', { name: '画像管理' }).click();

    await page.evaluate((id) => {
      const element = document.getElementById(id) as HTMLElement & { hooks?: unknown };
      let finish: (value: { url: string; id: string }) => void = () => {};
      (window as unknown as { finishUpload: () => void }).finishUpload = () =>
        finish({ url: '/images/sample-1.jpg', id: 'uploaded' });
      element.hooks = {
        uploadImage: () => new Promise((resolve) => (finish = resolve))
      };
    }, EDITOR_ID);

    await editor
      .locator('.zcode-images-add-wrapper input[type="file"]')
      .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('x') });
    await expect(editor.getByText('アップロード中…')).toBeVisible();
    await expect(editor.getByRole('button', { name: '画像追加' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );

    await page.evaluate(() => (window as unknown as { finishUpload: () => void }).finishUpload());
    await expect(editor.getByText('アップロード中…')).toBeHidden();

    const image = await page.evaluate((id) => {
      const element = document.getElementById(id) as HTMLElement & {
        getData: () => { images: { common: Array<Record<string, unknown>> } };
      };
      return element.getData().images.common.at(-1);
    }, EDITOR_ID);
    expect(image).toMatchObject({ id: 'uploaded', name: 'photo.png', url: '/images/sample-1.jpg' });
    expect(image).not.toHaveProperty('needsUpload');
  });

  test('listImages を渡すと「メディアから選ぶ」から画像を登録できる', async ({ page }) => {
    await page.goto('/test-dev.html');
    const editor = page.locator(`#${EDITOR_ID}`);
    // デモはサンプルデータを入れるときに作り直すため、入ってから操作する
    await expect(editor.locator('[data-zcode-id][data-zcode-path="page.0"]')).toBeVisible();
    await editor.getByRole('button', { name: '画像管理' }).click();

    await editor.getByRole('button', { name: 'メディアから選ぶ' }).click();
    const picker = editor.locator('.zcode-media-picker');
    await picker.getByRole('button', { name: /sample-1\.jpg/ }).click();
    await expect(picker).toBeHidden();

    const ids = await page.evaluate((id) => {
      const element = document.getElementById(id) as HTMLElement & {
        getData: () => { images: { common: Array<{ id: string }> } };
      };
      return element.getData().images.common.map((image) => image.id);
    }, EDITOR_ID);
    expect(ids).toContain('media-sample-1');
  });
});
