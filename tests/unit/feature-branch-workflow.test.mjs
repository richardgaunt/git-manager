import { describe, expect, jest } from '@jest/globals';
import { createGitWorkflowMock } from '../mocks/workflow-mock.mjs';

// This test only verifies the API calls used in the feature branch workflow
// Since we can't fully mock the module imports for branches-actions.mjs
describe('Feature Branch Creation API Usage', () => {
  const gitMocks = createGitWorkflowMock({
    currentBranch: 'main',
    branches: ['main', 'develop'],
    hasChanges: true
  });

  test('API functions required for feature branch creation', () => {
    // Verify that all required API functions for feature branch creation exist
    expect(typeof gitMocks.getCurrentBranch).toBe('function');
    expect(typeof gitMocks.getStatus).toBe('function');
    expect(typeof gitMocks.stashChanges).toBe('function');
    expect(typeof gitMocks.checkoutBranch).toBe('function');
    expect(typeof gitMocks.pullWithRebase).toBe('function');
    expect(typeof gitMocks.createBranch).toBe('function');
    expect(typeof gitMocks.toKebabCase).toBe('function');
    expect(typeof gitMocks.applyStash).toBe('function');
  });

  test('feature branch workflow mock simulates git operations correctly', () => {
    // Test stashing changes
    expect(gitMocks.getStatus()).not.toBe('');
    expect(gitMocks.stashChanges('Test stash')).toBe(true);
    expect(gitMocks.getStatus()).toBe('');

    // Test checkout and branch creation
    expect(gitMocks.checkoutBranch('develop')).toBe(true);
    expect(gitMocks.getCurrentBranch()).toBe('develop');

    expect(gitMocks.createBranch('feature/test-branch', 'develop')).toBe(true);
    expect(gitMocks.getCurrentBranch()).toBe('feature/test-branch');

    // Test applying stash
    expect(gitMocks.applyStash()).toBe(true);
    expect(gitMocks.getStatus()).not.toBe('');
  });

  test('toKebabCase handles various inputs correctly', () => {
    expect(gitMocks.toKebabCase('Hello World')).toBe('hello-world');
    expect(gitMocks.toKebabCase('JIRA-123')).toBe('jira-123');
    expect(gitMocks.toKebabCase('Some Feature Name')).toBe('some-feature-name');
  });
});
