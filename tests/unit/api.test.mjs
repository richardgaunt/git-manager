import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { toKebabCase } from '../../api.mjs';

// We'll test just the toKebabCase utility function directly since it doesn't rely on git commands
describe('API Utility Functions', () => {
  describe('toKebabCase', () => {
    test('converts string to kebab-case', () => {
      expect(toKebabCase('Hello World')).toBe('hello-world');
      expect(toKebabCase('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(toKebabCase('special_chars!@#')).toBe('special-chars');
      expect(toKebabCase('MixedCaseString')).toBe('mixedcasestring');
      expect(toKebabCase('with-existing-hyphens')).toBe('with-existing-hyphens');
    });
  });
});
