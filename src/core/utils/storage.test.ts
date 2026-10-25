import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadUserSettings,
  saveUserSettings,
  getUserLocale,
  loadCMSSettings,
  saveCMSSettings,
  getCMSSetting,
  replaceCMSSettings,
  loadDevSettings,
  saveDevSettings,
  getDevSetting,
  clearUserSettings,
  getCssWarningPartsSetting,
  setCssWarningPartsSetting
} from './storage';

// localStorageとsessionStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

describe('storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('loadUserSettings', () => {
    it('should return empty object when no settings stored', () => {
      const settings = loadUserSettings();
      expect(settings).toEqual({});
    });

    it('should load stored settings', () => {
      const storedSettings = { locale: 'ja', cms: { allowDynamicContentInteraction: true } };
      localStorageMock.setItem('zcode-user-settings', JSON.stringify(storedSettings));
      const settings = loadUserSettings();
      expect(settings).toEqual(storedSettings);
    });

    it('should return empty object on parse error', () => {
      localStorageMock.setItem('zcode-user-settings', 'invalid json');
      const settings = loadUserSettings();
      expect(settings).toEqual({});
    });
  });

  describe('saveUserSettings', () => {
    it('should save settings', () => {
      saveUserSettings({ locale: 'ja' });
      const stored = localStorageMock.getItem('zcode-user-settings');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.locale).toBe('ja');
    });

    it('should merge with existing settings', () => {
      localStorageMock.setItem('zcode-user-settings', JSON.stringify({ locale: 'ja' }));
      saveUserSettings({ locale: 'en' });
      const stored = localStorageMock.getItem('zcode-user-settings');
      const parsed = JSON.parse(stored!);
      expect(parsed.locale).toBe('en');
    });

    it('should merge nested settings', () => {
      localStorageMock.setItem(
        'zcode-user-settings',
        JSON.stringify({ cms: { allowDynamicContentInteraction: true } })
      );
      saveUserSettings({ cms: { devRightPadding: true } });
      const stored = localStorageMock.getItem('zcode-user-settings');
      const parsed = JSON.parse(stored!);
      expect(parsed.cms.allowDynamicContentInteraction).toBe(true);
      expect(parsed.cms.devRightPadding).toBe(true);
    });
  });

  describe('getUserLocale', () => {
    it('should return default value when locale not set', () => {
      const locale = getUserLocale('ja');
      expect(locale).toBe('ja');
    });

    it('should return stored locale', () => {
      localStorageMock.setItem('zcode-user-settings', JSON.stringify({ locale: 'en' }));
      const locale = getUserLocale('ja');
      expect(locale).toBe('en');
    });

    it('should return null when default is null and locale not set', () => {
      const locale = getUserLocale(null);
      expect(locale).toBeNull();
    });
  });

  describe('CMS settings', () => {
    it('should load CMS settings', () => {
      localStorageMock.setItem(
        'zcode-user-settings',
        JSON.stringify({ cms: { allowDynamicContentInteraction: true } })
      );
      const settings = loadCMSSettings();
      expect(settings.allowDynamicContentInteraction).toBe(true);
    });

    it('should return empty object when CMS settings not found', () => {
      const settings = loadCMSSettings();
      expect(settings).toEqual({});
    });

    it('should save CMS settings', () => {
      saveCMSSettings({ allowDynamicContentInteraction: true });
      const settings = loadCMSSettings();
      expect(settings.allowDynamicContentInteraction).toBe(true);
    });

    it('should get CMS setting with default', () => {
      const value = getCMSSetting('allowDynamicContentInteraction', false);
      expect(value).toBe(false);
    });

    it('should get stored CMS setting', () => {
      localStorageMock.setItem(
        'zcode-user-settings',
        JSON.stringify({ cms: { allowDynamicContentInteraction: true } })
      );
      const value = getCMSSetting('allowDynamicContentInteraction', false);
      expect(value).toBe(true);
    });

    it('should replace CMS settings without merging removed keys', () => {
      localStorageMock.setItem(
        'zcode-user-settings',
        JSON.stringify({
          cms: { devRightPadding: true, showAddBetweenButtons: false },
          locale: 'ja'
        })
      );
      replaceCMSSettings({ showAddBetweenButtons: false });
      const stored = JSON.parse(localStorageMock.getItem('zcode-user-settings')!);
      expect(stored.cms.devRightPadding).toBeUndefined();
      expect(stored.cms.showAddBetweenButtons).toBe(false);
      expect(stored.locale).toBe('ja');
    });
  });

  describe('Dev settings', () => {
    it('should load Dev settings', () => {
      localStorageMock.setItem(
        'zcode-user-settings',
        JSON.stringify({ dev: { showSaveConfirm: true } })
      );
      const settings = loadDevSettings();
      expect(settings.showSaveConfirm).toBe(true);
    });

    it('should return empty object when Dev settings not found', () => {
      const settings = loadDevSettings();
      expect(settings).toEqual({});
    });

    it('should save Dev settings', () => {
      saveDevSettings({ showSaveConfirm: true });
      const settings = loadDevSettings();
      expect(settings.showSaveConfirm).toBe(true);
    });

    it('should get Dev setting with default', () => {
      const value = getDevSetting('showSaveConfirm', false);
      expect(value).toBe(false);
    });

    it('should get stored Dev setting', () => {
      localStorageMock.setItem(
        'zcode-user-settings',
        JSON.stringify({ dev: { showSaveConfirm: true } })
      );
      const value = getDevSetting('showSaveConfirm', false);
      expect(value).toBe(true);
    });
  });

  describe('clearUserSettings', () => {
    it('should clear user settings', () => {
      localStorageMock.setItem('zcode-user-settings', JSON.stringify({ locale: 'ja' }));
      clearUserSettings();
      const stored = localStorageMock.getItem('zcode-user-settings');
      expect(stored).toBeNull();
    });
  });

  describe('CSS warning parts setting', () => {
    it('should return false when not set', () => {
      const value = getCssWarningPartsSetting();
      expect(value).toBe(false);
    });

    it('should return true when set to true', () => {
      sessionStorageMock.setItem('zcode-dont-show-css-warning-parts', 'true');
      const value = getCssWarningPartsSetting();
      expect(value).toBe(true);
    });

    it('should set CSS warning parts setting', () => {
      setCssWarningPartsSetting(true);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'zcode-dont-show-css-warning-parts',
        'true'
      );
    });
  });
});
