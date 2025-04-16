/**
 * Mock for testing Git workflows
 * Provides utilities to simulate complete Git workflows
 */

import { jest } from '@jest/globals';

/**
 * Creates a mock Git repository state with specific branches and state
 * This helps test complex workflow functions that operate on Git state
 * 
 * @param {Object} state - Desired Git repository state
 * @param {string} state.currentBranch - Currently checked out branch
 * @param {string[]} state.branches - Available branches
 * @param {boolean} state.hasChanges - Whether there are uncommitted changes
 * @param {Object} state.remoteBranches - Map of branches available on remote (branch name → true/false)
 * @returns {Object} - Mock implementations for Git API functions
 */
export function createGitWorkflowMock(state = {}) {
  // Set default state
  const repoState = {
    currentBranch: 'main',
    branches: ['main', 'develop'],
    hasChanges: false,
    remoteBranches: { main: true, develop: true },
    mainBranch: 'main',
    ...state
  };
  
  // Stash simulation
  let stashed = false;
  
  // Return mock implementations for Git API functions
  return {
    getCurrentBranch: jest.fn(() => repoState.currentBranch),
    
    getLocalBranches: jest.fn(() => repoState.branches),
    
    getAllBranches: jest.fn(() => {
      // Combine local and remote branches without duplicates
      const allBranches = [...repoState.branches];
      
      Object.keys(repoState.remoteBranches).forEach(branch => {
        if (!allBranches.includes(branch)) {
          allBranches.push(branch);
        }
      });
      
      return allBranches;
    }),
    
    getStatus: jest.fn(() => {
      return repoState.hasChanges ? ' M file1.txt\n M file2.txt' : '';
    }),
    
    stashChanges: jest.fn(message => {
      if (repoState.hasChanges) {
        stashed = true;
        repoState.hasChanges = false;
        return true;
      }
      return false;
    }),
    
    applyStash: jest.fn(pop => {
      if (stashed) {
        stashed = !pop;
        repoState.hasChanges = true;
        return true;
      }
      throw new Error('No stash to apply');
    }),
    
    hasStashes: jest.fn(() => stashed),
    
    checkoutBranch: jest.fn(branchName => {
      if (repoState.branches.includes(branchName)) {
        repoState.currentBranch = branchName;
        return true;
      }
      throw new Error(`Branch ${branchName} does not exist`);
    }),
    
    createBranch: jest.fn((branchName, startPoint) => {
      repoState.branches.push(branchName);
      repoState.currentBranch = branchName;
      return true;
    }),
    
    pullWithRebase: jest.fn((remote, branch) => true),
    
    pullLatestChanges: jest.fn(() => 'Already up to date.'),
    
    checkIfRemoteBranchExists: jest.fn(branchName => {
      return !!repoState.remoteBranches[branchName];
    }),
    
    toKebabCase: jest.fn(text => {
      return text
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-');
    }),
    
    getMainBranch: jest.fn(() => repoState.mainBranch),
    
    // Add other necessary mocks as needed
    deleteLocalBranch: jest.fn((branch, force) => ({ success: true, message: `Branch ${branch} deleted successfully` })),
    listTags: jest.fn(() => ['1.0.0', '0.9.0', '0.8.0']),
    setUpstreamAndPush: jest.fn(() => ({ success: true })),
    mergeBranch: jest.fn(() => true),
    createTag: jest.fn(() => true),
    pushToRemote: jest.fn(() => true),
    deleteRemoteBranch: jest.fn(() => true)
  };
}

/**
 * Creates a mock for inquirer to simulate user input in workflows
 * 
 * @param {Object} responses - Responses for each prompt
 * @returns {Object} - Mock inquirer module
 */
export function createInquirerWorkflowMock(responses = {}) {
  return {
    prompt: jest.fn(questions => {
      const questionArray = Array.isArray(questions) ? questions : [questions];
      const result = {};
      
      questionArray.forEach(question => {
        const name = question.name;
        
        if (responses[name] !== undefined) {
          // Use provided response
          result[name] = responses[name];
        } else if (question.default !== undefined) {
          // Use default value
          result[name] = question.default;
        } else if (question.type === 'list' && question.choices && question.choices.length) {
          // For list type, use first option if no response provided
          result[name] = question.choices[0];
        } else if (question.type === 'checkbox') {
          // For checkbox, empty array if no response
          result[name] = [];
        } else if (question.type === 'confirm') {
          // Default confirmation to true
          result[name] = true;
        } else {
          // For other types, use a default value
          result[name] = 'mock-value';
        }
      });
      
      return Promise.resolve(result);
    }),
    
    registerPrompt: jest.fn()
  };
}