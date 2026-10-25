import { existsSync, mkdirSync, readdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { checkParts } from './check';
import { CATEGORIES, readPartsDir, writePartsDir, type Category, type Issue } from './parts-dir';
import { initVscode } from './vscode';

const USAGE = `使い方:
  zerocodejs build-parts <dir> [-o <file>] [--category common,individual,special] [--watch]
      パーツのフォルダを1つの JSON（{ parts, css }）にまとめる。-o を省くと標準出力に出す
  zerocodejs check-parts <dir> [--category ...]
      パーツのフォルダを検査する（ID の重複、スロット、記法の書き間違いなど）
  zerocodejs split-parts <data.json> -o <dir> [--category ...] [--force]
      既存のデータ（ZeroCodeData か { parts, css }）をパーツのフォルダに書き出す
  zerocodejs init-vscode [<projectDir>]
      .vscode/ に、テンプレート記法の補完とスニペットの設定を置く`;

export interface CliIo {
  out: (text: string) => void;
  err: (text: string) => void;
  /** editor-support/vscode/ の場所（パッケージの中） */
  editorSupportDir: string;
}

interface Args {
  positional: string[];
  output?: string;
  categories?: Category[];
  watch: boolean;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { positional: [], watch: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-o' || arg === '--output') args.output = argv[++i];
    else if (arg === '--watch' || arg === '-w') args.watch = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--category' || arg.startsWith('--category=')) {
      const value = arg.includes('=') ? arg.split('=')[1] : argv[++i];
      const categories = (value ?? '').split(',').map((name) => name.trim());
      const invalid = categories.filter((name) => !CATEGORIES.includes(name as Category));
      if (invalid.length) throw new Error(`知らないカテゴリです: ${invalid.join(', ')}`);
      args.categories = categories as Category[];
    } else if (arg.startsWith('-')) throw new Error(`知らないオプションです: ${arg}`);
    else args.positional.push(arg);
  }
  return args;
}

function formatIssue(issue: Issue): string {
  const where = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  return `${issue.level === 'error' ? 'エラー' : '警告'} ${where}  ${issue.message}`;
}

function report(issues: Issue[], io: CliIo): boolean {
  for (const issue of issues) io.err(formatIssue(issue));
  const errors = issues.filter((issue) => issue.level === 'error').length;
  if (issues.length) io.err(`エラー ${errors}件、警告 ${issues.length - errors}件`);
  return errors === 0;
}

function buildOnce(dir: string, args: Args, io: CliIo): boolean {
  const build = readPartsDir(dir, args.categories);
  const issues = [...build.issues, ...checkParts(build)];
  if (!report(issues, io)) return false;
  const json = `${JSON.stringify({ parts: build.parts, css: build.css }, null, 2)}\n`;
  if (args.output) {
    mkdirSync(dirname(resolve(args.output)), { recursive: true });
    writeFileSync(args.output, json);
    io.err(`${args.output} に書き出しました（パーツ ${build.sources.length}個）`);
  } else {
    io.out(json);
  }
  return true;
}

function requireDir(path: string | undefined): string {
  if (!path) throw new Error('パーツのフォルダを指定してください');
  const dir = resolve(path);
  if (!existsSync(dir)) throw new Error(`フォルダがありません: ${path}`);
  return dir;
}

/** @returns 終了コード */
export function main(argv: string[], io: CliIo): number {
  const [command, ...rest] = argv;
  try {
    const args = parseArgs(rest);
    switch (command) {
      case 'build-parts': {
        const dir = requireDir(args.positional[0]);
        const ok = buildOnce(dir, args, io);
        if (!args.watch) return ok ? 0 : 1;
        if (!args.output) throw new Error('--watch では -o で書き出し先を指定してください');
        let timer: ReturnType<typeof setTimeout> | undefined;
        watch(dir, { recursive: true }, () => {
          clearTimeout(timer);
          timer = setTimeout(() => buildOnce(dir, args, io), 100);
        });
        io.err(`${args.positional[0]} を監視しています（Ctrl+C で終了）`);
        return 0;
      }
      case 'check-parts': {
        const build = readPartsDir(requireDir(args.positional[0]), args.categories);
        const ok = report([...build.issues, ...checkParts(build)], io);
        if (ok) io.err(`問題ありません（パーツ ${build.sources.length}個）`);
        return ok ? 0 : 1;
      }
      case 'split-parts': {
        const input = args.positional[0];
        if (!input || !args.output)
          throw new Error('split-parts <data.json> -o <dir> の形で指定してください');
        const outDir = resolve(args.output);
        if (existsSync(outDir) && readdirSync(outDir).length && !args.force) {
          throw new Error(`${args.output} は空ではありません（上書きする場合は --force）`);
        }
        const data = JSON.parse(readFileSync(input, 'utf8'));
        const written = writePartsDir(data, outDir, args.categories);
        io.err(`${args.output} に ${written.length}個のファイルを書き出しました`);
        return 0;
      }
      case 'init-vscode': {
        const result = initVscode(resolve(args.positional[0] ?? '.'), io.editorSupportDir);
        io.err(`${result.snippets} を置きました`);
        if (result.manualSetting) {
          io.err(
            `${result.settings} を読めなかったため（コメント付きなど）、次の1行を手で追加してください:\n  ${result.manualSetting}`
          );
        } else {
          io.err(`${result.settings} に html.customData を追加しました`);
        }
        return 0;
      }
      case undefined:
      case '-h':
      case '--help':
      case 'help':
        io.out(USAGE);
        return 0;
      default:
        throw new Error(`知らないコマンドです: ${command}`);
    }
  } catch (error) {
    io.err(`${(error as Error).message}\n\n${USAGE}`);
    return 1;
  }
}
