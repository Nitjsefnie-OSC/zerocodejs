const express = require('express');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const SEED_PATH = path.join(DATA_DIR, 'default-store.json');
const COMMON_PATH = path.join(DATA_DIR, 'common.json');
const PAGES_DIR = path.join(DATA_DIR, 'pages');
const PUBLIC_DIR = path.join(__dirname, 'public');
const BUILT_DIR = path.join(DATA_DIR, 'built');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const UPLOAD_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif'
};
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const DIST_DIR = path.join(__dirname, '../../dist');

const ALLOWED_TARGETS = [
  'page',
  'parts-common',
  'parts-individual',
  'parts-special',
  'parts-common-css',
  'parts-individual-css',
  'parts-special-css',
  'images-common',
  'images-individual',
  'images-special'
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function readSeedStore() {
  const seed = readJson(SEED_PATH);
  if (seed) return seed;
  return {
    page: [],
    css: {},
    parts: { common: [], individual: [], special: [] },
    images: { common: [], individual: [], special: [] }
  };
}

function extractCommonFromStore(store) {
  const cssCommon = store?.css?.common ?? '';
  const partsCommon = [
    ...(store?.parts?.common ?? []),
    ...(store?.parts?.individual ?? []),
    ...(store?.parts?.special ?? [])
  ];
  const imagesCommon = [
    ...(store?.images?.common ?? []),
    ...(store?.images?.individual ?? []),
    ...(store?.images?.special ?? [])
  ];
  return {
    css: { common: cssCommon },
    parts: { common: partsCommon },
    images: { common: imagesCommon }
  };
}

function loadOrInitCommon() {
  const existing = readJson(COMMON_PATH);
  if (existing) return existing;
  const seed = readSeedStore();
  const common = extractCommonFromStore(seed);
  writeJson(COMMON_PATH, common);
  return common;
}

function normalizePageName(pageName) {
  const name = pageName && typeof pageName === 'string' ? pageName : 'default';
  return name === '' ? 'default' : name;
}

function getPagePath(pageName) {
  const name = normalizePageName(pageName);
  return path.join(PAGES_DIR, name, 'page.json');
}

function pageExists(pageName) {
  return fs.existsSync(getPagePath(pageName));
}

const EMPTY_PAGE = {
  page: [],
  css: { individual: '', special: '' },
  parts: { individual: [], special: [] },
  images: { individual: [], special: [] }
};

function initEmptyPageFile(pageName) {
  const filePath = getPagePath(normalizePageName(pageName));
  writeJson(filePath, { ...EMPTY_PAGE });
  return { ...EMPTY_PAGE };
}

function loadOrInitPage(pageName) {
  const name = normalizePageName(pageName);
  const pagePath = getPagePath(name);
  const existing = readJson(pagePath);
  if (existing) return existing;

  const seed = readSeedStore();

  if (name === 'default') {
    const def = {
      page: seed.page || [],
      css: { individual: seed?.css?.individual ?? '', special: seed?.css?.special ?? '' },
      parts: { individual: [], special: [] },
      images: { individual: [], special: [] }
    };
    writeJson(pagePath, def);
    return def;
  }

  writeJson(pagePath, { ...EMPTY_PAGE });
  return readJson(pagePath);
}

const PREFERRED_PAGE_ORDER = ['default', 'campaign', 'feature'];

function listPageNames() {
  const names = [];
  if (!fs.existsSync(PAGES_DIR)) return PREFERRED_PAGE_ORDER.filter((n) => n === 'default');
  try {
    const entries = fs.readdirSync(PAGES_DIR, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => fs.existsSync(path.join(PAGES_DIR, name, 'page.json')));
    for (const name of PREFERRED_PAGE_ORDER) {
      if (dirs.includes(name)) names.push(name);
    }
    dirs
      .filter((n) => !PREFERRED_PAGE_ORDER.includes(n))
      .sort()
      .forEach((name) => names.push(name));
  } catch (_) {
    /* ignore */
  }
  if (!names.includes('default')) names.unshift('default');
  return names;
}

/**
 * parts/ のファイルからまとめたパーツ（scripts/parts.mjs が書き出す）。
 * あるカテゴリは、管理画面で保存したパーツより優先する（パーツの正本はファイル）
 */
function readBuiltParts(pageName) {
  return {
    site: readJson(path.join(BUILT_DIR, 'site.json')),
    page: readJson(path.join(BUILT_DIR, 'pages', `${normalizePageName(pageName)}.json`))
  };
}

function buildMergedData(pageName) {
  const common = loadOrInitCommon();
  const page = loadOrInitPage(pageName);
  const built = readBuiltParts(pageName);

  return {
    page: page.page || [],
    css: {
      common: built.site?.css?.common ?? common?.css?.common ?? '',
      individual: built.page?.css?.individual ?? page?.css?.individual ?? '',
      special: page?.css?.special ?? ''
    },
    parts: {
      common: built.site?.parts?.common ?? common?.parts?.common ?? [],
      individual: built.page?.parts?.individual ?? page?.parts?.individual ?? [],
      special: page?.parts?.special ?? []
    },
    images: {
      common: common?.images?.common ?? [],
      individual: page?.images?.individual ?? [],
      special: page?.images?.special ?? []
    }
  };
}

function targetToKeys(target) {
  const map = {
    page: ['page'],
    'parts-common': ['parts', 'common'],
    'parts-individual': ['parts', 'individual'],
    'parts-special': ['parts', 'special'],
    'parts-common-css': ['css', 'common'],
    'parts-individual-css': ['css', 'individual'],
    'parts-special-css': ['css', 'special'],
    'images-common': ['images', 'common'],
    'images-individual': ['images', 'individual'],
    'images-special': ['images', 'special']
  };
  return map[target] || null;
}

ensureDir(DATA_DIR);
ensureDir(PAGES_DIR);
loadOrInitCommon();
loadOrInitPage('default');

const EDIT_USER = process.env.EDIT_USER;
const EDIT_PASSWORD = process.env.EDIT_PASSWORD;
const EDIT_AUTH_ENABLED = Boolean(EDIT_USER && EDIT_PASSWORD);

function basicAuthEdit(req, res, next) {
  if (!EDIT_AUTH_ENABLED) return next();
  const needAuth =
    req.path === '/edit.html' ||
    req.path === '/edit' ||
    req.path.startsWith('/edit/') ||
    req.path === '/api/pages' ||
    req.path === '/api/data' ||
    req.path === '/api/save' ||
    req.path === '/api/reset' ||
    req.path === '/api/upload' ||
    req.path === '/api/media' ||
    req.path === '/api/parts-events';
  if (!needAuth) return next();
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Edit"');
    return res.status(401).send('Authentication required');
  }
  const buf = Buffer.from(auth.slice(6), 'base64');
  const [user, pass] = buf.toString('utf8').split(':', 2);
  if (user !== EDIT_USER || pass !== EDIT_PASSWORD) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Edit"');
    return res.status(401).send('Invalid credentials');
  }
  next();
}

