// Monaco は実行時に CDN から読み込むため devDependencies に置いているが、
// CDN から読み込む版は npm の monaco-editor と一致させている（src/features/parts-manager/monaco-cdn.ts）。
// `npm audit --omit=dev` では対象外になるため、monaco-editor とその配下の既知脆弱性をここで検査する。
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FAILING_SEVERITIES = new Set(['moderate', 'high', 'critical']);

// 修正版の Monaco がまだなく、Monaco の使い方では成立しないと確認した脆弱性。
// Monaco の版ごとに記録するため、monaco-editor を更新すると無効になり、改めて判断することになる。
// Monaco は DOMPurify を自前のビルドに同梱しているため、npm の overrides では実行時のコードは変わらない。
const ACCEPTED_ADVISORIES = {
  '0.57.0': {
    // 以下はすべて IN_PLACE / SAFE_FOR_TEMPLATES / PARSER_MEDIA_TYPE を使う場合のみ成立する。
    // Monaco（esm/vs/base/browser/domSanitize.js）はいずれも使わない（2026年10月24日確認）
    'GHSA-p98j-92pf-mc4p': 'IN_PLACE モードのフックによるノード削除',
    'GHSA-6688-9rhm-gjv2': 'IN_PLACE モードの rawtext ルート',
    'GHSA-cg2g-xh64-v4q7': 'SAFE_FOR_TEMPLATES と DOM 出力の組み合わせ',
    'GHSA-mrv2-3pqr-j5jr': 'IN_PLACE モードのフックによる親・兄弟の削除',
    'GHSA-c6gr-qvv4-5v3f': 'PARSER_MEDIA_TYPE が application/xhtml+xml の場合'
  }
};

const monacoVersion = JSON.parse(
  readFileSync(new URL('../node_modules/monaco-editor/package.json', import.meta.url), 'utf8')
).version;
const accepted = ACCEPTED_ADVISORIES[monacoVersion] ?? {};

const advisoryId = (via) => (typeof via === 'object' ? via.url?.split('/').pop() : null);
/** 例外にした脆弱性以外が含まれるか（パッケージ名だけの via は依存先の結果に従う） */
const hasUnacceptedAdvisory = (vulnerability) =>
  vulnerability.via.some((via) => typeof via === 'object' && !accepted[advisoryId(via)]);

let output;
try {
  output = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8' });
} catch (error) {
  // npm audit は脆弱性があると終了コード 1 を返すが、JSON は stdout に出力される
  output = error.stdout;
}

const { vulnerabilities = {} } = JSON.parse(output);
const findings = Object.values(vulnerabilities).filter(
  (vulnerability) =>
    FAILING_SEVERITIES.has(vulnerability.severity) &&
    vulnerability.nodes.some((node) => node.startsWith('node_modules/monaco-editor')) &&
    hasUnacceptedAdvisory(vulnerability)
);

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.name} (${finding.severity}): ${finding.nodes.join(', ')}`);
  }
  console.error(
    'monaco-editor に既知の脆弱性があります。monaco-editor と MONACO_VERSION を更新してください。'
  );
  process.exit(1);
}

const acceptedIds = Object.keys(accepted);
const acceptedNote = acceptedIds.length
  ? ` (accepted for ${monacoVersion}: ${acceptedIds.join(', ')})`
  : '';
console.log(`monaco-editor: no known moderate or higher vulnerabilities${acceptedNote}`);
