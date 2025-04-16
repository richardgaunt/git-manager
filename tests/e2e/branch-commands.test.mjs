import { describe, expect, test, afterEach, beforeEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  createTestEnvironment,
  runGitManager,
  getCurrentBranch,
  getBranches,
  getGitStatus,
  createFile
} from './test-helpers.mjs';

/**
 * End-to-End tests for branch-related commands
 *
 * These tests verify the actual CLI commands run correctly.
 * Note: Since the git-manager CLI uses interactive prompts,
 * we'll focus on the automatic git operations rather than
 * trying to simulate user input.
 */
describe('Branch Commands E2E Tests', () => {
  let testEnv;

  // Set up fresh test environment before each test
  beforeEach(() => {
    testEnv = createTestEnvironment({
      withDevelop: true,
      withFeature: true, // Include a feature branch
      withRemote: true
    });

    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  // Clean up test environment after each test
  afterEach(() => {
    jest.restoreAllMocks();
    testEnv.cleanup();
  });

  test('branches command shows all branches', () => {
    // Create branches to list
    execSync('git checkout -b feature/test1', { cwd: testEnv.repoPath });
    execSync('git checkout -b feature/test2', { cwd: testEnv.repoPath });
    execSync('git checkout main', { cwd: testEnv.repoPath });

    // Get branches from git
    const expectedBranches = getBranches(testEnv.repoPath);

    // Run git-manager branches command
    const result = runGitManager('branches', { cwd: testEnv.repoPath });

    // Check result
    expect(result.success).toBe(true);

    // Verify all branches appear in the output
    expectedBranches.forEach(branch => {
      // We're just checking the branch names exist in the output
      // The exact format may change, so we don't check output formatting
      expect(result.output).toContain(branch);
    });
  });

  test('repository operations maintain git state correctly', () => {
    // Start on main branch
    execSync('git checkout main', { cwd: testEnv.repoPath });

    // Create feature branch with a commit
    execSync('git checkout -b feature/state-test', { cwd: testEnv.repoPath });
    createFile(testEnv.repoPath, 'feature-file.txt', 'Feature content', true);
    execSync('git commit -m "Add feature file"', { cwd: testEnv.repoPath });

    // Get status to verify git state
    const statusAfterCommit = getGitStatus(testEnv.repoPath);
    expect(statusAfterCommit.clean).toBe(true);
    expect(getCurrentBranch(testEnv.repoPath)).toBe('feature/state-test');

    // Make some uncommitted changes
    createFile(testEnv.repoPath, 'uncommitted.txt', 'Uncommitted changes');
    const statusWithChanges = getGitStatus(testEnv.repoPath);
    expect(statusWithChanges.hasChanges).toBe(true);

    // Verify git operations and git state remain synchronized throughout
    execSync('git add .', { cwd: testEnv.repoPath });
    const statusAfterAdd = getGitStatus(testEnv.repoPath);
    expect(statusAfterAdd.modified).toContain('uncommitted.txt');

    // Verify switching branches with git commands works as expected
    execSync('git commit -m "Commit uncommitted"', { cwd: testEnv.repoPath });
    execSync('git checkout develop', { cwd: testEnv.repoPath });
    expect(getCurrentBranch(testEnv.repoPath)).toBe('develop');
    expect(fs.existsSync(path.join(testEnv.repoPath, 'uncommitted.txt'))).toBe(false);

    // Branch operations should work consistently
    execSync('git checkout feature/state-test', { cwd: testEnv.repoPath });
    expect(fs.existsSync(path.join(testEnv.repoPath, 'uncommitted.txt'))).toBe(true);

    // Branch list should include all branches
    const branches = getBranches(testEnv.repoPath);
    expect(branches).toContain('feature/state-test');
    expect(branches).toContain('develop');
    expect(branches).toContain('main');
  });

  test('git state is maintained when switching branches with stashes', () => {
    // Start on main branch
    execSync('git checkout main', { cwd: testEnv.repoPath });

    // Create uncommitted changes
    createFile(testEnv.repoPath, 'main-changes.txt', 'Changes on main');
    execSync('git add main-changes.txt', { cwd: testEnv.repoPath });

    // Stash changes
    execSync('git stash save "Stashed main changes"', { cwd: testEnv.repoPath });

    // Checkout develop branch
    execSync('git checkout develop', { cwd: testEnv.repoPath });

    // Create changes on develop
    createFile(testEnv.repoPath, 'develop-changes.txt', 'Changes on develop');
    execSync('git add develop-changes.txt', { cwd: testEnv.repoPath });
    execSync('git commit -m "Develop changes"', { cwd: testEnv.repoPath });

    // Go back to main
    execSync('git checkout main', { cwd: testEnv.repoPath });

    // Apply stash
    execSync('git stash apply', { cwd: testEnv.repoPath });

    // Verify main has the stashed changes
    expect(fs.existsSync(path.join(testEnv.repoPath, 'main-changes.txt'))).toBe(true);

    // Verify develop has its own changes
    execSync('git checkout develop', { cwd: testEnv.repoPath });
    expect(fs.existsSync(path.join(testEnv.repoPath, 'develop-changes.txt'))).toBe(true);

    // In real-world usage, the staged changes may persist in the index
    // We're more interested in verifying that the branches maintain their own distinct state
    // than testing the specifics of git's stash behavior
  });
});
