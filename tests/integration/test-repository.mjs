/**
 * Utilities for creating and managing test Git repositories
 * These utilities help set up realistic test repositories for integration testing
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

/**
 * Creates a temporary Git repository for testing
 *
 * @param {Object} options Configuration options
 * @param {boolean} options.withDevelop Whether to include a develop branch
 * @param {boolean} options.withFeature Whether to include a feature branch
 * @param {boolean} options.withRemote Whether to set up a remote repository simulation
 * @returns {Object} Repository information including paths and cleanup function
 */
export function createTestRepository(options = {}) {
  const {
    withDevelop = true,
    withFeature = false,
    withRemote = false
  } = options;

  // Create a temporary directory
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-manager-test-'));

  // Initialize git repository
  execSync('git init', { cwd: testDir });

  // Configure git identity for the test repository
  execSync('git config user.name "Test User"', { cwd: testDir });
  execSync('git config user.email "test@example.com"', { cwd: testDir });

  // Create initial commit on main branch
  fs.writeFileSync(path.join(testDir, 'README.md'), '# Test Repository\n');
  execSync('git add README.md', { cwd: testDir });
  execSync('git commit -m "Initial commit"', { cwd: testDir });

  // Ensure we're using main branch (newer git defaults to main, older to master)
  try {
    execSync('git branch -m master main', { cwd: testDir, stdio: 'ignore' });
  } catch (e) {
    // Branch already named main, ignore error
  }

  // Create develop branch if requested
  if (withDevelop) {
    execSync('git checkout -b develop', { cwd: testDir });
    fs.writeFileSync(path.join(testDir, 'develop.md'), '# Develop Branch\n');
    execSync('git add develop.md', { cwd: testDir });
    execSync('git commit -m "Add develop file"', { cwd: testDir });
  }

  // Create feature branch if requested
  if (withFeature) {
    execSync('git checkout -b feature/test-feature', { cwd: testDir });
    fs.writeFileSync(path.join(testDir, 'feature.md'), '# Feature Branch\n');
    execSync('git add feature.md', { cwd: testDir });
    execSync('git commit -m "Add feature file"', { cwd: testDir });
  }

  // Set up remote simulation if requested
  let remoteDir;
  if (withRemote) {
    // Create a bare repository to act as a remote
    remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-manager-remote-'));
    execSync('git init --bare', { cwd: remoteDir });

    // Add the remote to the test repository
    execSync(`git remote add origin ${remoteDir}`, { cwd: testDir });

    // Push branches to remote
    execSync('git push -u origin main', { cwd: testDir });
    if (withDevelop) {
      execSync('git push -u origin develop', { cwd: testDir });
    }
    if (withFeature) {
      execSync('git push -u origin feature/test-feature', { cwd: testDir });
    }
  }

  // Return to main branch
  execSync('git checkout main', { cwd: testDir });

  // Return repository information and cleanup function
  return {
    path: testDir,
    remotePath: remoteDir,
    cleanup: () => {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
        if (remoteDir) {
          fs.rmSync(remoteDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.error('Error cleaning up test repositories:', error);
      }
    }
  };
}

/**
 * Creates a file with changes in the repository
 *
 * @param {string} repoPath Path to the repository
 * @param {string} fileName Name of the file to create or modify
 * @param {string} content Content to write to the file
 * @param {boolean} stage Whether to stage the changes
 * @returns {void}
 */
export function createFileWithChanges(repoPath, fileName, content, stage = false) {
  fs.writeFileSync(path.join(repoPath, fileName), content);
  if (stage) {
    execSync(`git add ${fileName}`, { cwd: repoPath });
  }
}

/**
 * Gets the current branch name in a repository
 *
 * @param {string} repoPath Path to the repository
 * @returns {string} Current branch name
 */
export function getCurrentBranch(repoPath) {
  return execSync('git branch --show-current', {
    cwd: repoPath,
    encoding: 'utf8'
  }).trim();
}

/**
 * Gets the status of a repository
 *
 * @param {string} repoPath Path to the repository
 * @returns {string} Git status output
 */
export function getRepoStatus(repoPath) {
  return execSync('git status -s', {
    cwd: repoPath,
    encoding: 'utf8'
  });
}

/**
 * Lists branches in a repository
 *
 * @param {string} repoPath Path to the repository
 * @param {boolean} includeRemote Whether to include remote branches
 * @returns {string[]} Array of branch names
 */
export function listBranches(repoPath, includeRemote = false) {
  const command = includeRemote ? 'git branch -a' : 'git branch';
  const output = execSync(command, {
    cwd: repoPath,
    encoding: 'utf8'
  });

  return output
    .split('\n')
    .filter(Boolean)
    .map(branch => branch.replace(/^\*?\s*remotes\/origin\//, '').replace(/^\*?\s*/, '').trim())
    .filter(branch => !branch.includes('HEAD ->'))
    .filter((branch, index, self) => self.indexOf(branch) === index);
}
