/**
 * リッチテキストのツールバーのアイコン（Lucide。ライセンスは create-icon.ts）。
 * 遅延読み込みのチャンクにだけ入るよう、管理画面のアイコンとはファイルを分ける
 */
import { icon } from './create-icon';

/** bold */
export const Bold = /*#__PURE__*/ icon([
  ['path', { d: 'M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8' }]
]);
/** heading-2 */
export const Heading2 = /*#__PURE__*/ icon([
  ['path', { d: 'M4 12h8' }],
  ['path', { d: 'M4 18V6' }],
  ['path', { d: 'M12 18V6' }],
  ['path', { d: 'M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1' }]
]);
/** heading-3 */
export const Heading3 = /*#__PURE__*/ icon([
  ['path', { d: 'M4 12h8' }],
  ['path', { d: 'M4 18V6' }],
  ['path', { d: 'M12 18V6' }],
  ['path', { d: 'M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2' }],
  ['path', { d: 'M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2' }]
]);
/** heading-4 */
export const Heading4 = /*#__PURE__*/ icon([
  ['path', { d: 'M12 18V6' }],
  ['path', { d: 'M17 10v3a1 1 0 0 0 1 1h3' }],
  ['path', { d: 'M21 10v8' }],
  ['path', { d: 'M4 12h8' }],
  ['path', { d: 'M4 18V6' }]
]);
/** italic */
export const Italic = /*#__PURE__*/ icon([
  ['line', { x1: '19', x2: '10', y1: '4', y2: '4' }],
  ['line', { x1: '14', x2: '5', y1: '20', y2: '20' }],
  ['line', { x1: '15', x2: '9', y1: '4', y2: '20' }]
]);
/** link */
export const Link = /*#__PURE__*/ icon([
  ['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }],
  ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }]
]);
/** list */
export const List = /*#__PURE__*/ icon([
  ['path', { d: 'M3 5h.01' }],
  ['path', { d: 'M3 12h.01' }],
  ['path', { d: 'M3 19h.01' }],
  ['path', { d: 'M8 5h13' }],
  ['path', { d: 'M8 12h13' }],
  ['path', { d: 'M8 19h13' }]
]);
/** list-ordered */
export const ListOrdered = /*#__PURE__*/ icon([
  ['path', { d: 'M11 5h10' }],
  ['path', { d: 'M11 12h10' }],
  ['path', { d: 'M11 19h10' }],
  ['path', { d: 'M4 4h1v5' }],
  ['path', { d: 'M4 9h2' }],
  ['path', { d: 'M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02' }]
]);
/** minus */
export const Minus = /*#__PURE__*/ icon([['path', { d: 'M5 12h14' }]]);
/** quote */
export const Quote = /*#__PURE__*/ icon([
  [
    'path',
    {
      d: 'M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z'
    }
  ],
  [
    'path',
    {
      d: 'M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z'
    }
  ]
]);
/** redo-2 */
export const Redo2 = /*#__PURE__*/ icon([
  ['path', { d: 'm15 14 5-5-5-5' }],
  ['path', { d: 'M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13' }]
]);
/** remove-formatting */
export const RemoveFormatting = /*#__PURE__*/ icon([
  ['path', { d: 'M4 7V4h16v3' }],
  ['path', { d: 'M5 20h6' }],
  ['path', { d: 'M13 4 8 20' }],
  ['path', { d: 'm15 15 5 5' }],
  ['path', { d: 'm20 15-5 5' }]
]);
/** strikethrough */
export const Strikethrough = /*#__PURE__*/ icon([
  ['path', { d: 'M16 4H9a3 3 0 0 0-2.83 4' }],
  ['path', { d: 'M14 12a4 4 0 0 1 0 8H6' }],
  ['line', { x1: '4', x2: '20', y1: '12', y2: '12' }]
]);
/** subscript */
export const Subscript = /*#__PURE__*/ icon([
  ['path', { d: 'm4 5 8 8' }],
  ['path', { d: 'm12 5-8 8' }],
  [
    'path',
    {
      d: 'M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07'
    }
  ]
]);
/** superscript */
export const Superscript = /*#__PURE__*/ icon([
  ['path', { d: 'm4 19 8-8' }],
  ['path', { d: 'm12 19-8-8' }],
  [
    'path',
    {
      d: 'M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06'
    }
  ]
]);
/** underline */
export const Underline = /*#__PURE__*/ icon([
  ['path', { d: 'M6 4v6a6 6 0 0 0 12 0V4' }],
  ['line', { x1: '4', x2: '20', y1: '20', y2: '20' }]
]);
/** undo-2 */
export const Undo2 = /*#__PURE__*/ icon([
  ['path', { d: 'M9 14 4 9l5-5' }],
  ['path', { d: 'M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11' }]
]);
