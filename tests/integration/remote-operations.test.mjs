/**
 * Integration tests for remote branch operations
 * 
 * These tests verify that the git-manager remote branch functions
 * work correctly with remote repositories
 */

import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { createTestRepository } from './test-repository.mjs';
import {
  checkIfRemoteBranchExists,
  getCurrentBranch,
  getAllBranches,
  setUpstreamAndPush,
  deleteRemoteBranch,
  createBranch,
  getStatus
} from '../../api.mjs';

describe('Remote Branch Operations Integration', () => {
  let testRepo;
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test repository with remote
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
    // Clean up test repository and restore console
    process.chdir(originalCwd);
    testRepo.cleanup();
    jest.restoreAllMocks();
  });

  test('can check remote branch existence', async () => {
    // Create a branch locally
    const branchName = 'feature/remote-test';
    createBranch(branchName);
    
    // Verify branch was created locally
    expect(getCurrentBranch()).toBe(branchName);
    
    // Check that it doesn't exist on remote yet
    expect(checkIfRemoteBranchExists(branchName)).toBe(false);
    
    // Push to remote
    const pushResult = setUpstreamAndPush();
    expect(pushResult.success).toBe(true);
    
    // Now it should exist on remote
    expect(checkIfRemoteBranchExists(branchName)).toBe(true);
  });

  test('can delete remote branches', async () => {
    // Create and push a branch
    const branchName = 'feature/delete-test';
    createBranch(branchName);
    const pushResult = setUpstreamAndPush();
    expect(pushResult.success).toBe(true);
    
    // Verify branch exists on remote
    expect(checkIfRemoteBranchExists(branchName)).toBe(true);
    
    // Switch to main branch to allow deletion
    execSync('git checkout main', { cwd: testRepo.path });
    
    // Delete remote branch
    await deleteRemoteBranch(branchName);
    
    // Verify branch no longer exists on remote
    expect(checkIfRemoteBranchExists(branchName)).toBe(false);
  });

  test('remote branch updates are detected', async () => {
    // Create a feature branch and push it
    const branchName = 'feature/remote-updates';
    createBranch(branchName);
    setUpstreamAndPush();
    
    // Switch to main branch
    execSync('git checkout main', { cwd: testRepo.path });
    
    // Make changes to remote by pushing directly to it
    const remoteRepoPath = testRepo.remotePath;
    const workDir = fs.mkdtempSync(path.join(path.dirname(remoteRepoPath), 'work-'));
    
    // Clone the remote for direct changes
    execSync(`git clone ${remoteRepoPath} ${workDir}`);
    
    // Check out the branch in the work clone
    execSync(`git checkout ${branchName}`, { cwd: workDir });
    
    // Make a change and push it
    fs.writeFileSync(path.join(workDir, 'remote-update-file.txt'), 'Remote update content');
    execSync('git add remote-update-file.txt', { cwd: workDir });
    execSync('git commit -m "Remote update"', { cwd: workDir });
    execSync('git push', { cwd: workDir });
    
    // In the original repo, check out the branch and pull
    execSync(`git checkout ${branchName}`, { cwd: testRepo.path });
    execSync('git pull', { cwd: testRepo.path });
    
    // Verify the file from the remote update exists
    expect(fs.existsSync(path.join(testRepo.path, 'remote-update-file.txt'))).toBe(true);
    
    // Clean up work directory
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  test('can create release branch and push to remote', async () => {
    // Create a release branch
    const releaseBranch = 'release/2.0.0';
    createBranch(releaseBranch);
    
    // Verify branch exists locally
    expect(getAllBranches()).toContain(releaseBranch);
    
    // Push to remote
    const pushResult = setUpstreamAndPush();
    expect(pushResult.success).toBe(true);
    
    // Verify branch exists on remote
    expect(checkIfRemoteBranchExists(releaseBranch)).toBe(true);
  });

  test('can create hotfix branch and push to remote', async () => {
    // Create a hotfix branch
    const hotfixBranch = 'hotfix/1.0.1';
    createBranch(hotfixBranch);
    
    // Verify branch was created locally
    expect(getAllBranches()).toContain(hotfixBranch);
    
    // Push to remote
    setUpstreamAndPush();
    
    // Verify branch exists on remote
    expect(checkIfRemoteBranchExists(hotfixBranch)).toBe(true);
  });
});