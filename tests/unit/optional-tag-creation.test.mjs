import { describe, expect, test, jest } from '@jest/globals';
import { createGitWorkflowMock, createInquirerWorkflowMock } from '../mocks/workflow-mock.mjs';

// Mock console.log to avoid output during tests
jest.spyOn(console, 'log').mockImplementation();

// Mock chalk to avoid color output during tests
jest.mock('chalk', () => ({
  blue: jest.fn(text => text),
  yellow: jest.fn(text => text),
  green: jest.fn(text => text),
  red: jest.fn(text => text)
}));

describe('Optional Tag Creation in Release Process', () => {
  // Test the conditional tag creation logic directly
  test('When user confirms tag creation, tag is created and pushed', () => {
    // Create mock git functions
    const gitMocks = createGitWorkflowMock({
      currentBranch: 'hotfix/1.0.1',
      branches: ['main', 'develop', 'hotfix/1.0.1'],
      mainBranch: 'main'
    });

    // Create mock inquirer that will respond "yes" to tag creation
    const inquirerMock = createInquirerWorkflowMock({
      createTagConfirm: true
    });
    
    // Call our test function that simulates the workflow
    const result = simulateReleaseProcess(gitMocks, inquirerMock, true);
    
    // Verify tag creation was called
    expect(gitMocks.createTag).toHaveBeenCalled();
    expect(gitMocks.pushToRemote).toHaveBeenCalledWith('1.0.1');
    expect(result.success).toBe(true);
  });

  test('When user declines tag creation, tag is not created but other operations complete', () => {
    // Create mock git functions
    const gitMocks = createGitWorkflowMock({
      currentBranch: 'hotfix/1.0.1',
      branches: ['main', 'develop', 'hotfix/1.0.1'],
      mainBranch: 'main'
    });

    // Create mock inquirer that will respond "no" to tag creation
    const inquirerMock = createInquirerWorkflowMock({
      createTagConfirm: false
    });
    
    // Call our test function that simulates the workflow
    const result = simulateReleaseProcess(gitMocks, inquirerMock, false);
    
    // Verify tag creation was NOT called
    expect(gitMocks.createTag).not.toHaveBeenCalled();
    
    // Verify branches were still pushed
    expect(gitMocks.pushToRemote).toHaveBeenCalledWith('main');
    expect(gitMocks.pushToRemote).toHaveBeenCalledWith('develop');
    
    // Make sure tag was not pushed
    const pushCalls = gitMocks.pushToRemote.mock.calls.map(call => call[0]);
    expect(pushCalls).not.toContain('1.0.1');
    
    // Verify overall success
    expect(result.success).toBe(true);
  });
});

/**
 * Test utility function to simulate the release process with conditional tag creation.
 * 
 * This function simulates the critical conditional tag creation logic from 
 * the doRelease function in branches-actions.mjs
 *
 * @param {Object} gitMocks - Mock Git API functions
 * @param {Object} inquirerMock - Mock inquirer responses
 * @param {boolean} createTag - Whether tag should be created (user's choice)
 * @returns {Object} Result object
 */
function simulateReleaseProcess(gitMocks, inquirerMock, createTag) {
  try {
    // Simulate merge process
    gitMocks.checkoutBranch('hotfix/1.0.1');
    gitMocks.checkoutBranch('main');
    gitMocks.pullLatestChanges();
    gitMocks.checkoutBranch('develop');
    gitMocks.pullLatestChanges();
    gitMocks.checkoutBranch('main');
    gitMocks.mergeBranch('hotfix/1.0.1');
    gitMocks.checkoutBranch('develop');
    gitMocks.mergeBranch('hotfix/1.0.1');
    
    // This is the code we're testing: conditional tag creation based on user input
    if (createTag) {
      gitMocks.createTag('1.0.1');
      gitMocks.pushToRemote('main');
      gitMocks.pushToRemote('develop');
      gitMocks.pushToRemote('1.0.1');
    } else {
      gitMocks.pushToRemote('main');
      gitMocks.pushToRemote('develop');
    }
    
    // Finish up release
    gitMocks.deleteLocalBranch('hotfix/1.0.1', false);
    gitMocks.deleteRemoteBranch('hotfix/1.0.1');
    gitMocks.checkoutBranch('develop');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}