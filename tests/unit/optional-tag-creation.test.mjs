import { describe, expect, test, jest } from '@jest/globals';
import { createGitWorkflowMock } from '../mocks/workflow-mock.mjs';

// Mock the console.log to avoid output during tests
jest.spyOn(console, 'log').mockImplementation();

// Mock chalk to avoid color output during tests
jest.mock('chalk', () => ({
  blue: jest.fn(text => text),
  yellow: jest.fn(text => text),
  green: jest.fn(text => text),
  red: jest.fn(text => text)
}));

describe('Optional Tag Creation in Hotfix Process', () => {
  // Test if our mock correctly simulates the tag creation behavior
  test('Mock release process handles tag creation correctly', () => {
    // Create mock Git workflow with a hotfix branch
    const gitMocks = createGitWorkflowMock({
      currentBranch: 'hotfix/1.0.1',
      branches: ['main', 'develop', 'hotfix/1.0.1'],
      mainBranch: 'main'
    });

    // Simulate "Yes" to tag creation
    const result = simulateBranchWorkflow(gitMocks, true);
    
    // Verify tag was created and pushed
    expect(gitMocks.createTag).toHaveBeenCalled();
    expect(gitMocks.pushToRemote).toHaveBeenCalledWith('1.0.1');
    expect(result.success).toBe(true);
  });

  test('Mock release process skips tag creation when user chooses not to create a tag', () => {
    // Create mock Git workflow with a hotfix branch
    const gitMocks = createGitWorkflowMock({
      currentBranch: 'hotfix/1.0.1',
      branches: ['main', 'develop', 'hotfix/1.0.1'],
      mainBranch: 'main'
    });

    // Simulate "No" to tag creation
    const result = simulateBranchWorkflow(gitMocks, false);
    
    // Verify tag was NOT created
    expect(gitMocks.createTag).not.toHaveBeenCalled();
    
    // Verify branches were still pushed
    expect(gitMocks.pushToRemote).toHaveBeenCalledWith('main');
    expect(gitMocks.pushToRemote).toHaveBeenCalledWith('develop');
    
    // Verify tag was NOT pushed by examining all calls to pushToRemote
    const pushCalls = gitMocks.pushToRemote.mock.calls.map(call => call[0]);
    expect(pushCalls).not.toContain('1.0.1');
    
    // Verify overall success
    expect(result.success).toBe(true);
  });
});

/**
 * Simulate the hotfix/release branch workflow with tag creation choice
 * 
 * @param {Object} gitMocks - Git mock functions
 * @param {boolean} createTag - Whether to create a tag
 * @returns {Object} Result of the workflow
 */
function simulateBranchWorkflow(gitMocks, createTag) {
  try {
    // Merge the branch
    gitMocks.mergeBranch('hotfix/1.0.1');
    
    // Conditionally create and push tag based on user choice
    if (createTag) {
      gitMocks.createTag('1.0.1');
      gitMocks.pushToRemote('main');
      gitMocks.pushToRemote('develop');
      gitMocks.pushToRemote('1.0.1');
    } else {
      gitMocks.pushToRemote('main');
      gitMocks.pushToRemote('develop');
    }
    
    // Clean up
    gitMocks.deleteLocalBranch('hotfix/1.0.1');
    gitMocks.deleteRemoteBranch('hotfix/1.0.1');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}