app.use(express.json({ limit: '10mb' }));
app.use(basicAuthEdit);

app.get('/api/pages', (_req, res) => {
  try {
    res.json(listPageNames());
  } catch (err) {
    console.error('[api/pages] Error:', err);
    res.status(500).json({ ok: false, error: 'Failed to list pages' });
  }
});

app.get('/api/data', (req, res) => {
  try {
    const page = normalizePageName(req.query.page);
    if (!pageExists(page) && page !== 'default') {
      return res.status(404).json({ ok: false, error: `Page not found: ${page}` });
    }
    res.json(buildMergedData(page));
  } catch (err) {
    console.error('[api/data] Error:', err);
    res.status(500).json({ ok: false, error: 'Failed to read data' });
  }
});

app.post('/api/save', (req, res) => {
  const { target, data, page: pageName } = req.body;
  const page = normalizePageName(pageName);

  if (!target || !ALLOWED_TARGETS.includes(target)) {
    return res.status(400).json({ ok: false, error: `Invalid target: ${target}` });
  }

  if (data === undefined || data === null) {
    return res.status(400).json({ ok: false, error: 'Missing data' });
  }

  const keys = targetToKeys(target);
  if (!keys) {
    return res.status(400).json({ ok: false, error: `Unknown target: ${target}` });
  }

  if (target === 'page' && !Array.isArray(data)) {
    return res.status(400).json({ ok: false, error: 'page data must be an array' });
  }

  if (target.endsWith('-css') && typeof data !== 'string') {
    return res.status(400).json({ ok: false, error: 'CSS data must be a string' });
  }

  const built = readBuiltParts(page);
  const fileManaged =
    (built.site && (target === 'parts-common' || target === 'parts-common-css')) ||
    (built.page && (target === 'parts-individual' || target === 'parts-individual-css'));
  if (fileManaged) {
    return res.status(409).json({
      ok: false,
      errors: [
        {
          message:
            'このカテゴリのパーツは parts/ のファイルで管理しています。ファイルを編集してください'
        }
      ]
    });
  }

  try {
    if (!pageExists(page) && page !== 'default') {
      initEmptyPageFile(page);
    }

    const isCommonTarget =
      target === 'parts-common' || target === 'parts-common-css' || target === 'images-common';

    const filePath = isCommonTarget ? COMMON_PATH : getPagePath(page);
    const fileData =
      readJson(filePath) || (isCommonTarget ? loadOrInitCommon() : loadOrInitPage(page));

    let ref = fileData;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!ref[keys[i]] || typeof ref[keys[i]] !== 'object') ref[keys[i]] = {};
      ref = ref[keys[i]];
    }
    ref[keys[keys.length - 1]] = data;
    writeJson(filePath, fileData);
    console.log('[save]', target, 'page=', page, '->', path.relative(__dirname, filePath));
    res.json({ ok: true });
  } catch (err) {
    console.error('[save] Error:', err);
    res.status(500).json({ ok: false, error: 'Failed to save data' });
  }
});

