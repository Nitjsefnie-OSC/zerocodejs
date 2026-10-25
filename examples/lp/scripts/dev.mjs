// 開発用: パーツをまとめ、保存のたびにまとめ直しながらサーバーを起動する
import { createRequire } from 'node:module';
import { runParts } from './parts.mjs';

await runParts({ watch: true });
createRequire(import.meta.url)('../server.js');
