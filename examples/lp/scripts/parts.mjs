// パーツのフォルダ（parts/）を、サーバーが読む JSON（data/built/）にまとめる。
// 実際のプロダクトでは `npx zerocodejs build-parts` を使う。このデモはリポジトリの中にあるため、
// ビルド済みの dist/cli.mjs を直接呼ぶ（先にリポジトリのルートで `npm run build`）。
//
//   node scripts/parts.mjs           まとめる
//   node scripts/parts.mjs --watch   保存のたびにまとめ直す
//   node scripts/parts.mjs --check   検査だけする
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(root, '../..');
const PARTS_DIR = join(root, 'parts');
const BUILT_DIR = join(root, 'data/built');

/** parts/site → data/built/site.json、parts/pages/<名前> → data/built/pages/<名前>.json */
export function partsTargets() {
  const targets = [{ dir: join(PARTS_DIR, 'site'), out: join(BUILT_DIR, 'site.json') }];
  const pagesDir = join(PARTS_DIR, 'pages');
  if (existsSync(pagesDir)) {
    for (const entry of readdirSync(pagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      targets.push({
        dir: join(pagesDir, entry.name),
        out: join(BUILT_DIR, 'pages', `${entry.name}.json`)
      });
    }
  }
  return targets.filter((target) => existsSync(target.dir));
}

export async function runParts({ watch = false, check = false } = {}) {
  const cli = join(repoRoot, 'dist/cli.mjs');
  if (!existsSync(cli)) {
    throw new Error(
      'dist/cli.mjs がありません。リポジトリのルートで npm run build を実行してください'
    );
  }
  const { main } = await import(pathToFileURL(cli).href);
  const io = {
    out: (text) => process.stdout.write(`${text}\n`),
    err: (text) => process.stderr.write(`${text}\n`),
    editorSupportDir: join(repoRoot, 'editor-support/vscode')
  };

  let ok = true;
  for (const { dir, out } of partsTargets()) {
    mkdirSync(dirname(out), { recursive: true });
    const argv = check
      ? ['check-parts', dir]
      : ['build-parts', dir, '-o', out, ...(watch ? ['--watch'] : [])];
    if (main(argv, io) !== 0) ok = false;
  }
  return ok;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  runParts({ watch: args.includes('--watch'), check: args.includes('--check') })
    .then((ok) => {
      if (!ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
