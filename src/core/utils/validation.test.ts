import { describe, it, expect } from 'vitest';
import { validateData } from './validation';
import type { ZeroCodeData } from '../../types';

describe('validateData', () => {
  it('should return true for valid data', () => {
    const validData: ZeroCodeData = {
      page: [
        {
          id: 'comp-1',
          part_id: 'part-1',
          title: 'タイトル'
        }
      ],
      css: {
        common: '',
        individual: '',
        special: ''
      },
      parts: {
        common: [],
        individual: [],
        special: []
      },
      images: {
        common: [],
        individual: [],
        special: []
      }
    };
    expect(validateData(validData)).toBe(true);
  });

  it('should return false when page is missing', () => {
    const invalidData = {
      parts: {
        common: [],
        individual: [],
        special: []
      },
      images: {
        common: [],
        individual: [],
        special: []
      }
    };
    expect(validateData(invalidData)).toBe(false);
  });

  it('should return false when page is not an array', () => {
    const invalidData = {
      page: 'not an array',
      parts: {
        common: [],
        individual: [],
        special: []
      },
      images: {
        common: [],
        individual: [],
        special: []
      }
    };
    expect(validateData(invalidData)).toBe(false);
  });

  it('should return false when component is missing id', () => {
    const invalidData: ZeroCodeData = {
      page: [
        {
          part_id: 'part-1',
          title: 'タイトル'
        } as unknown as ZeroCodeData['page'][number]
      ],
      css: {
        common: '',
        individual: '',
        special: ''
      },
      parts: {
        common: [],
        individual: [],
        special: []
      },
      images: {
        common: [],
        individual: [],
        special: []
      }
    };
    expect(validateData(invalidData)).toBe(false);
  });

  it('should return false when component is missing part_id', () => {
    const invalidData: ZeroCodeData = {
      page: [
        {
          id: 'comp-1',
          title: 'タイトル'
        } as unknown as ZeroCodeData['page'][number]
      ],
      css: {
        common: '',
        individual: '',
        special: ''
      },
      parts: {
        common: [],
        individual: [],
        special: []
      },
      images: {
        common: [],
        individual: [],
        special: []
      }
    };
    expect(validateData(invalidData)).toBe(false);
  });

  it('should return true for empty page array', () => {
    const validData: ZeroCodeData = {
      page: [],
      css: {
        common: '',
        individual: '',
        special: ''
      },
      parts: {
        common: [],
        individual: [],
        special: []
      },
      images: {
        common: [],
        individual: [],
        special: []
      }
    };
    expect(validateData(validData)).toBe(true);
  });

  it('should return false for undefined data', () => {
    expect(validateData(undefined)).toBe(false);
  });

  it('should return false for null data', () => {
    expect(validateData(null)).toBe(false);
  });

  it('should validate all components in page', () => {
    const invalidData: ZeroCodeData = {
      page: [
        {
          id: 'comp-1',
          part_id: 'part-1',
          title: 'タイトル'
        },
        {
          id: 'comp-2',
          // part_id missing
          title: 'タイトル2'
        } as unknown as ZeroCodeData['page'][number]
      ],
      css: {
        common: '',
        individual: '',
        special: ''
      },
      parts: {
        common: [],
        individual: [],
        special: []
      },
      images: {
        common: [],
        individual: [],
        special: []
      }
    };
    expect(validateData(invalidData)).toBe(false);
  });
});
