import type { ComponentData, PartData, SlotConfig } from '../../types';
import { getDOMParser, DOM_NODE_TYPE_ELEMENT, DOM_NODE_TYPE_TEXT } from './dom-utils';
import { sanitizeRichText, escapeAttributeValue, sanitizeUrl } from './sanitize';
import { TEMPLATE_REGEX } from './template-regex';
import {
  scanFieldTokens,
  splitDefaultAndValidation,
  VALID_Z_TAG_NAMES,
  type ChoiceFieldToken,
  type ValueFieldToken
} from './field-syntax';
import { firstChoiceValueFromRaw, rawChoiceValues } from './choice-options';
import {
  processImageField,
  resolveBackendDataPath,
  resolveBackendDataWithDefault,
  expandUrlPlaceholders
} from './template-utils';
import { logger } from './logger';
import { joinSiblingHtmlWithAddButtons, type AddBetweenButtonLabels } from './page-add-buttons';

function selectionSingleFromComponent(
  component: ComponentData,
  fieldName: string,
  optionsRaw: string
): string {
  const v = component[fieldName];
  return (typeof v === 'string' ? v : '') || firstChoiceValueFromRaw(optionsRaw);
}

function processZIf(content: DocumentFragment, component: ComponentData): void {
  content.querySelectorAll('[z-if]').forEach((el) => {
    const condition = el.getAttribute('z-if');
    if (condition) {
      const conditionValue = component[condition] !== undefined ? component[condition] : true;
      if (!conditionValue) {
        el.remove();
      } else {
        el.removeAttribute('z-if');
      }
    } else {
      el.removeAttribute('z-if');
    }
  });
}

function processZTag(content: DocumentFragment, component: ComponentData, doc: Document): void {
  content.querySelectorAll('[z-tag]').forEach((el) => {
    const zTagValue = el.getAttribute('z-tag');
    if (zTagValue) {
      const tagMatch = zTagValue.match(/^\$(\w+)(?::(.+))?$/);
      if (tagMatch) {
        const fieldName = tagMatch[1];
        const tagValue = component[fieldName];
        const tagName = typeof tagValue === 'string' ? tagValue : el.tagName.toLowerCase();
        const normalizedTagName = typeof tagName === 'string' ? tagName.toLowerCase() : tagName;

        if (
          typeof normalizedTagName === 'string' &&
          VALID_Z_TAG_NAMES.includes(normalizedTagName)
        ) {
          const newElement = doc.createElement(normalizedTagName);

          Array.from(el.attributes).forEach((attr) => {
            if (attr.name !== 'z-tag') {
              newElement.setAttribute(attr.name, attr.value);
            }
          });

          Array.from(el.childNodes).forEach((child) => {
            newElement.appendChild(child.cloneNode(true));
          });

          el.parentNode?.replaceChild(newElement, el);
        }
      }
    }
  });
}

export function isEmptyForZEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      trimmed === '' ||
      trimmed === '<p></p>' ||
      trimmed === '<p> </p>' ||
      /^<p>\s*<\/p>$/i.test(trimmed) ||
      /^<p>\s*<br\s*\/?>\s*<\/p>$/i.test(trimmed)
    ) {
      return true;
    }
  }
  return false;
}

function processZEmpty(
  content: DocumentFragment,
  component: ComponentData,
  enableEditorAttributes: boolean
): void {
  content.querySelectorAll('[z-empty]').forEach((el) => {
    const condition = el.getAttribute('z-empty');
    if (condition) {
      const fieldNameMatch = condition.match(/^\$(\w+)$/);
      if (fieldNameMatch) {
        const fieldName = fieldNameMatch[1];
        const fieldValue = component[fieldName];

        if (isEmptyForZEmpty(fieldValue)) {
          if (enableEditorAttributes) {
            el.removeAttribute('z-empty');
          } else {
            el.remove();
          }
        } else {
          el.removeAttribute('z-empty');
        }
      } else {
        el.removeAttribute('z-empty');
      }
    } else {
      el.removeAttribute('z-empty');
    }
  });
}

