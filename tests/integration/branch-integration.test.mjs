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
  checkoutBranch,
  createBranch,
  toKebabCase
} from '../../api.mjs';

// Test integration between branch-related commands and actual git operations
describe('Branch Operations Integration', () => {
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

  test('feature branch creation works using API functions', () => {
    // First, make sure we have changes to test stashing
    createFileWithChanges(testRepo.path, 'unstaged.txt', 'Unstaged content');

    // We'll create a branch using API functions
    const branchName = 'JIRA-123-test-feature';
    const kebabBranchName = toKebabCase(branchName);
    const featureBranch = `feature/${kebabBranchName}`;

    // Get current branch for later verification
    const initialBranch = getCurrentBranch();
    expect(initialBranch).toBe('main');

    // First, check out develop to work from
    checkoutBranch('develop');

    // Create feature branch from develop
    createBranch(featureBranch);

    // Create a file on the feature branch and commit it
    createFileWithChanges(testRepo.path, 'feature-file.txt', 'Feature content', true);
    execSync('git commit -m "Add feature file"', { cwd: testRepo.path });

    // Verify we're on the feature branch with our new file
    expect(getCurrentBranch()).toBe(featureBranch);
    expect(fs.existsSync(path.join(testRepo.path, 'feature-file.txt'))).toBe(true);

    // Get list of branches and verify our feature branch exists
    const branches = getLocalBranches();
    expect(branches).toContain(featureBranch);
  });

  test('can create and switch between multiple branches using API functions', () => {
    // Create multiple branches
    createBranch('feature/branch1');
    createFileWithChanges(testRepo.path, 'branch1.txt', 'Branch 1 content', true);
    execSync('git commit -m "Branch 1 commit"', { cwd: testRepo.path });

    checkoutBranch('main');
    createBranch('feature/branch2');
    createFileWithChanges(testRepo.path, 'branch2.txt', 'Branch 2 content', true);
    execSync('git commit -m "Branch 2 commit"', { cwd: testRepo.path });

    // Verify we can switch between branches
    checkoutBranch('feature/branch1');
    expect(getCurrentBranch()).toBe('feature/branch1');
    expect(fs.existsSync(path.join(testRepo.path, 'branch1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(testRepo.path, 'branch2.txt'))).toBe(false);

    checkoutBranch('feature/branch2');
    expect(getCurrentBranch()).toBe('feature/branch2');
    expect(fs.existsSync(path.join(testRepo.path, 'branch1.txt'))).toBe(false);
    expect(fs.existsSync(path.join(testRepo.path, 'branch2.txt'))).toBe(true);
  });
});
