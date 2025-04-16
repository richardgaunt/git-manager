import { describe, expect, test, afterAll, beforeAll, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { 
  createTestEnvironment, 
  runGitManager, 
  getCurrentBranch, 
  getBranches,
  getGitStatus,
  createFile,
  getStashList
} from './test-helpers.mjs';

/**
 * End-to-End tests for git-manager workflows
 * 
 * These tests verify complete workflows from start to finish 
 * with real git repositories and actual command execution.
 */
describe('End-to-End Workflows', () => {
  let testEnv;
  
  // Set up test environment before tests
  beforeAll(() => {
    // Create test environment with git repository
    testEnv = createTestEnvironment({
      withDevelop: true, // Include develop branch
      withRemote: true   // Set up remote simulation
    });
    
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });
  
  // Clean up test environment after tests
  afterAll(() => {
    // Restore console output
    jest.restoreAllMocks();
    
    // Clean up test environment
    testEnv.cleanup();
  });
  
  describe('Feature Branch Workflow', () => {
    test('complete feature branch workflow', () => {
      // 1. Ensure we're on main branch to start
      execSync('git checkout main', { cwd: testEnv.repoPath });
      expect(getCurrentBranch(testEnv.repoPath)).toBe('main');
      
      // 2. Create a feature branch using git commands
      const branchName = 'feature/test-feature';
      execSync(`git checkout -b ${branchName}`, { cwd: testEnv.repoPath });
      expect(getCurrentBranch(testEnv.repoPath)).toBe(branchName);
      
      // 3. Make changes in the feature branch
      createFile(testEnv.repoPath, 'feature-file.txt', 'Feature content', true);
      const statusAfterChanges = getGitStatus(testEnv.repoPath);
      expect(statusAfterChanges.modified).toContain('feature-file.txt');
      
      // 4. Commit changes
      execSync('git commit -m "Add feature file"', { cwd: testEnv.repoPath });
      const statusAfterCommit = getGitStatus(testEnv.repoPath);
      expect(statusAfterCommit.clean).toBe(true);
      
      // 5. Simulate completing feature by merging to develop
      execSync('git checkout develop', { cwd: testEnv.repoPath });
      execSync(`git merge --no-ff ${branchName} -m "Merge feature"`, { cwd: testEnv.repoPath });
      
      // 6. Verify feature was merged to develop
      expect(getCurrentBranch(testEnv.repoPath)).toBe('develop');
      const featureFileExists = fs.existsSync(path.join(testEnv.repoPath, 'feature-file.txt'));
      expect(featureFileExists).toBe(true);
      
      // 7. Clean up feature branch
      execSync(`git branch -d ${branchName}`, { cwd: testEnv.repoPath });
      const branches = getBranches(testEnv.repoPath);
      expect(branches).not.toContain(branchName);
    });
  });
  
  describe('Branch Checkout with Stashing', () => {
    test('checkout with uncommitted changes', () => {
      // 1. Make sure we're on develop branch
      execSync('git checkout develop', { cwd: testEnv.repoPath });
      expect(getCurrentBranch(testEnv.repoPath)).toBe('develop');
      
      // 2. Create uncommitted changes
      createFile(testEnv.repoPath, 'uncommitted.txt', 'Uncommitted changes');
      const statusBeforeStash = getGitStatus(testEnv.repoPath);
      expect(statusBeforeStash.untracked).toContain('uncommitted.txt');
      
      // 3. Stash changes
      execSync('git add uncommitted.txt', { cwd: testEnv.repoPath });
      execSync('git stash save "Stash for checkout"', { cwd: testEnv.repoPath });
      const stashList = getStashList(testEnv.repoPath);
      expect(stashList.length).toBeGreaterThan(0);
      
      // 4. Checkout main branch
      execSync('git checkout main', { cwd: testEnv.repoPath });
      expect(getCurrentBranch(testEnv.repoPath)).toBe('main');
      
      // 5. Go back to develop
      execSync('git checkout develop', { cwd: testEnv.repoPath });
      
      // 6. Apply stash
      execSync('git stash apply', { cwd: testEnv.repoPath });
      const statusAfterStashApply = getGitStatus(testEnv.repoPath);
      expect(statusAfterStashApply.modified).toContain('uncommitted.txt');
      
      // 7. Clean up
      execSync('git reset --hard', { cwd: testEnv.repoPath });
    });
  });
  
  describe('Hotfix Workflow', () => {
    test('hotfix creation and completion', () => {
      // 1. Start from main branch
      execSync('git checkout main', { cwd: testEnv.repoPath });
      expect(getCurrentBranch(testEnv.repoPath)).toBe('main');
      
      // 2. Create hotfix branch
      const hotfixBranch = 'hotfix/1.0.1';
      execSync(`git checkout -b ${hotfixBranch}`, { cwd: testEnv.repoPath });
      expect(getCurrentBranch(testEnv.repoPath)).toBe(hotfixBranch);
      
      // 3. Make hotfix changes
      createFile(testEnv.repoPath, 'hotfix.txt', 'Hotfix content', true);
      execSync('git commit -m "Apply hotfix"', { cwd: testEnv.repoPath });
      
      // 4. Complete hotfix by merging to main
      execSync('git checkout main', { cwd: testEnv.repoPath });
      execSync(`git merge --no-ff ${hotfixBranch} -m "Merge hotfix"`, { cwd: testEnv.repoPath });
      
      // 5. Verify hotfix is on main
      expect(fs.existsSync(path.join(testEnv.repoPath, 'hotfix.txt'))).toBe(true);
      
      // 6. Merge hotfix to develop too
      execSync('git checkout develop', { cwd: testEnv.repoPath });
      execSync(`git merge --no-ff ${hotfixBranch} -m "Merge hotfix to develop"`, { cwd: testEnv.repoPath });
      
      // 7. Verify hotfix is on develop
      expect(fs.existsSync(path.join(testEnv.repoPath, 'hotfix.txt'))).toBe(true);
      
      // 8. Create tag for the hotfix
      execSync('git checkout main', { cwd: testEnv.repoPath });
      execSync('git tag -a v1.0.1 -m "Version 1.0.1"', { cwd: testEnv.repoPath });
      
      // 9. Clean up hotfix branch
      execSync(`git branch -d ${hotfixBranch}`, { cwd: testEnv.repoPath });
      const branches = getBranches(testEnv.repoPath);
      expect(branches).not.toContain(hotfixBranch);
    });
  });
});