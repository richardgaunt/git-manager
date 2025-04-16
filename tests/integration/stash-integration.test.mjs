import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import {
  createTestRepository,
  createFileWithChanges
} from './test-repository.mjs';
import {
  stashChanges,
  applyStash,
  hasStashes,
  getStatus
} from '../../api.mjs';

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

  test('stashing and applying changes works using API functions', () => {
    // Create some changes and add them to staging
    createFileWithChanges(testRepo.path, 'test-file.txt', 'Test content', true);

    // Verify changes exist
    const initialStatus = getStatus();
    expect(initialStatus).toContain('test-file.txt');

    // Stash changes using API function
    const stashed = stashChanges("Test stash");
    expect(stashed).toBe(true);

    // Verify changes are stashed
    const afterStashStatus = getStatus();
    expect(afterStashStatus).not.toContain('M test-file.txt');

    // Check if stash exists
    expect(hasStashes()).toBe(true);

    // Apply stash
    const applied = applyStash();
    expect(applied).toBe(true);

    // Verify changes are restored
    const finalStatus = getStatus();
    expect(finalStatus).toContain('test-file.txt');
  });

  test('stashing behaves correctly with no changes', () => {
    // Verify there are no changes initially
    const initialStatus = getStatus();
    expect(initialStatus.trim()).toBe('');

    // Try to stash with no changes
    const stashResult = stashChanges("Empty stash");
    
    // Verify no changes were stashed since there were none
    expect(stashResult).toBe(false);

    // Verify no stash was created
    expect(hasStashes()).toBe(false);
  });
});
