import { test, expect, type Locator, type Page } from '@playwright/test';

// playwright.config.ts で chromium / webkit / firefox の3ブラウザで実行する
// （Shadow DOM 内の contenteditable はブラウザごとの差が大きいため）

const CMS_ID = 'test-cms';

async function openRichTextEditor(page: Page): Promise<{ editor: Locator; preview: Locator }> {
  await page.goto('/test-cms.html');
  const cms = page.locator(`#${CMS_ID}`);
  // リッチテキストのフィールドを持つテキストパーツ（親セクションをクリックすると、
  // ブラウザごとのレイアウト差で別の子パーツが選ばれるため直接クリックする）
  const preview = cms.locator('[data-zcode-id][data-zcode-path="page.1.slots.contents.0"]');
  await preview.waitFor();
  await cms.locator('.zcode-mode-edit').click();
  await preview.click();
  const editor = cms.locator('.zcode-rich-text-editor-content').first();
  await expect(editor).toBeVisible({ timeout: 10_000 });

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('hello world');
  return { editor, preview };
}

function toolbarButton(page: Page, label: string): Locator {
  return page.locator(`#${CMS_ID} .zcode-rich-text-toolbar button[aria-label="${label}"]`).first();
}

async function selectLastChars(page: Page, count: number) {
  for (let i = 0; i < count; i++) await page.keyboard.press('Shift+ArrowLeft');
}

test.describe('リッチテキストエディタ', () => {
  test('入力した内容がプレビューに反映される', async ({ page }) => {
    const { preview } = await openRichTextEditor(page);
    await expect(preview).toContainText('hello world');
  });

  test('選択した文字をツールバーで太字にし、元に戻せる', async ({ page }) => {
    const { preview } = await openRichTextEditor(page);
    await selectLastChars(page, 5);
    await toolbarButton(page, '太字').click();
    await expect(preview.locator('strong')).toHaveText('world');
    await expect(toolbarButton(page, '太字')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('ControlOrMeta+z');
    await expect(preview.locator('strong')).toHaveCount(0);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(preview.locator('strong')).toHaveText('world');
  });

  test('ショートカットで取り消し線にできる', async ({ page }) => {
    const { preview } = await openRichTextEditor(page);
    await selectLastChars(page, 5);
    await page.keyboard.press('ControlOrMeta+Shift+x');
    await expect(preview.locator('s')).toHaveText('world');
  });

  test('リストを作成・解除しても編集領域とホスト要素が壊れない', async ({ page }) => {
    const { editor, preview } = await openRichTextEditor(page);
    await page.keyboard.press('Enter');
    await page.keyboard.type('second');
    await page.keyboard.press('ControlOrMeta+a');
    await toolbarButton(page, '箇条書き').click();
    await expect(preview.locator('ul > li')).toHaveText(['hello world', 'second']);

    await toolbarButton(page, '番号付きリスト').click();
    await expect(preview.locator('ol > li')).toHaveCount(2);

    // WebKit で execCommand のリスト操作がホスト要素を複製していた不具合の回帰確認
    await expect(page.locator(`#${CMS_ID} .zcode-rich-text-editor-content`)).toHaveCount(1);
    await expect(editor.locator('zcode-cms, .zcode-rich-text-editor-content')).toHaveCount(0);

    await toolbarButton(page, '番号付きリスト').click();
    await expect(preview.locator('ol')).toHaveCount(0);
    await expect(preview).toContainText('second');
  });

  test('空のリスト項目で Enter を押すとリストを抜ける', async ({ page }) => {
    const { editor } = await openRichTextEditor(page);
    await toolbarButton(page, '箇条書き').click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('after');
    await expect(editor.locator('ul > li')).toHaveCount(1);
    await expect(editor.locator(':scope > p')).toHaveText('after');
  });

  test('リンクを設定・解除できる', async ({ page }) => {
    const { preview } = await openRichTextEditor(page);
    await selectLastChars(page, 5);
    await toolbarButton(page, 'リンク').click();
    const input = page.locator(`#${CMS_ID} .zcode-rich-text-link-input`);
    await input.fill('https://example.com/');
    await page.locator(`#${CMS_ID} .zcode-rich-text-link-newtab input`).check();
    await input.press('Enter');

    const link = preview.locator('a');
    await expect(link).toHaveText('world');
    await expect(link).toHaveAttribute('href', 'https://example.com/');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    await toolbarButton(page, 'リンク').click();
    await page.locator(`#${CMS_ID} .zcode-rich-text-link-btn`, { hasText: 'リンクを解除' }).click();
    await expect(preview.locator('a')).toHaveCount(0);
  });

  test('javascript: の URL はリンクにしない', async ({ page }) => {
    const { preview } = await openRichTextEditor(page);
    await selectLastChars(page, 5);
    await toolbarButton(page, 'リンク').click();
    const input = page.locator(`#${CMS_ID} .zcode-rich-text-link-input`);
    await input.fill('javascript:alert(1)');
    await input.press('Enter');
    await expect(
      page.locator(`#${CMS_ID} .zcode-rich-text-link-form [role="alert"]`)
    ).toBeVisible();
    await expect(preview.locator('a')).toHaveCount(0);
  });

  test('貼り付けた HTML は書式だけを残して無害化する', async ({ page, browserName }) => {
    // Firefox は合成した ClipboardEvent の clipboardData を渡さない
    test.skip(
      browserName === 'firefox',
      '合成した paste イベントのデータを Firefox は受け付けない'
    );
    const { editor, preview } = await openRichTextEditor(page);
    await editor.evaluate((el) => {
      const data = new DataTransfer();
      data.setData(
        'text/html',
        '<b style="color:red">pasted</b><img src="x" onerror="window.__pwned = true">'
      );
      el.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
      );
    });
    await expect(preview.locator('strong')).toHaveText('pasted');
    await expect(editor.locator('img, [style]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned)).toBe(
      undefined
    );
  });
});
