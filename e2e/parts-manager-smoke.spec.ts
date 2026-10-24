import { test, expect } from '@playwright/test';

test.describe('zcode-editor パーツ管理スモークテスト', () => {
  test('パーツ管理タブ→一覧→編集モーダルの開閉ができる', async ({ page }) => {
    await page.goto('/test-dev.html');

    const editor = page.locator('#test-cms');
    await expect(editor.locator('[data-zcode-id][data-zcode-path="page.0"]')).toBeVisible();

    await editor.locator('.zcode-dev-tab', { hasText: 'パーツ管理' }).click();

    const partItems = editor.locator('.zcode-part-item');
    await expect(partItems.first()).toBeVisible();
    expect(await partItems.count()).toBeGreaterThanOrEqual(2);

    await partItems.first().click();
    const modal = editor.locator('.zcode-part-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.zcode-part-editor-header')).toBeVisible();

    await modal.locator('.zcode-close-btn').first().click();
    await expect(modal).toBeHidden();

    await expect(partItems.first()).toBeVisible();
  });

  test('テンプレートをテキストエリアで編集でき、プレビューと画像 ID の挿入に反映される', async ({
    page
  }) => {
    await page.goto('/test-dev.html');
    const editor = page.locator('#test-cms');
    await editor.locator('[data-zcode-id][data-zcode-path="page.0"]').waitFor();

    await editor.locator('.zcode-dev-tab', { hasText: 'パーツ管理' }).click();
    await editor.locator('.zcode-part-item').first().click();

    const modal = editor.locator('.zcode-part-modal');
    const code = modal.locator('.zcode-code-textarea');
    await expect(code).toHaveValue(/\{\$/);

    await code.fill('<p class="e2e-part">{$label:テキストエリアから編集}</p>');
    await expect(modal.locator('.zcode-part-editor-preview-tab')).toContainText(
      'テキストエリアから編集'
    );

    await code.focus();
    await code.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 0));
    await modal.locator('.zcode-part-editor-side-tab', { hasText: '画像ID参照' }).click();
    const firstImage = modal.locator('.zcode-image-id-item').first();
    const imageId = (await firstImage.locator('.zcode-image-id-code').textContent())?.trim() ?? '';
    expect(imageId).not.toBe('');
    await firstImage.locator('.zcode-btn-small', { hasText: '挿入' }).click();
    await expect(code).toHaveValue(new RegExp(`^${imageId}<p class="e2e-part">`));
  });

  test('Esc キーでモーダルが閉じ、重なったモーダルは最前面から閉じる', async ({ page }) => {
    await page.goto('/test-dev.html');
    const editor = page.locator('#test-cms');
    await editor.locator('[data-zcode-id][data-zcode-path="page.0"]').waitFor();

    await editor.locator('.zcode-dev-tab', { hasText: 'パーツ管理' }).click();
    await editor.locator('.zcode-part-item').first().click();

    const modal = editor.locator('.zcode-part-modal');
    await expect(modal).toBeVisible();

    // モーダル内の記法ヘルプボタンから2枚目のモーダルを開く
    await modal.locator('.zcode-help-btn').click();
    const helpModal = editor.locator('.zcode-help-modal');
    await expect(helpModal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(helpModal).toBeHidden();
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('カテゴリ情報モーダルが開閉できる', async ({ page }) => {
    await page.goto('/test-dev.html');
    const editor = page.locator('#test-cms');
    await editor.locator('[data-zcode-id][data-zcode-path="page.0"]').waitFor();

    await editor.locator('.zcode-dev-tab', { hasText: 'パーツ管理' }).click();
    await editor.locator('.zcode-help-btn').first().click();

    const infoModal = editor.locator('.zcode-help-modal');
    await expect(infoModal).toBeVisible();
    await expect(infoModal).toContainText('共通');

    await infoModal.locator('.zcode-close-btn').click();
    await expect(infoModal).toBeHidden();
  });
});
