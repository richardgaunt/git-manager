// api.mjs - Common git operations

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Check if the current directory is a Git repository
 * @returns {boolean} True if it's a Git repository
 */
export function isGitRepository() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the current directory.
 * @returns {string} Current directory path.
 */
export function getCurrentDirectory() {
  try {
    return execSync('pwd', { encoding: 'utf8' }).trim();
  }
  catch (error) {
    throw new Error('Failed to get current directory: ' + error.message);
  }
}

/**
 * Get the current branch name
 * @returns {string} Current branch name
 */
export function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error('Failed to get current branch: ' + error.message);
  }
}

/**
 * Get all local branches
 * @returns {string[]} Array of branch names
 */
export function getLocalBranches() {
  try {
    const output = execSync('git branch', { encoding: 'utf8' });
    return output
      .split('\n')
      .filter(Boolean)
      .map(branch => branch.replace(/^\*?\s*/, '').trim());
  } catch (error) {
    throw new Error('Failed to get local branches: ' + error.message);
  }
}

/**
 * Delete a local branch
 * @param {string} branchName Branch to delete
 * @param {boolean} force Whether to force deletion
 * @returns {object} Result of the operation
 */
export function deleteLocalBranch(branchName, force = false) {
  try {
    const flag = force ? '-D' : '-d';
    execSync(`git branch ${flag} ${branchName}`, { encoding: 'utf8' });
    return { success: true, message: `Branch ${branchName} deleted successfully` };
  } catch (error) {
    return {
      success: false,
      message: `Failed to delete branch ${branchName}: ${error.message}`,
      requireForce: !force && error.message.includes('not fully merged')
    };
  }
}

/**
 * Get remote repositories
 * @returns {string[]} Array of remote names
 */
export function getRemotes() {
  try {
    const output = execSync('git remote', { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    throw new Error('Failed to get remotes: ' + error.message);
  }
}

/**
 * Execute generic git command and return its output
 * @param {string} command Git command to execute
 * @returns {string} Command output
 */
export function executeGitCommand(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf8' });
  } catch (error) {
    throw new Error(`Failed to execute 'git ${command}': ${error.message}`);
  }
}

/**
 * Get working directory status (changes)
 * @returns {string} Git status output
 */
export function getStatus() {
  try {
    return execSync('git status -s', { encoding: 'utf8' });
  } catch (error) {
    throw new Error('Failed to get status: ' + error.message);
  }
}

/**
 * Stash current changes
 * @param {string} message Optional stash message
 * @returns {boolean} True if changes were stashed
 */
export function stashChanges(message = 'Auto stash before creating feature branch') {
  try {
    // Check if there are changes to stash
    const status = getStatus();
    if (!status.trim()) {
      return false; // Nothing to stash
    }

    execSync(`git stash save "${message}"`, { encoding: 'utf8' });
    return true;
  } catch (error) {
    throw new Error('Failed to stash changes: ' + error.message);
  }
}

/**
 * Apply most recent stash
 * @param {boolean} pop Whether to pop or apply (remove or keep the stash)
 * @returns {boolean} True if stash was applied
 */
export function applyStash(pop = true) {
  try {
    const command = pop ? 'git stash pop' : 'git stash apply';
    execSync(command, { encoding: 'utf8' });
    return true;
  } catch (error) {
    throw new Error('Failed to apply stash: ' + error.message);
  }
}

/**
 * Check if there are any stashes
 * @returns {boolean} True if there are stashes
 */
export function hasStashes() {
  try {
    const output = execSync('git stash list', { encoding: 'utf8' });
    return output.trim().length > 0;
  } catch (error) {
    throw new Error('Failed to check stashes: ' + error.message);
  }
}

/**
 * Checkout a branch
 * @param {string} branchName Branch to checkout.
 * @returns {boolean} True if checkout was successful
 */
export function checkoutBranch(branchName) {
  try {
    execSync(`git checkout ${branchName}`, { encoding: 'utf8' });
    return true;
  } catch (error) {
    throw new Error(`Failed to checkout branch ${branchName}: ${error.message}`);
  }
}

/**
 * Pull with rebase from remote
 * @param {string} remote Remote name
 * @param {string} branch Branch name
 * @returns {boolean} True if pull was successful
 */
export function pullWithRebase(remote = 'origin', branch = null) {
  try {
    const branchArg = branch ? ` ${branch}` : '';
    execSync(`git pull --rebase ${remote}${branchArg}`, { encoding: 'utf8' });
    return true;
  } catch (error) {
    throw new Error(`Failed to pull with rebase: ${error.message}`);
  }
}

/**
 * Create a new branch
 * @param {string} branchName Name for the new branch
 * @param {string} startPoint Branch to create from (default: current HEAD)
 * @returns {boolean} True if branch was created
 */
export function createBranch(branchName, startPoint = null) {
  try {
    const startPointArg = startPoint ? ` ${startPoint}` : '';
    execSync(`git checkout -b ${branchName}${startPointArg}`, { encoding: 'utf8' });
    return true;
  } catch (error) {
    throw new Error(`Failed to create branch ${branchName}: ${error.message}`);
  }
}

/**
 * Convert a string to kebab-case
 * @param {string} text Input text
 * @returns {string} Kebab-cased text
 */
export function toKebabCase(text) {
  return text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphen
      .replace(/[\s_]+/g, '-'); // Replace spaces and underscores with hyphens
}
