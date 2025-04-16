import { describe, expect, test, jest } from '@jest/globals';
import { createGitWorkflowMock } from '../mocks/workflow-mock.mjs';

// This test verifies the API functions used in hotfix workflows
describe('Hotfix Workflow API Usage', () => {
  const gitMocks = createGitWorkflowMock({
    currentBranch: 'develop',
    branches: ['main', 'develop'],
    hasChanges: false,
    remoteBranches: { main: true, develop: true },
    mainBranch: 'main'
  });
  
  test('API functions required for hotfix creation exist', () => {
    // Verify required functions exist for hotfix creation
    expect(typeof gitMocks.getMainBranch).toBe('function');
    expect(typeof gitMocks.getCurrentBranch).toBe('function');
    expect(typeof gitMocks.checkoutBranch).toBe('function');
    expect(typeof gitMocks.pullWithRebase).toBe('function');
    expect(typeof gitMocks.createBranch).toBe('function');
    expect(typeof gitMocks.getAllBranches).toBe('function');
    expect(typeof gitMocks.getStatus).toBe('function');
    expect(typeof gitMocks.stashChanges).toBe('function');
  });
  
  test('API functions required for finishing hotfix exist', () => {
    // Verify functions needed for finishing a hotfix
    expect(typeof gitMocks.mergeBranch).toBe('function');
    expect(typeof gitMocks.listTags).toBe('function');
    expect(typeof gitMocks.createTag).toBe('function');
    expect(typeof gitMocks.pushToRemote).toBe('function');
    expect(typeof gitMocks.deleteLocalBranch).toBe('function');
    expect(typeof gitMocks.deleteRemoteBranch).toBe('function');
  });
  
  test('hotfix workflow mock simulates git operations correctly', () => {
    // Test checking out main branch
    expect(gitMocks.getMainBranch()).toBe('main');
    expect(gitMocks.checkoutBranch('main')).toBe(true);
    expect(gitMocks.getCurrentBranch()).toBe('main');
    
    // Test creating hotfix branch
    expect(gitMocks.createBranch('hotfix/1.0.1', 'main')).toBe(true);
    expect(gitMocks.getCurrentBranch()).toBe('hotfix/1.0.1');
    expect(gitMocks.getAllBranches()).toContain('hotfix/1.0.1');
    
    // Test merging hotfix back to main
    expect(gitMocks.checkoutBranch('main')).toBe(true);
    expect(gitMocks.mergeBranch('hotfix/1.0.1')).toBe(true);
    
    // Test branch deletion after hotfix
    expect(gitMocks.deleteLocalBranch('hotfix/1.0.1').success).toBe(true);
  });
  
  test('listTags provides version information', () => {
    const tags = gitMocks.listTags();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
    // Verify tags follow semver format
    expect(tags[0]).toMatch(/^\d+\.\d+\.\d+$/);
  });
});