/**
 * Enhanced test repository utilities for git-manager commands
 * This file provides helpers to test command integrations with remote repositories
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createTestRepository } from './test-repository.mjs';
import { jest } from '@jest/globals';
import * as inquirerPrompts from '@inquirer/prompts';

/**
 * Creates a test repository configured to work with git-manager commands
 * Provides helpers to test the command implementations
 * 
 * @param {Object} options Configuration options
 * @param {boolean} options.withDevelop Whether to include a develop branch
 * @param {boolean} options.withFeature Whether to include a feature branch
 * @param {boolean} options.withRemote Whether to set up a remote repository simulation
 * @returns {Object} Repository information and command testing helpers
 */
export function createTestRepositoryForCommands(options = {}) {
  // Create standard test repository
  const testRepo = createTestRepository(options);
  const originalCwd = process.cwd();
  
  // Change to test repository directory to allow commands to work
  process.chdir(testRepo.path);
  
  // Set up test mode environment variable
  process.env.GIT_MANAGER_TEST = 'true';
  process.env.GIT_MANAGER_NON_INTERACTIVE = 'true';
  
  // Mock inquirer prompts for non-interactive testing
  jest.spyOn(inquirerPrompts, 'input').mockImplementation(async () => 'test-value');
  jest.spyOn(inquirerPrompts, 'select').mockImplementation(async () => 'main');
  jest.spyOn(inquirerPrompts, 'checkbox').mockImplementation(async () => []);
  jest.spyOn(inquirerPrompts, 'confirm').mockImplementation(async () => true);
  jest.spyOn(inquirerPrompts, 'search').mockImplementation(async () => 'main');
  
  // Return enhanced repository object with command testing helpers
  return {
    ...testRepo,
    path: testRepo.path,
    remotePath: testRepo.remotePath,
    
    /**
     * Creates a feature branch using git-manager command
     * @param {string} issueKey The issue key for the branch (e.g., 'JIRA-123')
     * @param {string} branchName The descriptive branch name
     * @returns {string} The created branch name
     */
    async createFeatureBranch(issueKey = 'TEST-123', branchName = 'test-feature') {
      // Set up mocks for the inquirer prompts
      inquirerPrompts.input.mockReset();
      
      // Mock the two input calls for the createFeatureBranch function
      inquirerPrompts.input
        .mockResolvedValueOnce(issueKey)
        .mockResolvedValueOnce(branchName);
      
      // Import and run the command function
      const { createFeatureBranch } = await import('../../commands/branches-actions.mjs');
      await createFeatureBranch();
      
      // Return the expected branch name
      return `feature/${issueKey.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-')}-${branchName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-')}`;
    },
    
    /**
     * Create a release branch using git-manager command
     * @param {string} tagName The release tag name
     * @returns {string} The created branch name
     */
    async createReleaseBranch(tagName = '1.0.0') {
      // Set up mocks for the inquirer prompts
      inquirerPrompts.input.mockReset();
      inquirerPrompts.input.mockResolvedValue(tagName);
      
      // Import and run the command function
      const { createReleaseBranch } = await import('../../commands/branches-actions.mjs');
      await createReleaseBranch();
      
      // Return the expected branch name
      return `release/${tagName}`;
    },
    
    /**
     * Create a hotfix branch using git-manager command
     * @param {string} tagName The hotfix tag name
     * @returns {string} The created branch name
     */
    async createHotfix(tagName = '1.0.1') {
      // Set up mocks for the inquirer prompts
      inquirerPrompts.input.mockReset();
      inquirerPrompts.input.mockResolvedValue(tagName);
      
      // Import and run the command function
      const { createHotfix } = await import('../../commands/branches-actions.mjs');
      await createHotfix();
      
      // Return the expected branch name
      return `hotfix/${tagName}`;
    },
    
    /**
     * Checkout branch using git-manager command
     * @param {string} branchName The branch to checkout
     */
    async checkoutBranch(branchName) {
      // Set up mocks for the inquirer prompts
      inquirerPrompts.search.mockReset();
      inquirerPrompts.search.mockResolvedValue(branchName);
      
      // Import and run the command function
      const { checkoutBranchAndUpdate } = await import('../../commands/branches-actions.mjs');
      await checkoutBranchAndUpdate();
    },
    
    /**
     * Finish a release or hotfix branch using git-manager command
     * @param {string} type 'release' or 'hotfix'
     * @param {string} branchName The branch to finish
     * @param {boolean} createTag Whether to create a tag
     */
    async finishBranchCommand(type, branchName, createTag = true) {
      // Set up mocks for the inquirer prompts
      inquirerPrompts.select.mockReset();
      inquirerPrompts.select.mockResolvedValue(branchName);
      
      inquirerPrompts.confirm.mockReset();
      inquirerPrompts.confirm
        .mockResolvedValueOnce(true) // Confirm finish
        .mockResolvedValueOnce(createTag); // Confirm tag creation
      
      inquirerPrompts.input.mockReset();
      if (createTag) {
        // Mock the tag name input
        inquirerPrompts.input.mockResolvedValue(branchName.replace(/^(release|hotfix)\//, ''));
      }
      
      // Import and run the appropriate command function
      if (type === 'release') {
        const { finishRelease } = await import('../../commands/branches-actions.mjs');
        await finishRelease();
      } else if (type === 'hotfix') {
        const { finishHotfix } = await import('../../commands/branches-actions.mjs');
        await finishHotfix();
      }
    },
    
    /**
     * Delete local branches using git-manager command
     * @param {string[]} branches Array of branch names to delete
     */
    async deleteBranches(branches) {
      // Set up mocks for the inquirer prompts
      inquirerPrompts.checkbox.mockReset();
      inquirerPrompts.checkbox.mockResolvedValue(branches);
      
      inquirerPrompts.confirm.mockReset();
      inquirerPrompts.confirm.mockResolvedValue(true);
      
      // Import and run the command function
      const { branchesActions } = await import('../../commands/branches-actions.mjs');
      await branchesActions();
    },
    
    /**
     * Clean up repository and restore environment
     */
    cleanup() {
      // Restore original working directory
      process.chdir(originalCwd);
      
      // Clean up test environment variables
      delete process.env.GIT_MANAGER_TEST;
      delete process.env.GIT_MANAGER_NON_INTERACTIVE;
      
      // Clean up test repositories
      testRepo.cleanup();
      
      // No need to restore mocks, Jest will handle that
    }
  };
}