import { test, expect } from '@playwright/test';

test('画像管理の画像はキーボードで編集を開け、中のボタンも Enter で押せる', async ({ page }) => {
  await page.goto('/test-dev.html');
  const editor = page.locator('#test-cms');
  // デモはサンプルデータを入れるときに作り直すため、入ってから操作する
  await expect(editor.locator('[data-zcode-id][data-zcode-path="page.0"]')).toBeVisible();
  await editor.getByRole('button', { name: '画像管理' }).click();

  const firstTile = editor.locator('.zcode-images-grid .zcode-image-item').first();
  await firstTile.focus();
  await page.keyboard.press('Enter');
  await expect(editor.getByRole('heading', { name: '画像編集' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor.getByRole('heading', { name: '画像編集' })).toBeHidden();

  const deleteButton = firstTile.getByRole('button', { name: '削除' });
  await deleteButton.focus();
  await expect(firstTile.locator('.zcode-image-item-actions')).toHaveCSS('opacity', '1');
  let confirmMessage = '';
  page.once('dialog', async (dialog) => {
    confirmMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.keyboard.press('Enter');
  await expect.poll(() => confirmMessage).toContain('削除しますか');
  await expect(editor.getByRole('heading', { name: '画像編集' })).toBeHidden();
});