app.post('/api/reset', (req, res) => {
  try {
    const page = normalizePageName((req.body && req.body.page) || 'default');
    const seed = readSeedStore();
    if (page === 'default') {
      const existing = readJson(getPagePath('default'));
      const def = {
        page: seed.page || [],
        css: { individual: seed?.css?.individual ?? '', special: seed?.css?.special ?? '' },
        parts: {
          individual: existing?.parts?.individual ?? [],
          special: existing?.parts?.special ?? []
        },
        images: {
          individual: existing?.images?.individual ?? [],
          special: existing?.images?.special ?? []
        }
      };
      writeJson(getPagePath('default'), def);
    } else {
      initEmptyPageFile(page);
    }
    console.log('[reset] page=', page);
    res.json({ ok: true });
  } catch (err) {
    console.error('[reset] Error:', err);
    res.status(500).json({ ok: false, error: 'Failed to reset data' });
  }
});

// 画像のアップロード（管理画面の hooks.uploadImage から呼ぶ）。本文はファイルそのもの
app.post(
  '/api/upload',
  express.raw({ type: Object.keys(UPLOAD_EXTENSIONS), limit: UPLOAD_MAX_BYTES }),
  (req, res) => {
    const ext = UPLOAD_EXTENSIONS[req.headers['content-type']];
    if (!ext || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: 'PNG / JPEG / GIF / WebP / AVIF の画像を送ってください' });
    }
    const original = decodeURIComponent(req.headers['x-file-name'] || 'image');
    const base =
      path
        .basename(original, path.extname(original))
        .replace(/[^\w-]+/g, '-')
        .slice(0, 40) || 'image';
    const fileName = `${Date.now()}-${base}${ext}`;
    try {
      ensureDir(UPLOADS_DIR);
      fs.writeFileSync(path.join(UPLOADS_DIR, fileName), req.body);
      console.log('[upload]', fileName);
      res.json({
        ok: true,
        id: `upload-${path.basename(fileName, ext)}`,
        name: original,
        url: `/uploads/${fileName}`
      });
    } catch (err) {
      console.error('[upload] Error:', err);
      res.status(500).json({ ok: false, error: 'Failed to save the image' });
    }
  }
);

// メディアの一覧（管理画面の hooks.listImages から呼ぶ）
app.get('/api/media', (_req, res) => {
  try {
    const files = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
    const images = files
      .filter((file) => Object.values(UPLOAD_EXTENSIONS).includes(path.extname(file).toLowerCase()))
      .sort()
      .reverse()
      .map((file) => ({
        id: `upload-${path.basename(file, path.extname(file))}`,
        name: file,
        url: `/uploads/${file}`
      }));
    res.json(images);
  } catch (err) {
    console.error('[media] Error:', err);
    res.status(500).json({ ok: false, error: 'Failed to list media' });
  }
});

const SHOW_DEV_UI = process.env.NODE_ENV !== 'production';

// 開発用: parts/ からまとめた JSON（data/built/）が変わったことを、開いている画面に知らせる（Server-Sent Events）
const partsEventClients = new Set();
let partsChangeTimer = null;
if (SHOW_DEV_UI) {
  ensureDir(BUILT_DIR);
  fs.watch(BUILT_DIR, { recursive: true }, () => {
    clearTimeout(partsChangeTimer);
    partsChangeTimer = setTimeout(() => {
      for (const client of partsEventClients) client.write('event: parts\ndata: changed\n\n');
    }, 150);
  });
}

app.get('/api/parts-events', (req, res) => {
  if (!SHOW_DEV_UI) return res.status(404).end();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.write(': connected\n\n');
  partsEventClients.add(res);
  req.on('close', () => partsEventClients.delete(res));
});

