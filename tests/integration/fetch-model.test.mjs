/**
 * Integration tests for fetch model branch updates
 * 
 * These tests verify that the fetchBranchUpdates function works correctly
 * for updating branches without having to check them out first
 */

import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { createTestRepository, createFileWithChanges } from './test-repository.mjs';
import {
  getCurrentBranch,
  fetchBranchUpdates,
  checkoutBranch
} from '../../api.mjs';

describe('Fetch Model Integration Tests', () => {
  let testRepo;
  let remotePath;
  let workDir;
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test repository with remote
    testRepo = createTestRepository({
      withDevelop: true,
      withRemote: true
    });
    
    remotePath = testRepo.remotePath;
    
    // Set up a separate working directory to simulate remote changes
    workDir = fs.mkdtempSync(path.join(path.dirname(remotePath), 'work-'));
    execSync(`git clone ${remotePath} ${workDir}`);
    
    // Change to test repository directory
    process.chdir(testRepo.path);
    
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Clean up test repository and restore console
    process.chdir(originalCwd);
    testRepo.cleanup();
    if (fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
    jest.restoreAllMocks();
  });

  test('fetchBranchUpdates can update main branch without checking it out', async () => {
    // Create a feature branch to work on
    execSync('git checkout -b feature/test-fetch', { cwd: testRepo.path });
    expect(getCurrentBranch()).toBe('feature/test-fetch');
    
    // Make changes to the main branch via our second working directory
    execSync('git checkout main', { cwd: workDir });
    fs.writeFileSync(path.join(workDir, 'main-update.txt'), 'Content for main update');
    execSync('git add main-update.txt', { cwd: workDir });
    execSync('git commit -m "Update main from remote"', { cwd: workDir });
    execSync('git push', { cwd: workDir });
    
    // Use fetch model to update main branch while staying on feature branch
    const fetchResult = fetchBranchUpdates('main');
    
    // Verify fetch was successful
    expect(fetchResult).toBe(true);
    
    // Verify we're still on feature branch
    expect(getCurrentBranch()).toBe('feature/test-fetch');
    
    // Check out main to verify it has been updated
    checkoutBranch('main');
    
    // Verify the file from the remote update exists
    expect(fs.existsSync(path.join(testRepo.path, 'main-update.txt'))).toBe(true);
  });

  test('fetchBranchUpdates can update develop branch without checking it out', async () => {
    // Create a hotfix branch to work on
    execSync('git checkout -b hotfix/1.0.1', { cwd: testRepo.path });
    expect(getCurrentBranch()).toBe('hotfix/1.0.1');
    
    // Make changes to the develop branch via our second working directory
    execSync('git checkout develop', { cwd: workDir });
    fs.writeFileSync(path.join(workDir, 'develop-update.txt'), 'Content for develop update');
    execSync('git add develop-update.txt', { cwd: workDir });
    execSync('git commit -m "Update develop from remote"', { cwd: workDir });
    execSync('git push', { cwd: workDir });
    
    // Use fetch model to update develop branch while staying on hotfix branch
    const fetchResult = fetchBranchUpdates('develop');
    
    // Verify fetch was successful
    expect(fetchResult).toBe(true);
    
    // Verify we're still on hotfix branch
    expect(getCurrentBranch()).toBe('hotfix/1.0.1');
    
    // Check out develop to verify it has been updated
    checkoutBranch('develop');
    
    // Verify the file from the remote update exists
    expect(fs.existsSync(path.join(testRepo.path, 'develop-update.txt'))).toBe(true);
  });

  test('fetchBranchUpdates handles non-fast-forward updates gracefully', async () => {
    // Create diverging changes to main in both repositories
    
    // Make changes in the local repository
    execSync('git checkout main', { cwd: testRepo.path });
    fs.writeFileSync(path.join(testRepo.path, 'local-change.txt'), 'Local change to main');
    execSync('git add local-change.txt', { cwd: testRepo.path });
    execSync('git commit -m "Local change to main"', { cwd: testRepo.path });
    
    // Make different changes to main in the remote repository
    execSync('git checkout main', { cwd: workDir });
    fs.writeFileSync(path.join(workDir, 'remote-change.txt'), 'Remote change to main');
    execSync('git add remote-change.txt', { cwd: workDir });
    execSync('git commit -m "Remote change to main"', { cwd: workDir });
    execSync('git push -f', { cwd: workDir });
    
    // Create and switch to a feature branch
    execSync('git checkout -b feature/test-non-ff', { cwd: testRepo.path });
    
    // Attempt fetch update for main (should return false for non-fast-forward)
    const fetchResult = fetchBranchUpdates('main');
    
    // Verify fetch reports the non-fast-forward issue
    expect(fetchResult).toBe(false);
    
    // Verify we're still on the feature branch
    expect(getCurrentBranch()).toBe('feature/test-non-ff');
  });

  test('fetchBranchUpdates works correctly in hotfix workflow', async () => {
    // Create a hotfix branch
    execSync('git checkout main', { cwd: testRepo.path });
    execSync('git checkout -b hotfix/1.0.2', { cwd: testRepo.path });
    
    // Make a hotfix change
    fs.writeFileSync(path.join(testRepo.path, 'hotfix.txt'), 'Critical bug fix');
    execSync('git add hotfix.txt', { cwd: testRepo.path });
    execSync('git commit -m "Add critical bug fix"', { cwd: testRepo.path });
    
    // Make changes to main in the remote
    execSync('git checkout main', { cwd: workDir });
    fs.writeFileSync(path.join(workDir, 'main-remote-change.txt'), 'Remote change during hotfix');
    execSync('git add main-remote-change.txt', { cwd: workDir });
    execSync('git commit -m "Change on main during hotfix"', { cwd: workDir });
    execSync('git push', { cwd: workDir });
    
    // Make changes to develop in the remote
    execSync('git checkout develop', { cwd: workDir });
    fs.writeFileSync(path.join(workDir, 'develop-remote-change.txt'), 'Remote develop change during hotfix');
    execSync('git add develop-remote-change.txt', { cwd: workDir });
    execSync('git commit -m "Change on develop during hotfix"', { cwd: workDir });
    execSync('git push', { cwd: workDir });
    
    // Update main and develop from the hotfix branch using fetch model
    const mainFetchResult = fetchBranchUpdates('main');
    const developFetchResult = fetchBranchUpdates('develop');
    
    // Verify fetch operations were successful
    expect(mainFetchResult).toBe(true);
    expect(developFetchResult).toBe(true);
    
    // Verify we're still on the hotfix branch
    expect(getCurrentBranch()).toBe('hotfix/1.0.2');
    
    // Check that main branch got updated correctly when we checkout
    checkoutBranch('main');
    expect(fs.existsSync(path.join(testRepo.path, 'main-remote-change.txt'))).toBe(true);
    
    // Check that develop branch got updated correctly when we checkout
    checkoutBranch('develop');
    expect(fs.existsSync(path.join(testRepo.path, 'develop-remote-change.txt'))).toBe(true);
  });
});