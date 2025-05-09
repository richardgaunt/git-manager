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
 * Sets up mock functions for @inquirer/prompts with predefined responses
 *
 * @param {Object} responses - Map of prompt messages to their responses
 */
export function setupInquirerPromptMocks(responses = {}) {
  // Import the module to mock
  jest.mock('@inquirer/prompts', () => {
    return {
      select: jest.fn(options => {
        const key = options.message;
        if (responses[key] !== undefined) {
          return Promise.resolve(responses[key]);
        }
        
        // Default to first choice if available
        if (options.choices && options.choices.length > 0) {
          return Promise.resolve(options.choices[0].value);
        }
        
        return Promise.resolve('mock-select-value');
      }),
      
      checkbox: jest.fn(options => {
        const key = options.message;
        if (responses[key] !== undefined) {
          return Promise.resolve(responses[key]);
        }
        return Promise.resolve([]);
      }),
      
      confirm: jest.fn(options => {
        const key = options.message;
        if (responses[key] !== undefined) {
          return Promise.resolve(responses[key]);
        }
        return Promise.resolve(options.default !== undefined ? options.default : true);
      }),
      
      input: jest.fn(options => {
        const key = options.message;
        if (responses[key] !== undefined) {
          return Promise.resolve(responses[key]);
        }
        return Promise.resolve(options.default || 'mock-input-value');
      }),
      
      search: jest.fn(options => {
        const key = options.message;
        if (responses[key] !== undefined) {
          return Promise.resolve(responses[key]);
        }
        
        // Try to get first item from source function
        if (typeof options.source === 'function') {
          const items = options.source('');
          if (items && items.length > 0) {
            return Promise.resolve(items[0]);
          }
        }
        
        return Promise.resolve('mock-search-result');
      })
    };
  });
}
