import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { 
  createTestRepository, 
  getCurrentBranch, 
  getRepoStatus, 
  listBranches,
  createFileWithChanges
} from './test-repository.mjs';

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
  
  test('feature branch creation works with real git commands', () => {
    // First, make sure we have changes to test stashing
    createFileWithChanges(testRepo.path, 'unstaged.txt', 'Unstaged content');
    
    // We'll create a branch directly using git commands
    const branchName = 'JIRA-123-test-feature';
    const kebabBranchName = branchName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');
    const featureBranch = `feature/${kebabBranchName}`;
    
    // Get current branch for later verification
    const initialBranch = getCurrentBranch(testRepo.path);
    expect(initialBranch).toBe('main');
    
    // First, check out develop to work from
    execSync('git checkout develop', { cwd: testRepo.path });
    
    // Create feature branch from develop
    execSync(`git checkout -b ${featureBranch}`, { cwd: testRepo.path });
    
    // Create a file on the feature branch and commit it
    createFileWithChanges(testRepo.path, 'feature-file.txt', 'Feature content', true);
    execSync('git commit -m "Add feature file"', { cwd: testRepo.path });
    
    // Verify we're on the feature branch with our new file
    expect(getCurrentBranch(testRepo.path)).toBe(featureBranch);
    expect(fs.existsSync(path.join(testRepo.path, 'feature-file.txt'))).toBe(true);
    
    // Get list of branches and verify our feature branch exists
    const branches = listBranches(testRepo.path);
    expect(branches).toContain(featureBranch);
  });
  
  test('can create and switch between multiple branches', () => {
    // Create multiple branches
    execSync('git checkout -b feature/branch1', { cwd: testRepo.path });
    createFileWithChanges(testRepo.path, 'branch1.txt', 'Branch 1 content', true);
    execSync('git commit -m "Branch 1 commit"', { cwd: testRepo.path });
    
    execSync('git checkout main', { cwd: testRepo.path });
    execSync('git checkout -b feature/branch2', { cwd: testRepo.path });
    createFileWithChanges(testRepo.path, 'branch2.txt', 'Branch 2 content', true);
    execSync('git commit -m "Branch 2 commit"', { cwd: testRepo.path });
    
    // Verify we can switch between branches
    execSync('git checkout feature/branch1', { cwd: testRepo.path });
    expect(getCurrentBranch(testRepo.path)).toBe('feature/branch1');
    expect(fs.existsSync(path.join(testRepo.path, 'branch1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(testRepo.path, 'branch2.txt'))).toBe(false);
    
    execSync('git checkout feature/branch2', { cwd: testRepo.path });
    expect(getCurrentBranch(testRepo.path)).toBe('feature/branch2');
    expect(fs.existsSync(path.join(testRepo.path, 'branch1.txt'))).toBe(false);
    expect(fs.existsSync(path.join(testRepo.path, 'branch2.txt'))).toBe(true);
  });
});