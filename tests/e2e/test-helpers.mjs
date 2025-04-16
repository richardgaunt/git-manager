/**
 * Helpers for end-to-end testing of git-manager
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createTestRepository } from '../integration/test-repository.mjs';

/**
 * Runs git-manager with the specified command line options
 * 
 * @param {string} command Command to run
 * @param {Object} options Configuration options
 * @param {string} options.cwd Working directory
 * @param {string} options.input Input to pass to process (simulates user input)
 * @param {boolean} options.expectError Whether to expect an error result
 * @returns {Object} Result object with success, output, and error properties
 */
export function runGitManager(command, options = {}) {
  const {
    cwd = process.cwd(),
    input = '',
    expectError = false
  } = options;
  
  // Find the git-manager script using the process working directory
  // ES modules don't have __dirname, so we need to use import.meta.url
  const currentFilePath = new URL(import.meta.url).pathname;
  const testsPath = path.dirname(path.dirname(currentFilePath));
  const scriptPath = path.resolve(testsPath, '../index.mjs');
  
  // Build command to execute
  const cmd = `node ${scriptPath} ${command || ''}`;
  
  try {
    // Run git-manager
    const output = execSync(cmd, {
      cwd,
      input,
      encoding: 'utf8',
      stdio: input ? ['pipe', 'pipe', 'pipe'] : 'pipe',
      env: {
        ...process.env,
        GIT_MANAGER_TEST: 'true', // Indicate we're in test mode
        // Suppress color output in tests
        FORCE_COLOR: '0',
        NO_COLOR: '1'
      }
    });
    
    if (expectError) {
      return {
        success: false,
        output,
        error: 'Expected error but command succeeded'
      };
    }
    
    return {
      success: true,
      output
    };
  } catch (error) {
    if (expectError) {
      return {
        success: true,
        error: error.message,
        output: error.stdout || ''
      };
    }
    
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message
    };
  }
}

/**
 * Creates a test environment with git repository
 * 
 * @param {Object} options Repository options
 * @returns {Object} Test environment object with repo path and cleanup function
 */
export function createTestEnvironment(options = {}) {
  // Create test repository
  const testRepo = createTestRepository(options);
  
  // Save original working directory
  const originalCwd = process.cwd();
  
  // Change to test repository
  process.chdir(testRepo.path);
  
  // Return test environment object
  return {
    repoPath: testRepo.path,
    remotePath: testRepo.remotePath,
    cleanup: () => {
      // Restore original working directory
      process.chdir(originalCwd);
      
      // Clean up test repository
      testRepo.cleanup();
    }
  };
}

/**
 * Gets the current git status as parsed object
 * 
 * @param {string} repoPath Repository path
 * @returns {Object} Git status object
 */
export function getGitStatus(repoPath) {
  const output = execSync('git status -s', {
    cwd: repoPath,
    encoding: 'utf8'
  });
  
  const modifiedFiles = [];
  const untrackedFiles = [];
  
  // Parse status output
  output.split('\n').filter(Boolean).forEach(line => {
    // First two characters indicate the status
    const status = line.substring(0, 2);
    const file = line.substring(3);
    
    if (status.includes('M') || status.includes('A') || status.includes('D')) {
      modifiedFiles.push(file);
    } else if (status.includes('?')) {
      untrackedFiles.push(file);
    }
  });
  
  return {
    modified: modifiedFiles,
    untracked: untrackedFiles,
    clean: modifiedFiles.length === 0 && untrackedFiles.length === 0,
    hasChanges: modifiedFiles.length > 0 || untrackedFiles.length > 0
  };
}

/**
 * Gets the current branch name
 * 
 * @param {string} repoPath Repository path
 * @returns {string} Current branch name
 */
export function getCurrentBranch(repoPath) {
  return execSync('git branch --show-current', {
    cwd: repoPath,
    encoding: 'utf8'
  }).trim();
}

/**
 * Gets all branches
 * 
 * @param {string} repoPath Repository path
 * @param {boolean} includeRemote Whether to include remote branches
 * @returns {string[]} Array of branch names
 */
export function getBranches(repoPath, includeRemote = false) {
  const cmd = includeRemote ? 'git branch -a' : 'git branch';
  
  return execSync(cmd, {
    cwd: repoPath,
    encoding: 'utf8'
  })
    .split('\n')
    .filter(Boolean)
    .map(branch => branch.replace(/^\*?\s*/, '').trim());
}

/**
 * Creates a file with content in the repository
 * 
 * @param {string} repoPath Repository path
 * @param {string} filePath File path relative to repository root
 * @param {string} content File content
 * @param {boolean} stage Whether to stage the file
 */
export function createFile(repoPath, filePath, content, stage = false) {
  const fullPath = path.join(repoPath, filePath);
  fs.writeFileSync(fullPath, content);
  
  if (stage) {
    execSync(`git add "${filePath}"`, { cwd: repoPath });
  }
}

/**
 * Gets stash list
 * 
 * @param {string} repoPath Repository path
 * @returns {string[]} Stash list
 */
export function getStashList(repoPath) {
  try {
    const output = execSync('git stash list', {
      cwd: repoPath,
      encoding: 'utf8'
    });
    
    return output.split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}