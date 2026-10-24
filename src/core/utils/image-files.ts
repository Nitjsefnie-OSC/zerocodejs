import type { ImageData, ImageUploadSettings } from '../../types';

export const DEFAULT_IMAGE_ACCEPT = 'image/*';

export type ImageFileProblem = { code: 'type' } | { code: 'size'; maxSize: number };

/** input の accept と同じ書き方（"image/*", "image/png", ".png" のカンマ区切り）で判定する */
export function matchesAccept(file: Pick<File, 'name' | 'type'>, accept: string): boolean {
  const rules = accept
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);
  if (!rules.length) return true;
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

export function checkImageFile(
  file: Pick<File, 'name' | 'type' | 'size'>,
  settings: ImageUploadSettings = {}
): ImageFileProblem | null {
  if (!matchesAccept(file, settings.accept ?? DEFAULT_IMAGE_ACCEPT)) return { code: 'type' };
  if (settings.maxSize && file.size > settings.maxSize) {
    return { code: 'size', maxSize: settings.maxSize };
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** 画像 ID はカテゴリをまたいで参照されるため、すべてのカテゴリで重ならない ID にする */
export function uniqueImageId(
  preferred: string,
  images: { common: ImageData[]; individual: ImageData[]; special: ImageData[] }
): string {
  const used = new Set(
    [...images.common, ...images.individual, ...images.special].map((i) => i.id)
  );
  if (!used.has(preferred)) return preferred;
  let index = 2;
  while (used.has(`${preferred}-${index}`)) index++;
  return `${preferred}-${index}`;
}
