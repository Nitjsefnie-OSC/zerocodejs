#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { main } from '../dist/cli.mjs';

process.exitCode = main(process.argv.slice(2), {
  out: (text) => process.stdout.write(`${text}\n`),
  err: (text) => process.stderr.write(`${text}\n`),
  editorSupportDir: fileURLToPath(new URL('../editor-support/vscode/', import.meta.url))
});
