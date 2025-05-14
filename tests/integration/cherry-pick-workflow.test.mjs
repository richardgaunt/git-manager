/**
 * Integration tests for cherry-pick workflow
 *
 * These tests verify that the cherry-pick functionality
 * works correctly across branches
 */

import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createTestRepository } from './test-repository.mjs';
import {
  getCurrentBranch,
  cherryPickCommit,
  getLatestCommits,
  checkoutBranch
} from '../../api.mjs';

describe('Cherry-Pick Workflow Integration', () => {
  let testRepo;
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
    // Clean up test repository and restore console
    process.chdir(originalCwd);
    testRepo.cleanup();
    jest.restoreAllMocks();
  });

  test('can cherry-pick a specific commit', async () => {
    // Create a feature branch
    execSync('git checkout -b feature/cherry-source', { cwd: testRepo.path });

    // Add a file and commit it
    const fileName = 'feature-specific-file.txt';
    const filePath = path.join(testRepo.path, fileName);
    fs.writeFileSync(filePath, 'Feature specific content');
    execSync(`git add ${fileName}`, { cwd: testRepo.path });
    execSync('git commit -m "Add feature-specific file"', { cwd: testRepo.path });

    // Get the commit hash
    const commits = getLatestCommits(1);
    expect(commits.length).toBe(1);
    const commitHash = commits[0].hash;

    // Create a second branch to cherry-pick to
    checkoutBranch('main');
    execSync('git checkout -b target-branch', { cwd: testRepo.path });

    // Verify the file doesn't exist on this branch
    expect(fs.existsSync(filePath)).toBe(false);

    // Cherry-pick the commit
    const result = cherryPickCommit(commitHash);

    // Verify the cherry-pick was successful
    expect(result.success).toBe(true);

    // Verify the file now exists in the target branch
    expect(fs.existsSync(filePath)).toBe(true);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    expect(fileContent).toBe('Feature specific content');
  });

  test('can cherry-pick commit to remote branch', async () => {
    // Create source branch with commit
    execSync('git checkout -b feature/remote-cherry', { cwd: testRepo.path });
    const fileName = 'remote-cherry.txt';
    const filePath = path.join(testRepo.path, fileName);
    fs.writeFileSync(filePath, 'Content for remote cherry-pick');
    execSync(`git add ${fileName}`, { cwd: testRepo.path });
    execSync('git commit -m "Add content for cherry-pick"', { cwd: testRepo.path });

    // Get the commit hash
    const commits = getLatestCommits(1);
    expect(commits.length).toBe(1);
    const commitHash = commits[0].hash;

    // Create a target branch and push to remote
    checkoutBranch('main');
    execSync('git checkout -b cherry-target', { cwd: testRepo.path });
    execSync('git push -u origin cherry-target', { cwd: testRepo.path });

    // Cherry-pick the commit
    const result = cherryPickCommit(commitHash);
    expect(result.success).toBe(true);

    // Push the cherry-picked change
    execSync('git push', { cwd: testRepo.path });

    // Verify the change is pushed
    const status = execSync('git log -1 --oneline', {
      cwd: testRepo.path,
      encoding: 'utf8'
    });
    expect(status).toContain('cherry-pick');

    // Verify we can fetch the change from remote
    execSync('git checkout main', { cwd: testRepo.path });
    execSync('git fetch origin', { cwd: testRepo.path });
    execSync('git checkout origin/cherry-target', { cwd: testRepo.path });

    // The file should exist
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('cherry-pick adds specific commit to branch', async () => {
    // Create branch with a specific commit
    execSync('git checkout -b history-source', { cwd: testRepo.path });

    // Create a file with content
    const fileName = 'history-file.txt';
    const filePath = path.join(testRepo.path, fileName);

    // Add file with content and commit
    fs.writeFileSync(filePath, 'Feature content for cherry-pick');
    execSync(`git add ${fileName}`, { cwd: testRepo.path });
    execSync('git commit -m "Add history file"', { cwd: testRepo.path });

    // Get the commit hash
    const commits = getLatestCommits(1);
    expect(commits.length).toBe(1);
    const commitHash = commits[0].hash;

    // Create target branch from main
    checkoutBranch('main');
    execSync('git checkout -b history-target', { cwd: testRepo.path });

    // The file shouldn't exist yet on the target branch
    expect(fs.existsSync(filePath)).toBe(false);

    // Cherry-pick the commit
    const result = cherryPickCommit(commitHash);
    expect(result.success).toBe(true);

    // The file should now exist in the target branch
    expect(fs.existsSync(filePath)).toBe(true);

    // Check the commit message mentions cherry pick
    const logOutput = execSync('git log -1', {
      cwd: testRepo.path,
      encoding: 'utf8'
    });
    expect(logOutput).toContain('cherry picked');
  });
});
