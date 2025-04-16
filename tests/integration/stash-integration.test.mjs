import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import {
  createTestRepository,
  getCurrentBranch,
  getRepoStatus,
  createFileWithChanges
} from './test-repository.mjs';

// Test integration between the stash functionality and actual git operations
describe('Stash Operations Integration', () => {
  let testRepo;
  let originalCwd;

  beforeEach(() => {
    // Save current working directory
    originalCwd = process.cwd();

    // Create a test repository
    testRepo = createTestRepository({
      withDevelop: true
    });

    // Change to test repository directory
    process.chdir(testRepo.path);

    // Mock console.log and console.error to prevent noise during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up test repository
    testRepo.cleanup();

    // Restore console methods
    jest.restoreAllMocks();
  });

  test('stashing and applying changes works with git commands', () => {
    // Create some changes and add them to staging
    createFileWithChanges(testRepo.path, 'test-file.txt', 'Test content', true);

    // Verify changes exist
    const initialStatus = getRepoStatus(testRepo.path);
    expect(initialStatus).toContain('test-file.txt');

    // Stash changes using git directly
    execSync('git stash save "Test stash"', { cwd: testRepo.path });

    // Verify changes are stashed (could have untracked files which won't be stashed by default)
    const afterStashStatus = getRepoStatus(testRepo.path);
    expect(afterStashStatus).not.toContain('M test-file.txt');

    // Check if stash exists
    const stashList = execSync('git stash list', {
      cwd: testRepo.path,
      encoding: 'utf8'
    });
    expect(stashList.length).toBeGreaterThan(0);

    // Apply stash
    execSync('git stash apply', { cwd: testRepo.path });

    // Verify changes are restored
    const finalStatus = getRepoStatus(testRepo.path);
    expect(finalStatus).toContain('test-file.txt');
  });

  test('stashing behaves correctly with no changes', () => {
    // Try to stash with no changes
    const stashCommand = 'git stash save "Empty stash"';
    const output = execSync(stashCommand, {
      cwd: testRepo.path,
      encoding: 'utf8'
    });

    // Verify the output indicates no changes to stash
    expect(output).toContain('No local changes to save');

    // Verify no stash was created
    const stashList = execSync('git stash list', {
      cwd: testRepo.path,
      encoding: 'utf8'
    });
    expect(stashList).toBe('');
  });
});
