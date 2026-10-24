# ZeroCode.js

[![npm](https://img.shields.io/npm/v/zerocodejs)](https://www.npmjs.com/package/zerocodejs)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/atsumi-code/zerocodejs/actions/workflows/ci.yml/badge.svg)](https://github.com/atsumi-code/zerocodejs/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/website?down_message=offline&label=Demo&up_message=online&url=https%3A%2F%2Fatsumi-code.github.io%2Fzerocodejs%2F)](https://atsumi-code.github.io/zerocodejs/)

🇯🇵 [日本語ドキュメント](./README.ja.md)

**Simple editing UI. Framework-agnostic CMS frontend library.**

ZeroCode.js is an embeddable CMS library for existing web services. Authentication and persistence stay on the host; editing UI is provided via Web Components such as `<zcode-cms>`. Public HTML is generated from developer-defined part templates without CMS-specific wrapper markup. Editor-only `data-zcode-*` attributes are stripped on public render. [Learn more in the docs](./docs.html#about)

> **Status: Beta**
>
> ZeroCode.js is currently in beta. APIs, specifications, and data formats may change without notice (including breaking changes).
> Bug reports and feature requests: [Issues](https://github.com/atsumi-code/zerocodejs/issues). Questions and feedback: [Discussions](https://github.com/atsumi-code/zerocodejs/discussions).

## Features

- **Framework Agnostic** - Works with React, Vue, Svelte, Angular, or Vanilla JS via Web Components
- **Visual Editor** - Click to edit, drag to reorder, no coding required for content editing
- **Parts Management** - Create and manage reusable content blocks
- **Image Management** - Built-in image upload and management
- **Flexible Templates** - Custom HTML template syntax for dynamic content
- **Small Initial Load** - `zerocodejs/cms` is about 87 KB (brotli) on first load, with the rich text editor loaded lazily. Requires Vue 3.5+ as a peer dependency
- **i18n Ready** - Built-in Japanese & English UI support

## Demo

**Live Demo:** https://atsumi-code.github.io/zerocodejs/

![ZeroCode.js](public/images/hero-animation.gif)

## Quick Start

### CDN (Easiest)

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="https://unpkg.com/zerocodejs/dist/zerocodejs.css" />
  </head>
  <body>
    <zcode-editor locale="en"></zcode-editor>

    <script src="https://unpkg.com/vue@3.5/dist/vue.global.prod.js"></script>
    <script src="https://unpkg.com/zerocodejs/dist/zerocode.umd.js"></script>
  </body>
</html>
```

That's it! Open the file in a browser and start creating parts.

### npm

```bash
npm install zerocodejs
```

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="node_modules/zerocodejs/dist/zerocodejs.css" />
  </head>
  <body>
    <zcode-editor locale="en"></zcode-editor>

    <script type="module">
      import 'zerocodejs';
    </script>
  </body>
</html>
```

### React

```jsx
import 'zerocodejs';
import 'zerocodejs/style.css';

function App() {
  return <zcode-editor locale="en" />;
}
```

### Vue

```vue
<template>
  <zcode-editor locale="en" />
</template>

<script setup>
import 'zerocodejs';
import 'zerocodejs/style.css';
</script>
```

### Stylesheet load order

Import **`zerocodejs/style.css`** after any aggressive global reset (for example Tailwind Preflight or rules that set `input { appearance: none }`). ZeroCode scopes UI with `zcode-` classes, but native checkboxes, radios, and selects can still be affected by broad `input` / `select` resets.

## Components

### `<zcode-editor>`

Developer-facing editor with parts management, image management, and data viewer. **Recommended for getting started.**

```html
<zcode-editor locale="en"></zcode-editor>
```

### `<zcode-cms>`

User-facing CMS editor for content management (no parts/image management).

```html
<zcode-cms locale="en"></zcode-cms>
```

If the page only needs `<zcode-cms>`, import the dedicated **`zerocodejs/cms`** entry. It excludes the editor/studio components and their parts/image management UI, so the initial load is roughly 100 KB compressed (the rich text editor is lazy-loaded on first use):

```javascript
import 'zerocodejs/cms';
import 'zerocodejs/style.css';
```

### `<zcode-studio>`

A screen for **editing special parts**—whoever is responsible for them, in-house developers or an outside agency. Same **shell as `zcode-editor`** (page, parts, images, data viewer tabs). **Page** management matches `zcode-cms` (including common/individual/special parts when adding to the page). **Parts / images** management and the data viewer’s parts/images views are **special category only** (no common/individual toggles there). Use alongside `zcode-cms` when you want a separate trusted surface.

`save-request` uses `detail.source: 'studio'`; `targets` follow the active tab and data viewer view. From `zcode-cms`, page saves use `targets: ['page', 'images-special']`—handle persistence in your host app.

See [Technical Specification – zcode-studio](./TECHNICAL_SPECIFICATION.md#zcode-studio).

## Server-side rendering (SSR)

For **Node.js** or app frameworks (e.g. Next.js), import from the **`zerocodejs/ssr`** subpath. It is the supported `package.json` export for the SSR bundle (no Vue / Web Components). Template processing needs **jsdom**, which is an optional peer dependency — install it yourself for SSR (`npm install jsdom`). Browser-only users do not need it. On Node.js 20.16+ / 22.3+ it is loaded automatically, including from ESM.

```javascript
import { renderToHtml, renderCssToHtml } from 'zerocodejs/ssr';
```

The main **`zerocodejs`** entry also exports these functions if you prefer one resolution from the full library.

## Managing parts as files

Write parts as HTML files in your product's repository (one file per part, with a `<!--zerocode { "id": ... } -->` header) and bundle them with the CLI (Node 20+, no dependencies):

```bash
npx zerocodejs build-parts parts -o generated/zerocode-parts.json --watch
npx zerocodejs check-parts parts      # duplicate IDs, slot mismatches, syntax typos (file:line)
npx zerocodejs split-parts data.json -o parts   # migrate existing data to files
npx zerocodejs init-vscode            # VS Code completion for z-* attributes and template syntax
```

## Loading Existing Data

To load existing data, set attributes via JavaScript:

```javascript
const editor = document.querySelector('zcode-editor');
editor.setAttribute('page', JSON.stringify(pageData));
editor.setAttribute('parts-common', JSON.stringify(partsData));
editor.setAttribute('parts-individual', JSON.stringify(partsIndividualData));
editor.setAttribute('parts-special', JSON.stringify(partsSpecialData));
editor.setAttribute('images-common', JSON.stringify(imagesData));
// ... other attributes as needed (images-individual, images-special, etc.)
```

## Documentation

- [Documentation – About ZeroCode.js](./docs.html#about)
- [Technical Specification](./TECHNICAL_SPECIFICATION.md)
- [日本語ドキュメント](./README.ja.md)

## Why ZeroCode.js?

- **For those who want to turn "this part should be editable" into a real CMS easily** — Define what should be editable, and you get a simple CMS for just those parts
- **For those who want to stick to HTML, CSS, and JavaScript** — No extra frameworks, just the basics
- **For people tired of the ever-changing frontend** — When keeping up with new tech feels like too much
- **For the AI era** — Simple template + data is easy for both humans and AI to work with

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

We welcome contributions in both **English and Japanese**.

## Security

ZeroCode.js is a frontend library. Complete security cannot be guaranteed on the client side.

### Recommendations

- **Server-side validation is required**: Validate data before saving on the server
- **Implement authentication/authorization**: Only allow authenticated users to modify parts data
- **Verify the source**: Check the `source` field in `save-request` events (`'cms'`, `'editor'`, or `'studio'`)
- **Template management**: Only use templates from trusted sources

See the [Technical Specification](./TECHNICAL_SPECIFICATION.md) for security details.

## License

MIT License

---

**Last Updated**: June 2026
