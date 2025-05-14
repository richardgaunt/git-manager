/**
 * Integration tests for error handling
 * 
 * These tests verify that the git-manager commands properly handle
 * error conditions like merge conflicts
 */

import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createTestRepository } from './test-repository.mjs';
import {
  getCurrentBranch,
  checkoutBranch,
  mergeFeatureBranch,
  cherryPickCommit,
  getLatestCommits
} from '../../api.mjs';

describe('Error Handling Integration', () => {
  let testRepo;
  // Save original working directory
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test repository with develop branch
    testRepo = createTestRepository({
      withDevelop: true,
      withRemote: true
    });
    
    // Change to test repository directory
    process.chdir(testRepo.path);
    
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore original working directory and clean up
    process.chdir(originalCwd);
    testRepo.cleanup();
    jest.restoreAllMocks();
  });

  test('handles merge conflicts correctly', async () => {
    // Create branches with conflicting changes
    setupConflictingBranches(testRepo.path);
    
    // Try to merge branch2 into branch1
    checkoutBranch('branch1');
    const mergeResult = mergeFeatureBranch('branch2', 'Merge branch2 into branch1');
    
    // Verify merge reports failure
    expect(mergeResult.success).toBe(false);
    
    // The exact error details may vary, but merge should fail
  });

  test('handles cherry-pick conflicts correctly', async () => {
    // Create branches with conflicting changes
    setupConflictingBranches(testRepo.path);
    
    // Get the commit from branch2 to cherry-pick
    checkoutBranch('branch2');
    const commits = getLatestCommits(1);
    const commitHash = commits[0].hash;
    
    // Try to cherry-pick the commit into branch1
    checkoutBranch('branch1');
    const cherryPickResult = cherryPickCommit(commitHash);
    
    // Verify cherry-pick reports failure
    expect(cherryPickResult.success).toBe(false);
  });

  test('handles failed branch checkout', async () => {
    // Try to check out a non-existent branch
    try {
      checkoutBranch('non-existent-branch');
      fail('Should have thrown an error');
    } catch (error) {
      // Verify error was thrown
      expect(error.message).toContain('Failed to checkout branch');
    }
  });

  test('recovers from operation failure', async () => {
    // Get the initial branch
    const initialBranch = getCurrentBranch();
    
    // Try to check out a non-existent branch - this will fail
    try {
      checkoutBranch('non-existent-branch-abc');
    } catch (error) {
      // Expected error, now verify we can recover
    }
    
    // Verify we can still run git commands after the failure
    // (Note: We need to use direct git command since our API may throw)
    execSync('git checkout ' + initialBranch, { cwd: testRepo.path });
    const currentBranch = execSync('git branch --show-current', { 
      cwd: testRepo.path,
      encoding: 'utf8'
    }).trim();
    
    expect(currentBranch).toBe(initialBranch);
  });
});

/**
 * Helper to set up branches with conflicting changes
 * @param {string} repoPath Path to the test repository
 */
function setupConflictingBranches(repoPath) {
  // Start from a known branch
  execSync('git checkout main', { cwd: repoPath });
  
  // Create branch1 with a specific file content
  execSync('git checkout -b branch1', { cwd: repoPath });
  fs.writeFileSync(path.join(repoPath, 'conflict.txt'), 'Content from branch1');
  execSync('git add conflict.txt', { cwd: repoPath });
  execSync('git commit -m "Add conflict.txt in branch1"', { cwd: repoPath });
  
  // Create branch2 with different content in the same file
  execSync('git checkout main', { cwd: repoPath });
  execSync('git checkout -b branch2', { cwd: repoPath });
  fs.writeFileSync(path.join(repoPath, 'conflict.txt'), 'Content from branch2');
  execSync('git add conflict.txt', { cwd: repoPath });
  execSync('git commit -m "Add conflict.txt in branch2"', { cwd: repoPath });
}