let renderToHtml = null;
let renderCssToHtml = null;

const ssrTemplate = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZeroCode.js</title>
  {{DEV_CSS_LINK}}
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/pages/{{PAGENAME}}.css" />
</head>
<body>
  {{DEV_HEADER}}
  <main id="lp-content" class="lp-content">
    <div id="cms-content" class="cms-content">{{STYLES}}{{CONTENT}}</div>
  </main>
  {{DEV_FOOTER}}
</body>
</html>`;

const devCssLink = '<link rel="stylesheet" href="/css/dev.css" />';
const devHeaderBlock = `<div class="dev-header dev-header--pub">
    <div class="dev-header__inner">
      <div class="dev-header__title">ZeroCode.js</div>
      <a href="{{EDIT_LINK}}" class="dev-header__link">編集画面へ</a>
    </div>
  </div>
  `;
const devLiveReload = `
  <script>new EventSource('/api/parts-events').addEventListener('parts', () => location.reload());</script>`;
const devFooterBlock = `
  <div class="dev-footer dev-footer--pub">
    <div class="dev-footer__inner">
      <a href="{{EDIT_LINK}}">管理画面で編集</a>
    </div>
  </div>`;

async function serveSSR(req, res, pageName) {
  try {
    const name = pageName !== undefined ? normalizePageName(pageName) : 'default';
    if (!pageExists(name) && name !== 'default') {
      return res
        .status(404)
        .send(
          '<!doctype html><html><body><p>ページが見つかりません。</p><a href="/">トップへ</a></body></html>'
        );
    }
    if (!renderToHtml) {
      // 本番のホストアプリでは npm の `import('zerocodejs/ssr')` を推奨（package exports）。
      // このリポジトリ内デモは workspace の dist を dynamic import する。
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM();
      const w = dom.window;
      global.window = w;
      global.document = w.document;
      global.DOMParser = w.DOMParser;
      global.Node = w.Node;
      global.Element = w.Element;
      global.DocumentFragment = w.DocumentFragment;
      global.HTMLElement = w.HTMLElement;
      global.NodeList = w.NodeList;
      global.HTMLTemplateElement = w.HTMLTemplateElement;
      const mod = await import(
        pathToFileURL(path.join(__dirname, '../../dist/zerocode-ssr.es.js')).href
      );
      renderToHtml = mod.renderToHtml;
      renderCssToHtml = mod.renderCssToHtml;
    }
    const store = buildMergedData(name);
    const content = renderToHtml(store, { enableEditorAttributes: false });
    const styles = renderCssToHtml(store.css);
    const editLink = name === 'default' ? '/edit' : '/edit/' + encodeURIComponent(name);
    const devCss = SHOW_DEV_UI ? devCssLink : '';
    const devHeader = SHOW_DEV_UI ? devHeaderBlock.replace(/\{\{EDIT_LINK\}\}/g, editLink) : '';
    const devFooter = SHOW_DEV_UI
      ? devFooterBlock.replace(/\{\{EDIT_LINK\}\}/g, editLink) + devLiveReload
      : '';
    const html = ssrTemplate
      .replace('{{PAGENAME}}', name)
      .replace('{{DEV_CSS_LINK}}', devCss)
      .replace('{{DEV_HEADER}}', devHeader)
      .replace('{{DEV_FOOTER}}', devFooter)
      .replace('{{STYLES}}', styles)
      .replace('{{CONTENT}}', content);
    res.type('html').send(html);
  } catch (err) {
    console.error('[SSR] Error:', err);
    res
      .status(500)
      .send(
        '<!doctype html><html><body><p>表示エラー: ' +
          (err.message || String(err)) +
          '</p></body></html>'
      );
  }
}

app.get('/', (req, res) => serveSSR(req, res));
app.get('/index.html', (req, res) => serveSSR(req, res));
app.get('/lp/:name/', (req, res) => serveSSR(req, res, req.params.name));
app.get('/lp/:name', (req, res) => {
  res.redirect(301, '/lp/' + req.params.name + '/');
});

app.get('/edit.html', (req, res) => {
  const page = req.query.page && req.query.page !== 'default' ? req.query.page : '';
  res.redirect(301, page ? '/edit/' + encodeURIComponent(page) : '/edit');
});
app.get('/edit', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'edit.html'));
});
app.get('/edit/:page', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'edit.html'));
});

app.use('/dist', express.static(DIST_DIR));
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`LP example running at http://localhost:${PORT}`);
});
