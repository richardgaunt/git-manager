import { describe, expect, test, jest, beforeEach } from '@jest/globals';

// Mock the child_process module
jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn()
}));

// Import modules after mocking
const childProcess = await import('child_process');
const api = await import('../../api.mjs');

describe('Branch Operations', () => {
  beforeEach(() => {
    // Reset mocks before each test
    childProcess.execSync.mockClear();
    childProcess.execSync.mockImplementation((command) => {
      // Default implementation for most common commands
      if (command === 'git branch --show-current') return 'main';
      if (command === 'git branch') return '* main\n  develop\n  feature/test';
      if (command === 'git status -s') return '';
      
      // Return empty string for other commands
      return '';
    });
  });

  describe('deleteLocalBranch', () => {
    test('successfully deletes a branch', () => {
      // Mock successful deletion
      childProcess.execSync.mockImplementation((command) => {
        if (command === 'git branch -d feature/test') {
          return 'Deleted branch feature/test';
        }
        return '';
      });

      const result = api.deleteLocalBranch('feature/test');
      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
      expect(childProcess.execSync).toHaveBeenCalledWith('git branch -d feature/test', expect.anything());
    });

    test('handles branch deletion failure', () => {
      // Mock failure with error
      childProcess.execSync.mockImplementation((command) => {
        if (command === 'git branch -d feature/test') {
          throw new Error('The branch is not fully merged');
        }
        return '';
      });

      const result = api.deleteLocalBranch('feature/test');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to delete branch');
      expect(result.requireForce).toBe(true);
    });

    test('forces branch deletion when requested', () => {
      // Mock successful force deletion
      childProcess.execSync.mockImplementation((command) => {
        if (command === 'git branch -D feature/test') {
          return 'Deleted branch feature/test (was a123b45)';
        }
        return '';
      });

      const result = api.deleteLocalBranch('feature/test', true);
      expect(result.success).toBe(true);
      expect(childProcess.execSync).toHaveBeenCalledWith('git branch -D feature/test', expect.anything());
    });
  });

  describe('checkoutBranch', () => {
    test('successfully checks out a branch', () => {
      // Mock successful checkout
      childProcess.execSync.mockImplementation((command) => {
        if (command === 'git checkout develop') {
          return 'Switched to branch \'develop\'';
        }
        return '';
      });

      expect(api.checkoutBranch('develop')).toBe(true);
      expect(childProcess.execSync).toHaveBeenCalledWith('git checkout develop', expect.anything());
    });

    test('throws error when checkout fails', () => {
      // Mock checkout failure
      childProcess.execSync.mockImplementation((command) => {
        if (command === 'git checkout non-existent') {
          throw new Error('pathspec \'non-existent\' did not match any file(s) known to git');
        }
        return '';
      });

      expect(() => api.checkoutBranch('non-existent')).toThrow('Failed to checkout branch');
      expect(childProcess.execSync).toHaveBeenCalledWith('git checkout non-existent', expect.anything());
    });
  });

  describe('createBranch', () => {
    test('successfully creates a new branch', () => {
      // Mock successful branch creation
      childProcess.execSync.mockImplementation((command) => {
        if (command === 'git checkout -b feature/new-branch') {
          return 'Switched to a new branch \'feature/new-branch\'';
        }
        return '';
      });

      expect(api.createBranch('feature/new-branch')).toBe(true);
      expect(childProcess.execSync).toHaveBeenCalledWith('git checkout -b feature/new-branch', expect.anything());
    });

    test('creates branch from specified start point', () => {
      // Mock branch creation from start point
      childProcess.execSync.mockImplementation((command) => {
        if (command === 'git checkout -b feature/new-branch develop') {
          return 'Switched to a new branch \'feature/new-branch\'';
        }
        return '';
      });

      expect(api.createBranch('feature/new-branch', 'develop')).toBe(true);
      expect(childProcess.execSync).toHaveBeenCalledWith('git checkout -b feature/new-branch develop', expect.anything());
    });

    test('throws error when branch creation fails', () => {
      // Mock branch creation failure
      childProcess.execSync.mockImplementation((command) => {
        if (command.startsWith('git checkout -b')) {
          throw new Error('A branch named \'feature/new-branch\' already exists');
        }
        return '';
      });

      expect(() => api.createBranch('feature/new-branch')).toThrow('Failed to create branch');
    });
  });
});