import { getDOMParser } from './dom-utils';
import { logger } from './logger';

export function injectAttributesToRootElement(
  html: string,
  attrs: Record<string, string>,
  options?: { addClass?: string }
): string {
  const DOMParser = getDOMParser();
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<template>${html}</template>`, 'text/html');
  const template = doc.querySelector('template');

  if (!template || !template.content.firstElementChild) {
    logger.warn('Failed to parse HTML:', html);
    return html;
  }

  const rootElements = Array.from(template.content.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement
  );

  if (rootElements.length === 0) {
    logger.warn('Failed to parse HTML:', html);
    return html;
  }

  rootElements.forEach((rootElement) => {
    Object.entries(attrs).forEach(([key, value]) => {
      rootElement.setAttribute(key, value);
    });

    if (options?.addClass) {
      const existing = rootElement.getAttribute('class')?.trim() || '';
      const merged = existing ? `${existing} ${options.addClass}` : options.addClass;
      rootElement.setAttribute('class', merged);
    }
  });

  return template.innerHTML;
}

export function processImageField(
  value: string,
  defaultValue: string | undefined,
  imagesCommon: Array<{ id: string; url: string }>,
  imagesIndividual: Array<{ id: string; url: string }>,
  imagesSpecial: Array<{ id: string; url: string }> = []
): string {
  // 検索順序（優先度の高い順）：common → individual → special
  const allImages = [...imagesCommon, ...imagesIndividual, ...imagesSpecial];

  if (value) {
    const image = allImages.find((img) => img.id === value);
    if (image) {
      return image.url;
    }
  }

  if (defaultValue) {
    const defaultImage = allImages.find((img) => img.id === defaultValue);
    if (defaultImage) {
      logger.warn(`Image not found: ${value}, using default: ${defaultValue}`);
      return defaultImage.url;
    }
  }

  logger.warn(`Image not found: ${value}, default: ${defaultValue}`);
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function resolveBackendDataWithDefault(
  backendData: Record<string, unknown> | undefined,
  path: string,
  defaultValue: string
): string {
  if (!backendData) return defaultValue;
  const resolved = resolveBackendDataPath(backendData, path);
  return resolved === '' ? defaultValue : resolved;
}

/** backendData から path（`a.b[0].c` 形式）の値を取り出す。見つからなければ undefined */
export function getBackendDataValue(
  backendData: Record<string, unknown> | undefined,
  path: string
): unknown {
  if (!backendData || !path) return undefined;

  try {
    const parts: string[] = [];
    let currentPart = '';

    for (let i = 0; i < path.length; i++) {
      const char = path[i];
      if (char === '[' || char === ']' || char === '.') {
        if (currentPart) {
          parts.push(currentPart);
          currentPart = '';
        }
      } else {
        currentPart += char;
      }
    }

    if (currentPart) {
      parts.push(currentPart);
    }

    let current: unknown = backendData;
    for (const part of parts) {
      if (part.match(/^\d+$/)) {
        const index = parseInt(part, 10);
        if (!Array.isArray(current) || index < 0 || index >= current.length) return undefined;
        current = current[index];
      } else {
        if (!isRecord(current) || !(part in current)) return undefined;
        current = current[part];
      }
    }
    return current;
  } catch (error) {
    logger.warn(`Failed to resolve backend data path: ${path}`, error);
    return undefined;
  }
}

export function resolveBackendDataPath(backendData: Record<string, unknown>, path: string): string {
  const value = getBackendDataValue(backendData, path);
  return value === null || value === undefined ? '' : String(value);
}

export function expandUrlPlaceholders(url: string, backendData: Record<string, unknown>): string {
  if (!url || !backendData) return url;

  return url.replace(/\{(\w+)\}/g, (match, key) => {
    const value = backendData[key];
    if (value === null || value === undefined) {
      return match;
    }
    return String(value);
  });
}
