import { describe, it, expect } from 'vitest';
import { checkImageFile, formatFileSize, matchesAccept, uniqueImageId } from './image-files';

const file = (name: string, type: string, size = 10) => ({ name, type, size });

describe('matchesAccept', () => {
  it('input の accept と同じく、MIME・ワイルドカード・拡張子で判定する', () => {
    expect(matchesAccept(file('a.png', 'image/png'), 'image/*')).toBe(true);
    expect(matchesAccept(file('a.pdf', 'application/pdf'), 'image/*')).toBe(false);
    expect(matchesAccept(file('a.webp', 'image/webp'), 'image/png, image/jpeg')).toBe(false);
    expect(matchesAccept(file('A.JPG', ''), '.jpg,.jpeg')).toBe(true);
    expect(matchesAccept(file('a.svg', 'image/svg+xml'), '')).toBe(true);
  });
});

describe('checkImageFile', () => {
  it('種類とサイズを確認する（未指定は image/* のみ）', () => {
    expect(checkImageFile(file('a.png', 'image/png'))).toBeNull();
    expect(checkImageFile(file('a.txt', 'text/plain'))).toEqual({ code: 'type' });
    expect(checkImageFile(file('a.png', 'image/png', 2000), { maxSize: 1000 })).toEqual({
      code: 'size',
      maxSize: 1000
    });
  });

  it('formatFileSize は MB / KB で表す', () => {
    expect(formatFileSize(5_000_000)).toBe('4.8MB');
    expect(formatFileSize(2048)).toBe('2KB');
  });
});

describe('uniqueImageId', () => {
  it('どのカテゴリとも重ならない ID にする', () => {
    const image = (id: string) => ({ id, name: id, url: '' });
    const images = { common: [image('a')], individual: [image('a-2')], special: [] };
    expect(uniqueImageId('b', images)).toBe('b');
    expect(uniqueImageId('a', images)).toBe('a-3');
  });
});
