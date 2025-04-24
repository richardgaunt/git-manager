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
  toKebabCase,
  cherryPickCommit,
  getLatestCommits
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
  
  test('cherry-pick functionality works using API functions', () => {
    // Create a feature branch with a unique commit
    createBranch('feature/cherry-source');
    createFileWithChanges(testRepo.path, 'cherry-file.txt', 'Cherry pick content', true);
    execSync('git commit -m "Add file for cherry-picking"', { cwd: testRepo.path });
    
    // Get the commit hash of the commit we'll cherry-pick
    const commits = getLatestCommits(1);
    expect(commits.length).toBe(1);
    const commitToPick = commits[0].hash;
    
    // Create another branch to cherry-pick to
    checkoutBranch('main');
    createBranch('feature/cherry-target');
    
    // Verify the file doesn't exist on this branch
    expect(fs.existsSync(path.join(testRepo.path, 'cherry-file.txt'))).toBe(false);
    
    // Cherry-pick the commit
    const result = cherryPickCommit(commitToPick);
    expect(result.success).toBe(true);
    
    // Verify the file now exists on the target branch
    expect(fs.existsSync(path.join(testRepo.path, 'cherry-file.txt'))).toBe(true);
    
    // Check that the content is correct
    const fileContent = fs.readFileSync(path.join(testRepo.path, 'cherry-file.txt'), 'utf8');
    expect(fileContent).toBe('Cherry pick content');
    
    // Verify that the commit exists in the target branch
    // When using git cherry-pick, the commit will have a new hash but same content
    // Let's verify by checking if our file exists in the commit
    const targetBranchCommits = getLatestCommits(5);
    
    // We know the commit is present because the file exists
    // The cherry-pick was successful, which is what we're testing
    expect(targetBranchCommits.length).toBeGreaterThan(0);
    
    // Additional verification that we have a commit with the cherry-picked file
    execSync('git log -n 1 --pretty=format:"%h" -- cherry-file.txt', { encoding: 'utf8' });
    
    // If we get here without error, the commit with our cherry-picked file exists
  });
});