import { describe, expect, test, jest, beforeEach } from '@jest/globals';

// Mock the child_process module at the module level, before import
jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn((command) => {
    if (command === 'git rev-parse --is-inside-work-tree') {
      return 'true';
    }
    if (command === 'git branch --show-current') {
      return 'feature-branch';
    }
    if (command === 'git branch') {
      return '* feature-branch\n  develop\n  main';
    }
    if (command === 'git status -s') {
      return ' M file.txt';
    }
    throw new Error(`Command not mocked: ${command}`);
  })
}));

// Dynamic import after mocking
const childProcess = await import('child_process');
const api = await import('../../api.mjs');

describe('API Git Functions', () => {
  beforeEach(() => {
    // Clear mock data between tests
    childProcess.execSync.mockClear();
  });

  describe('isGitRepository', () => {
    test('returns true when in a git repository', () => {
      expect(api.isGitRepository()).toBe(true);
      expect(childProcess.execSync).toHaveBeenCalledWith('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    });

    test('returns false when git command fails', () => {
      childProcess.execSync.mockImplementationOnce(() => {
        throw new Error('git command failed');
      });
      expect(api.isGitRepository()).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    test('returns the current branch name', () => {
      expect(api.getCurrentBranch()).toBe('feature-branch');
      expect(childProcess.execSync).toHaveBeenCalledWith('git branch --show-current', { encoding: 'utf8' });
    });

    test('throws error on command failure', () => {
      childProcess.execSync.mockImplementationOnce(() => {
        throw new Error('git command failed');
      });
      expect(() => api.getCurrentBranch()).toThrow('Failed to get current branch');
    });
  });

  describe('getLocalBranches', () => {
    test('returns array of branch names', () => {
      const branches = api.getLocalBranches();
      expect(branches).toEqual(['feature-branch', 'develop', 'main']);
      expect(childProcess.execSync).toHaveBeenCalledWith('git branch', { encoding: 'utf8' });
    });

    test('throws error on command failure', () => {
      childProcess.execSync.mockImplementationOnce(() => {
        throw new Error('git command failed');
      });
      expect(() => api.getLocalBranches()).toThrow('Failed to get local branches');
    });
  });

  describe('getStatus', () => {
    test('returns git status output', () => {
      expect(api.getStatus()).toBe(' M file.txt');
      expect(childProcess.execSync).toHaveBeenCalledWith('git status -s', { encoding: 'utf8' });
    });

    test('throws error on command failure', () => {
      childProcess.execSync.mockImplementationOnce(() => {
        throw new Error('git command failed');
      });
      expect(() => api.getStatus()).toThrow('Failed to get status');
    });
  });
});
