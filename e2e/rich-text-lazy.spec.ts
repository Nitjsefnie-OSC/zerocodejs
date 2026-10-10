import { test, expect } from '@playwright/test';

test('リッチテキストエディタ（遅延ロード）が編集パネルに表示される', async ({ page }) => {
  await page.goto('/test-cms.html');
  const cms = page.locator('#test-cms');
  const richTextPart = cms.locator('[data-zcode-id][data-zcode-path="page.1.slots.contents.0"]');
  await richTextPart.waitFor();

  await cms.locator('.zcode-mode-edit').click();
  await richTextPart.click();
  await expect(cms.locator('.zcode-edit-panel')).toBeVisible();

  await expect(
    cms.locator('.zcode-rich-text-editor-wrapper .zcode-rich-text-editor-content').first()
  ).toBeVisible({
    timeout: 10_000
  });
});
