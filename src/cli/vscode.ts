import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const HTML_DATA_PATH =
  './node_modules/zerocodejs/editor-support/vscode/zerocode.html-data.json';

export interface InitVscodeResult {
  snippets: string;
  settings: string;
  /** settings.json を読めなかった（コメント付きなど）ため、手で追加してもらう場合 */
  manualSetting?: string;
}

/**
 * プロダクトのリポジトリの .vscode/ に、スニペットを置き、settings.json の html.customData に
 * zerocodejs の補完データを足す。
 */
export function initVscode(projectDir: string, editorSupportDir: string): InitVscodeResult {
  const vscodeDir = join(projectDir, '.vscode');
  mkdirSync(vscodeDir, { recursive: true });

  const snippets = join(vscodeDir, 'zerocode.code-snippets');
  copyFileSync(join(editorSupportDir, 'zerocode.code-snippets'), snippets);

  const settings = join(vscodeDir, 'settings.json');
  let current: Record<string, unknown> = {};
  if (existsSync(settings)) {
    try {
      current = JSON.parse(readFileSync(settings, 'utf8'));
    } catch {
      return {
        snippets,
        settings,
        manualSetting: `"html.customData": ["${HTML_DATA_PATH}"]`
      };
    }
  }
  const customData = Array.isArray(current['html.customData'])
    ? (current['html.customData'] as unknown[])
    : [];
  if (!customData.includes(HTML_DATA_PATH)) {
    current['html.customData'] = [...customData, HTML_DATA_PATH];
    writeFileSync(settings, `${JSON.stringify(current, null, 2)}\n`);
  }
  return { snippets, settings };
}
