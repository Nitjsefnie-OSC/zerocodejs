import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseConfig } from './config';
import { logger } from './logger';

describe('parseConfig', () => {
  afterEach(() => vi.restoreAllMocks());

  it('JSON を読み、読めなければ空の設定', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    expect(parseConfig('{"parts":{"sanitizeTemplate":true}}', 'Test')).toEqual({
      parts: { sanitizeTemplate: true }
    });
    expect(parseConfig(undefined, 'Test')).toEqual({});
    expect(parseConfig('{', 'Test')).toEqual({});
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('廃止した config.studio には移行先を案内する', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    parseConfig('{"studio":{"fileManagedCategories":["common"]}}', 'Test');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('parts.fileManagedCategories'));
  });
});
