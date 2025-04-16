import { describe, expect, test, jest } from '@jest/globals';
import { createGitWorkflowMock } from '../mocks/workflow-mock.mjs';

// This test verifies the API functions related to checkout branch workflows
describe('Checkout Branch Workflow API Usage', () => {
  const gitMocks = createGitWorkflowMock({
    currentBranch: 'main',
    branches: ['main', 'develop', 'feature/test'],
    hasChanges: true,
    remoteBranches: { main: true, develop: true, 'feature/test': true }
  });

  test('API functions required for checkout branch exist', () => {
    // Verify required functions exist for branch checkout
    expect(typeof gitMocks.getCurrentBranch).toBe('function');
    expect(typeof gitMocks.getAllBranches).toBe('function');
    expect(typeof gitMocks.getStatus).toBe('function');
    expect(typeof gitMocks.stashChanges).toBe('function');
    expect(typeof gitMocks.checkoutBranch).toBe('function');
    expect(typeof gitMocks.checkIfRemoteBranchExists).toBe('function');
    expect(typeof gitMocks.pullLatestChanges).toBe('function');
    expect(typeof gitMocks.applyStash).toBe('function');
  });

  test('checkout branch workflow handles stashing correctly', () => {
    // Verify we have changes initially
    expect(gitMocks.getStatus()).not.toBe('');

    // Stash changes
    expect(gitMocks.stashChanges('Auto stash')).toBe(true);
    expect(gitMocks.getStatus()).toBe('');

    // Checkout branch
    expect(gitMocks.checkoutBranch('feature/test')).toBe(true);
    expect(gitMocks.getCurrentBranch()).toBe('feature/test');

    // Apply stashed changes
    expect(gitMocks.applyStash()).toBe(true);
    expect(gitMocks.getStatus()).not.toBe('');
  });

  test('remote branch detection works correctly', () => {
    // Check for existing remote branches
    expect(gitMocks.checkIfRemoteBranchExists('main')).toBe(true);
    expect(gitMocks.checkIfRemoteBranchExists('develop')).toBe(true);

    // Check for local-only branch
    expect(gitMocks.checkIfRemoteBranchExists('local-only')).toBe(false);
  });

  test('branch selection can filter branches properly', () => {
    // Verify current branch is excluded from selection options
    const allBranches = gitMocks.getAllBranches();
    expect(allBranches).toContain('main');

    // Filter out current branch
    const filteredBranches = allBranches.filter(branch => branch !== gitMocks.getCurrentBranch());
    expect(filteredBranches).not.toContain(gitMocks.getCurrentBranch());

    // Verify we have other branches to select
    expect(filteredBranches.length).toBeGreaterThan(0);
  });
});
