import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import {
  createTestRepository,
  createFileWithChanges
} from './test-repository.mjs';
import {
  getCurrentBranch,
  getStatus,
  getLocalBranches,
  deleteLocalBranch,
  stashChanges,
  applyStash,
  hasStashes
} from '../../api.mjs';

// Test integration between command workflows and API functions
describe('Command Integration', () => {
  let testRepo;
  let originalCwd;

  beforeEach(() => {
    // Save current working directory
    originalCwd = process.cwd();

    // Create a test repository
    testRepo = createTestRepository({
      withDevelop: true,
      withRemote: true
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

  test('branch deletion works correctly with API functions', () => {
    // Create a test branch
    execSync('git checkout -b feature/to-delete', { cwd: testRepo.path });
    
    // Create a file and commit it
    createFileWithChanges(testRepo.path, 'delete-me.txt', 'Delete content', true);
    execSync('git commit -m "Add file to be deleted"', { cwd: testRepo.path });
    
    // Return to main branch
    execSync('git checkout main', { cwd: testRepo.path });
    
    // Verify branch exists
    const branches = getLocalBranches();
    expect(branches).toContain('feature/to-delete');
    
    // Delete the branch using API with force=true since it's not merged
    const result = deleteLocalBranch('feature/to-delete', true);
    expect(result.success).toBe(true);
    
    // Verify branch is gone
    const branchesAfterDelete = getLocalBranches();
    expect(branchesAfterDelete).not.toContain('feature/to-delete');
  });

  test('stash workflow operates correctly with API functions', () => {
    // Make changes to test stashing
    createFileWithChanges(testRepo.path, 'stash-me.txt', 'Stash content', true);
    
    // Verify changes exist
    const status = getStatus();
    expect(status).toContain('stash-me.txt');
    
    // Stash changes
    const stashResult = stashChanges('Test stash for command workflow');
    expect(stashResult).toBe(true);
    
    // Verify working directory is clean after stashing tracked files
    const statusAfterStash = getStatus();
    expect(statusAfterStash).not.toContain('A stash-me.txt');
    
    // Verify stash exists
    expect(hasStashes()).toBe(true);
    
    // Apply the stash
    const applyResult = applyStash();
    expect(applyResult).toBe(true);
    
    // Verify changes are restored
    const finalStatus = getStatus();
    expect(finalStatus).toContain('stash-me.txt');
  });
});