export interface ProcessTemplateOptions {
  translations?: {
    addSlotButton?: string;
    addBeforeButton?: string;
    addAfterButton?: string;
  };
}

function isUrlAttribute(attrName: string | null): boolean {
  return (
    attrName === 'href' ||
    attrName === 'xlink:href' ||
    attrName === 'src' ||
    attrName === 'action' ||
    attrName === 'formaction' ||
    attrName === 'poster'
  );
}

const RICH_TEXT_BLOCK_START = /^<(p|h[2-4]|ul|ol|blockquote|hr)[\s>/]/i;
const URL_CHECK_MARKER = 'data-zcode-url-check';
const TEMPLATE_SYNTAX_IN_ATTR = /\{[$@\w]|\(\$/;

/**
 * トークン単位の URL 検査だけでは、href="{$a}{$b}" のように複数トークンを連結して
 * javascript: を組み立てられる。展開前にテンプレート記法を含む URL 属性へ目印を付け、
 * すべての展開後に最終値を検査する（作者が直接書いた固定値は検査対象外）。
 */
function markTemplatedUrlAttributes(content: DocumentFragment): void {
  content.querySelectorAll('*').forEach((el) => {
    const names = Array.from(el.attributes)
      .filter(
        (attr) =>
          isUrlAttribute(attr.name.toLowerCase()) && TEMPLATE_SYNTAX_IN_ATTR.test(attr.value)
      )
      .map((attr) => attr.name);
    if (names.length > 0) {
      el.setAttribute(URL_CHECK_MARKER, names.join(' '));
    }
  });
}

function sanitizeMarkedUrlAttributes(content: DocumentFragment): void {
  content.querySelectorAll(`[${URL_CHECK_MARKER}]`).forEach((el) => {
    (el.getAttribute(URL_CHECK_MARKER) || '').split(' ').forEach((name) => {
      const value = el.getAttribute(name);
      if (value !== null) {
        el.setAttribute(name, sanitizeUrlForAttr(value, name.toLowerCase()));
      }
    });
    el.removeAttribute(URL_CHECK_MARKER);
  });
}

function sanitizeUrlForAttr(url: string, attrName: string | null): string {
  const context = attrName === 'src' || attrName === 'poster' ? 'embed' : 'navigation';
  return sanitizeUrl(url, context);
}

function formatBackendDataResolved(resolved: string, attrName: string | null): string {
  if (isUrlAttribute(attrName)) {
    return sanitizeUrlForAttr(resolved, attrName);
  }
  if (attrName !== null) {
    return escapeAttributeValue(resolved);
  }
  return resolved;
}

function expandBackendDataReferences(
  value: string,
  backendData: Record<string, unknown> | undefined,
  attrName: string | null = null
): string {
  value = value.replace(
    TEMPLATE_REGEX.BACKEND_DATA_WITH_DEFAULT,
    (_match, dataPath, defaultValue) => {
      const resolved = resolveBackendDataWithDefault(backendData, dataPath, defaultValue);
      return formatBackendDataResolved(resolved, attrName);
    }
  );
  if (backendData) {
    value = value.replace(TEMPLATE_REGEX.BACKEND_DATA, (_match, dataPath) => {
      const resolved = resolveBackendDataPath(backendData, dataPath);
      return formatBackendDataResolved(resolved, attrName);
    });
  }
  return value;
}

// DOMパーサーベースの変数展開・条件処理
export function processTemplateWithDOM(
  html: string,
  component: ComponentData,
  path: string,
  _findPart: (partId: string) => PartData | null,
  renderComponentToHtml: (component: ComponentData, path: string) => string,
  enableEditorAttributes: boolean = true,
  imagesCommon: Array<{ id: string; url: string }> = [],
  imagesIndividual: Array<{ id: string; url: string }> = [],
  imagesSpecial: Array<{ id: string; url: string }> = [],
  backendData?: Record<string, unknown>,
  options?: ProcessTemplateOptions
): string {
  const DOMParser = getDOMParser();
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<template>${html}</template>`, 'text/html');
  const template = doc.querySelector('template');

  if (!template || !template.content) {
    logger.error('Failed to parse template HTML');
    return html;
  }

  markTemplatedUrlAttributes(template.content);

  // 1. テキストノードの変数展開 {$variable:default}
  // ===== フィールド展開エンジン =====
  // scanFieldTokens が返すトークンを、コンテキスト（テキストノード / 属性）ごとの
  // 解決ルールで展開する。値フィールドと選択肢は従来どおり別パスで処理する
  // （値の展開結果に選択肢記法が含まれる場合、後段の選択肢パスが処理する従来挙動を維持）。

  const valueTokensOf = (text: string): ValueFieldToken[] =>
    scanFieldTokens(text).filter((t): t is ValueFieldToken => t.kind === 'value');

  const choiceTokensOf = (text: string): ChoiceFieldToken[] =>
    scanFieldTokens(text).filter((t): t is ChoiceFieldToken => t.kind === 'choice');

  // 従来の分岐評価順: optional+group → optional → group → 通常
  const variantRank = (token: ValueFieldToken): number =>
    token.optional ? (token.groupName ? 0 : 1) : token.groupName ? 2 : 3;

  const pickLegacyFirst = (tokens: ValueFieldToken[]): ValueFieldToken =>
    tokens.reduce((best, token) => {
      const diff = variantRank(token) - variantRank(best);
      return diff < 0 || (diff === 0 && token.start < best.start) ? token : best;
    });

  // text / image / （属性内の）textarea トークンをテキストとして解決
  const resolveTextLikeValue = (token: ValueFieldToken): string => {
    const rawValue = component[token.fieldName];
    if (rawValue === undefined) {
      return '';
    }
    // boolean型の値は表示しない（z-ifで制御するため）。従来どおり optional のみ
    if (token.optional && typeof rawValue === 'boolean') {
      return '';
    }
    const defaultValue =
      token.fieldType === 'text'
        ? token.defaultValue
        : splitDefaultAndValidation(token.body).defaultValue;
    return String(rawValue || defaultValue);
  };

  // rich トークンを DOM 挿入用 HTML に解決（空文字は「何も挿入しない」）
  const resolveRichHtml = (token: ValueFieldToken): string => {
    const rawValue = component[token.fieldName];
    if (token.optional && typeof rawValue === 'boolean') {
      return '';
    }
    // 従来仕様: optional は validation を剥がしたデフォルト、通常は未加工デフォルトを使う
    const defaultValue = token.optional ? token.defaultValue : token.rawDefault;
    let richTextValue: string =
      rawValue === undefined
        ? ''
        : typeof rawValue === 'string'
          ? rawValue
          : String(rawValue || defaultValue);

    richTextValue = sanitizeRichText(richTextValue);

    if (!richTextValue) {
      // 従来仕様: optional は何も挿入せず、通常は空の <p></p> を挿入
      return token.optional ? '' : '<p></p>';
    }
    // 段落で始まらないプレーンなテキストだけを <p> で包む（見出しやリストを包むと <p> が分割される）
    if (!RICH_TEXT_BLOCK_START.test(richTextValue.trim())) {
      richTextValue = `<p>${richTextValue}</p>`;
    }
    return richTextValue;
  };

  const resolveTextareaString = (token: ValueFieldToken): string => {
    const rawValue = component[token.fieldName];
    if (token.optional) {
      return rawValue === undefined ? '' : String(rawValue || token.defaultValue);
    }
    // 従来仕様: 通常 textarea のみ ?? （空文字はデフォルトに落ちない）かつ未加工デフォルト
    return String(rawValue ?? token.rawDefault ?? '');
  };

  const appendRichNodes = (parts: Node[], token: ValueFieldToken) => {
    const html = resolveRichHtml(token);
    if (!html) return;
    const tempDiv = doc.createElement('div');
    tempDiv.innerHTML = html;
    Array.from(tempDiv.childNodes).forEach((child) => {
      parts.push(child.cloneNode(true));
    });
  };

  const appendTextareaNodes = (parts: Node[], token: ValueFieldToken) => {
    const lines = resolveTextareaString(token).split('\n');
    lines.forEach((line, index) => {
      if (line) {
        parts.push(doc.createTextNode(line));
      }
      // 最後の行以外は必ず<br>を挿入（空行の場合も含む）
      if (index < lines.length - 1) {
        parts.push(doc.createElement('br'));
      }
    });
  };

  const expandValueTokensInTextNode = (node: Node) => {
    let text = node.textContent || '';

    // バックエンドデータの展開（先に処理。デフォルト付きは backendData 未指定でも展開）
    text = expandBackendDataReferences(text, backendData);

    const tokens = valueTokensOf(text);
    const richTokens = tokens.filter((t) => t.fieldType === 'rich');
    const textareaTokens = tokens.filter((t) => t.fieldType === 'textarea');

    // rich / textarea は DOM ノード挿入が必要。従来実装と同じく1ノードにつき
    // 優先順の1トークンだけを展開し、前後のテキストは未展開のまま残す。
    // textarea の場合のみ後続テキストを再帰処理する（従来仕様）
    const domToken =
      node.parentNode && richTokens.length > 0
        ? pickLegacyFirst(richTokens)
        : node.parentNode && textareaTokens.length > 0
          ? pickLegacyFirst(textareaTokens)
          : null;

    if (domToken) {
      const parent = node.parentNode as Element;
      const beforeText = text.substring(0, domToken.start);
      const afterText = text.substring(domToken.end);

      if (beforeText) {
        parent.insertBefore(doc.createTextNode(beforeText), node);
      }

      const parts: Node[] = [];
      if (domToken.fieldType === 'rich') {
        appendRichNodes(parts, domToken);
      } else {
        appendTextareaNodes(parts, domToken);
      }
      parts.forEach((part) => parent.insertBefore(part, node));

      if (afterText) {
        const afterNode = doc.createTextNode(afterText);
        parent.insertBefore(afterNode, node);
        if (domToken.fieldType === 'textarea') {
          expandValueTokensInTextNode(afterNode);
        }
      }

      parent.removeChild(node);
      return;
    }

    // 文字列置換のみ（text / image）。位置を保つため後ろから前へ置換
    let result = text;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      if (token.fieldType === 'rich' || token.fieldType === 'textarea') continue;
      result = result.slice(0, token.start) + resolveTextLikeValue(token) + result.slice(token.end);
    }
    node.textContent = result;
  };

  const resolveAttrTokenValue = (token: ValueFieldToken, attrName: string): string => {
    const rawValue = component[token.fieldName];

    if (token.fieldType === 'rich') {
      if (rawValue === undefined) {
        return '';
      }
      if (token.optional && typeof rawValue === 'boolean') {
        return '';
      }
      const defaultValue = token.optional ? token.defaultValue : token.rawDefault;
      const stringValue = String(rawValue || defaultValue);
      // URL 属性では javascript: 等のスキームを遮断する（エスケープだけでは防げないため）
      if (isUrlAttribute(attrName)) {
        return sanitizeUrlForAttr(stringValue, attrName);
      }
      return escapeAttributeValue(stringValue);
    }

    if (token.fieldType === 'image') {
      if (rawValue === undefined) {
        return '';
      }
      let imageUrlString: string;
      if (token.optional) {
        const defaultValue = token.defaultValue;
        const imageIdValue =
          typeof rawValue === 'string' ? rawValue : String(rawValue || defaultValue);
        const imageUrl = processImageField(
          imageIdValue,
          defaultValue,
          imagesCommon,
          imagesIndividual,
          imagesSpecial
        );
        imageUrlString = typeof imageUrl === 'string' ? imageUrl : String(imageUrl || defaultValue);
      } else {
        const defaultValue = token.rawDefault;
        const imageUrl = processImageField(
          (rawValue || defaultValue) as string,
          defaultValue,
          imagesCommon,
          imagesIndividual,
          imagesSpecial
        );
        imageUrlString = imageUrl || defaultValue;
      }
      if (isUrlAttribute(attrName)) {
        return sanitizeUrlForAttr(imageUrlString, attrName);
      }
      return escapeAttributeValue(imageUrlString);
    }

    // text / （属性内の）textarea
    const stringValue = resolveTextLikeValue(token);
    if (isUrlAttribute(attrName)) {
      return sanitizeUrlForAttr(stringValue, attrName);
    }
    return escapeAttributeValue(stringValue);
  };

  const expandValueTokensInAttrValue = (value: string, attrName: string): string => {
    const tokens = valueTokensOf(value);
    let result = value;
    for (let i = tokens.length - 1; i >= 0; i--) {
      result =
        result.slice(0, tokens[i].start) +
        resolveAttrTokenValue(tokens[i], attrName) +
        result.slice(tokens[i].end);
    }
    return result;
  };

  const expandAttributesOnElement = (element: Element) => {
    const attributesToRemove: string[] = [];

    Array.from(element.attributes).forEach((attr) => {
      const originalValue = attr.value;
      let value = attr.value;
      const attrName = attr.name.toLowerCase();

      // 特殊属性は展開しない（z-forは後で処理するため、ここではスキップ）
      if (
        attrName === 'z-if' ||
        attrName === 'z-for' ||
        attrName === 'z-slot' ||
        attrName === 'z-empty' ||
        attrName === 'z-tag' ||
        attrName.startsWith('data-zcode-')
      ) {
        return;
      }

      // 元の属性値がオプショナルフィールドのみかチェック
      const isOptionalOnly = /^\{\$[\w.]+?\?(?::[^}]*)?\}(?::(rich|image|textarea))?$/.test(
        originalValue.trim()
      );

      // バックエンドデータの展開（先に処理）
      if (backendData) {
        if (isUrlAttribute(attrName)) {
          value = expandUrlPlaceholders(value, backendData);
        }
      }
      value = expandBackendDataReferences(value, backendData, attrName);

      value = expandValueTokensInAttrValue(value, attrName);

      // 属性値が空文字列で、元の属性値がオプショナルフィールドのみの場合、属性を削除
      if (isOptionalOnly && value.trim() === '') {
        attributesToRemove.push(attr.name);
      } else {
        attr.value = value;
      }
    });

    // 属性を削除（forEach中に削除すると問題が起きるため、後で削除）
    attributesToRemove.forEach((attrName) => {
      element.removeAttribute(attrName);
    });
  };

  const processTextNodes = (node: Node) => {
    if (node.nodeType === DOM_NODE_TYPE_TEXT) {
      expandValueTokensInTextNode(node);
      return;
    }
    if (node.nodeType === DOM_NODE_TYPE_ELEMENT) {
      expandAttributesOnElement(node as Element);
    }
    Array.from(node.childNodes).forEach((child) => processTextNodes(child));
  };

  processTextNodes(template.content);

  // 2. 選択式・複数選択式の処理 ($field:opt1|opt2) と ($field@:opt1|opt2)
  const resolveChoiceSingle = (token: ChoiceFieldToken, withEmptyFallback: boolean): string => {
    if (withEmptyFallback) {
      return selectionSingleFromComponent(component, token.fieldName, token.rawOptions);
    }
    const value = component[token.fieldName];
    return typeof value === 'string' ? value : firstChoiceValueFromRaw(token.rawOptions);
  };

  const resolveChoiceValue = (token: ChoiceFieldToken, context: 'text' | 'attr'): string => {
    if (token.delimiter === ',') {
      const selectedValues = component[token.fieldName];
      const valuesArray = Array.isArray(selectedValues) ? selectedValues : [];
      const optionList = rawChoiceValues(token.rawOptions, ',');
      return valuesArray
        .filter((val: unknown) => typeof val === 'string' && optionList.includes(val))
        .join(' ');
    }
    if (context === 'attr') {
      // 属性: | 区切りは空文字→先頭選択肢のフォールバックあり、区切りなしはなし（従来仕様）
      return resolveChoiceSingle(token, token.delimiter === '|');
    }
    // テキスト: グループ付き select のみフォールバックあり（従来仕様）
    return resolveChoiceSingle(token, token.select && !!token.groupName);
  };

  const processSelectionSyntax = (node: Node) => {
    if (node.nodeType === DOM_NODE_TYPE_TEXT) {
      const text = node.textContent || '';
      const tokens = choiceTokensOf(text);
      if (tokens.length > 0) {
        let result = text;
        for (let i = tokens.length - 1; i >= 0; i--) {
          result =
            result.slice(0, tokens[i].start) +
            resolveChoiceValue(tokens[i], 'text') +
            result.slice(tokens[i].end);
        }
        node.textContent = result;
      }
    } else if (node.nodeType === DOM_NODE_TYPE_ELEMENT) {
      const element = node as Element;
      Array.from(element.attributes).forEach((attr) => {
        const tokens = choiceTokensOf(attr.value);
        if (tokens.length === 0) return;
        const attrName = attr.name.toLowerCase();
        let value = attr.value;
        for (let i = tokens.length - 1; i >= 0; i--) {
          const resolved = String(resolveChoiceValue(tokens[i], 'attr'));
          const wrapped = isUrlAttribute(attrName)
            ? sanitizeUrlForAttr(resolved, attrName)
            : escapeAttributeValue(resolved);
          value = value.slice(0, tokens[i].start) + wrapped + value.slice(tokens[i].end);
        }
        attr.value = value;
      });
    }

    node.childNodes.forEach((child) => processSelectionSyntax(child));
  };

  processSelectionSyntax(template.content);

  processZIf(template.content, component);
  processZTag(template.content, component, doc);
  processZEmpty(template.content, component, enableEditorAttributes);

  // 4. z-for ループ処理（シンプル版: バックエンドデータのみ）
  const processLoops = () => {
    const loopElements = Array.from(template.content.querySelectorAll('[z-for]'));

    loopElements.forEach((loopEl) => {
      const zForValue = loopEl.getAttribute('z-for');
      if (!zForValue) {
        loopEl.removeAttribute('z-for');
        return;
      }

      // ループ式をパース: "item in {@items}"
      const match = zForValue.match(/^(\w+)\s+in\s+(.+)$/);
      if (!match) {
        logger.warn(`Invalid z-for syntax: ${zForValue}`);
        loopEl.removeAttribute('z-for');
        return;
      }

      const [, itemVar, dataSourceExpr] = match;
      // dataSourceExpr = "{@items}"

      // バックエンドデータのみ対応
      if (!dataSourceExpr.startsWith('{@') || !dataSourceExpr.endsWith('}')) {
        logger.warn(`z-for only supports backend data: ${dataSourceExpr}`);
        loopEl.removeAttribute('z-for');
        return;
      }

      // データソースのパスを取得
      const dataPath = dataSourceExpr.slice(2, -1); // "items"

      // バックエンドデータから配列を取得
      if (!backendData) {
        loopEl.remove();
        return;
      }

      let dataSource: unknown;
      try {
        // resolveBackendDataPathは文字列を返すので、配列の場合は直接アクセス
        const parts = dataPath.split('.');
        let current: unknown = backendData;

        for (const part of parts) {
          if (
            current &&
            typeof current === 'object' &&
            part in (current as Record<string, unknown>)
          ) {
            current = (current as Record<string, unknown>)[part];
          } else {
            current = null;
            break;
          }
        }

        dataSource = current;
      } catch (error) {
        logger.warn(`Failed to resolve data source: ${dataPath}`, error);
        loopEl.remove();
        return;
      }

      // 配列でない、または空の場合は削除
      if (!Array.isArray(dataSource) || dataSource.length === 0) {
        loopEl.remove();
        return;
      }

      // 各イテレーションでテンプレートを複製（パース済み doc にフォールバック、グローバル document は使わない）
      const fragmentOwner = loopEl.ownerDocument ?? doc;
      if (!fragmentOwner) throw new Error('Document not available for createDocumentFragment');
      const fragment = fragmentOwner.createDocumentFragment();

      (dataSource as unknown[]).forEach((item) => {
        // 子要素をクローン
        const cloned = loopEl.cloneNode(true) as Element;
        cloned.removeAttribute('z-for');

        // ループ変数を展開
        expandLoopVariables(cloned, itemVar, item, component, backendData, parser);

        fragment.appendChild(cloned);
      });

      // 元の要素を置き換え
      if (loopEl.parentNode) {
        loopEl.parentNode.replaceChild(fragment, loopEl);
      }
    });
  };

  // ループ変数を展開する関数
  const expandLoopVariables = (
    element: Element,
    itemVar: string,
    item: unknown,
    component: ComponentData,
    backendData: Record<string, unknown> | undefined,
    _parser: DOMParser
  ) => {
    // {item.name} のプロパティパスを解決（テキスト / 属性共通）
    const resolveLoopVarPath = (propPath: string): string => {
      try {
        const parts = propPath.split(/[.[\]]/).filter((p: string) => p);
        let current: unknown = item;

        for (const part of parts) {
          if (part.match(/^\d+$/)) {
            const index = parseInt(part, 10);
            if (Array.isArray(current) && index >= 0 && index < current.length) {
              current = current[index];
            } else {
              return '';
            }
          } else {
            if (
              current &&
              typeof current === 'object' &&
              part in (current as Record<string, unknown>)
            ) {
              current = (current as Record<string, unknown>)[part];
            } else {
              return '';
            }
          }
        }

        return current === null || current === undefined ? '' : String(current);
      } catch (error) {
        return '';
      }
    };

    const resolveLoopVarDirect = (): string =>
      typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item);

    const loopVarPathRegex = () => new RegExp(`\\{${itemVar}\\.([\\w\\.\\[\\]]+)\\}`, 'g');
    const loopVarDirectRegex = () => new RegExp(`\\{${itemVar}\\}`, 'g');

    const processNode = (node: Node) => {
      if (node.nodeType === DOM_NODE_TYPE_TEXT) {
        let text = node.textContent || '';
        text = text.replace(loopVarPathRegex(), (_match, propPath) => resolveLoopVarPath(propPath));
        text = text.replace(loopVarDirectRegex(), () => resolveLoopVarDirect());
        node.textContent = text;
      } else if (node.nodeType === DOM_NODE_TYPE_ELEMENT) {
        const el = node as Element;

        Array.from(el.attributes).forEach((attr) => {
          const urlAttrName = attr.name.toLowerCase();
          const wrapForAttr = (result: string): string =>
            isUrlAttribute(urlAttrName)
              ? sanitizeUrlForAttr(result, urlAttrName)
              : escapeAttributeValue(result);

          let value = attr.value;
          value = value.replace(loopVarPathRegex(), (_match, propPath) =>
            wrapForAttr(resolveLoopVarPath(propPath))
          );
          value = value.replace(loopVarDirectRegex(), () => wrapForAttr(resolveLoopVarDirect()));

          attr.value = value;
        });

        // 子ノードを再帰的に処理
        Array.from(el.childNodes).forEach((child) => processNode(child));
      }
    };

    // 子ノードを処理
    Array.from(element.childNodes).forEach((child) => processNode(child));

    // 再帰的にprocessTemplateWithDOMを呼び出して、ループ内の他のテンプレート構文も処理
    // ただし、z-forは再帰的に処理しない（ネストループは非対応）
    const tempHtml = element.innerHTML;
    if (tempHtml) {
      // ループ変数を一時的にbackendDataに追加して、{@item.name}として参照可能にする
      // ただし、これは複雑になるので、{item.name}の形式のみサポートする
      // 既に展開済みなので、ここでは他のテンプレート構文（{$field}など）のみ処理
      const processedHtml = processTemplateWithDOM(
        tempHtml,
        component,
        path,
        _findPart,
        renderComponentToHtml,
        enableEditorAttributes,
        imagesCommon,
        imagesIndividual,
        imagesSpecial,
        backendData
      );
      element.innerHTML = processedHtml;
    }
  };

  processLoops();

  sanitizeMarkedUrlAttributes(template.content);

  // 5. z-slot 処理
  const processSlots = (slotElements: Element[]) => {
    slotElements.forEach((slotEl) => {
      const slotName = slotEl.getAttribute('z-slot') || 'default';
      const slotData = component.slots?.[slotName];

      // SlotConfigの場合はchildrenプロパティを使用、そうでなければ配列として扱う
      let children: ComponentData[] = [];
      if (Array.isArray(slotData)) {
        children = slotData;
      } else if (slotData && typeof slotData === 'object' && (slotData as SlotConfig).children) {
        children = (slotData as SlotConfig).children || [];
      }

      if (children.length === 0) {
        // 空のスロットの場合は追加ボタンを表示（編集用属性が有効な場合のみ）
        slotEl.removeAttribute('z-slot');
        if (enableEditorAttributes) {
          slotEl.setAttribute('data-zcode-empty-slot', slotName);
          slotEl.setAttribute(
            'data-zcode-slot-path',
            path ? `${path}.slots.${slotName}` : `slots.${slotName}`
          );
          const addSlotButtonText = options?.translations?.addSlotButton ?? '+ Add Part';
          slotEl.innerHTML = `<div class="zcode-empty-slot" data-zcode-empty-slot-content>
            <button class="zcode-add-slot-btn" data-zcode-add-slot>${addSlotButtonText}</button>
          </div>`;
        } else {
          // 公開用の場合は空のスロットをそのまま表示（追加ボタンなし）
          slotEl.innerHTML = '';
        }
        return;
      }

      // 子コンポーネントをレンダリング
      // renderComponentToHtmlは既に属性を注入しているので、追加の処理は不要
      const childPaths = children.map((_, childIndex) =>
        path ? `${path}.slots.${slotName}.${childIndex}` : `slots.${slotName}.${childIndex}`
      );
      const childHtmlParts = children.map((child: ComponentData, childIndex: number) =>
        renderComponentToHtml(child, childPaths[childIndex])
      );
      const addBetweenLabels: AddBetweenButtonLabels = {
        before: options?.translations?.addBeforeButton ?? 'Add before',
        after: options?.translations?.addAfterButton ?? 'Add after'
      };
      const childrenHtml = joinSiblingHtmlWithAddButtons(
        childHtmlParts,
        (index) => childPaths[index],
        enableEditorAttributes,
        addBetweenLabels
      );

      // z-slot属性を削除してから子要素を挿入
      slotEl.removeAttribute('z-slot');

      // すべての要素をタグに依存しない方法で挿入
      // HTMLをパースしてDOM要素として挿入することで、属性が確実に保持される
      const tempDoc = parser.parseFromString(`<template>${childrenHtml}</template>`, 'text/html');
      const tempTemplate = tempDoc.querySelector('template');
      if (tempTemplate && tempTemplate.content) {
        // 既存の子要素を削除
        slotEl.innerHTML = '';
        // テンプレート内の要素を移動（クローンではなく移動）
        while (tempTemplate.content.firstChild) {
          slotEl.appendChild(tempTemplate.content.firstChild);
        }
      } else {
        // フォールバック: 通常のinnerHTML設定
        slotEl.innerHTML = childrenHtml;
      }
    });
  };

  // 名前付きスロットとデフォルトスロットを処理
  // querySelectorAllの結果を配列にコピーしてから処理（DOM変更による影響を防ぐ）
  const namedSlots = Array.from(template.content.querySelectorAll('[z-slot]'));
  processSlots(namedSlots);

  return template.innerHTML;
}
