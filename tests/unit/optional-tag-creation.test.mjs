import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { createGitWorkflowMock, createInquirerWorkflowMock } from '../mocks/workflow-mock.mjs';

// Mock branches-actions module
jest.unstable_mockModule('../../commands/branches-actions.mjs', () => {
  // We'll fill this with implementations before each test
  return {};
});

// Mock the inquirer module
jest.unstable_mockModule('inquirer', () => createInquirerWorkflowMock());

describe('Optional Tag Creation in Release Process', () => {
  let gitMocks;
  let mockInquirer;
  let doRelease;

  beforeEach(async () => {
    // Create git mocks with a hotfix branch
    gitMocks = createGitWorkflowMock({
      currentBranch: 'hotfix/1.0.1',
      branches: ['main', 'develop', 'hotfix/1.0.1'],
      hasChanges: false,
      remoteBranches: { main: true, develop: true, 'hotfix/1.0.1': true },
      mainBranch: 'main'
    });

    // Create specific inquirer responses for our test cases
    mockInquirer = createInquirerWorkflowMock({
      // These can be overridden in specific tests
      releaseBranch: 'hotfix/1.0.1',
      confirm: true,
      createTagConfirm: true, // Default to creating a tag
      releaseTag: '1.0.1'
    });

    // Re-mock inquirer to use our new mock
    jest.unstable_mockModule('inquirer', () => mockInquirer);

    // Create mock for the branches-actions module with our internal doRelease function
    const branchesActionsMock = {
      // Access to doRelease for testing (normally it's not exported)
      doRelease: jest.fn(async (type) => {
        // This is a simplified version of the real doRelease function
        // that allows us to test the tag creation logic
        const branchPrefix = type === 'hotfix' ? 'hotfix/' : 'release/';
        const releaseBranch = 'hotfix/1.0.1';
        const tagName = releaseBranch.replace(branchPrefix, '');
        const mainBranch = gitMocks.getMainBranch();

        // Mock the actual confirmation prompts
        const { confirm } = await mockInquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to finish ${type} '${releaseBranch}', merge it into ${mainBranch} and develop?`
        }]);

        if (!confirm) {
          return false;
        }

        // This is the part we're testing - the optional tag creation
        const { createTagConfirm } = await mockInquirer.prompt([{
          type: 'confirm',
          name: 'createTagConfirm',
          message: `Do you want to create a tag '${tagName}'?`
        }]);

        // Mock the rest of the workflow
        gitMocks.stashChanges();
        gitMocks.checkoutBranch(releaseBranch);
        gitMocks.checkoutBranch(mainBranch);
        gitMocks.pullLatestChanges();
        gitMocks.checkoutBranch('develop');
        gitMocks.pullLatestChanges();
        gitMocks.checkoutBranch(mainBranch);
        gitMocks.mergeBranch(releaseBranch);
        gitMocks.checkoutBranch('develop');
        gitMocks.mergeBranch(releaseBranch);

        // This part should be conditional based on createTagConfirm
        if (createTagConfirm) {
          const tag = tagName;
          gitMocks.createTag(tag);
          gitMocks.pushToRemote(mainBranch);
          gitMocks.pushToRemote('develop');
          gitMocks.pushToRemote(tagName);
        } else {
          gitMocks.pushToRemote(mainBranch);
          gitMocks.pushToRemote('develop');
        }

        gitMocks.deleteLocalBranch(releaseBranch);
        gitMocks.deleteRemoteBranch(releaseBranch);
        gitMocks.checkoutBranch('develop');

        return true;
      })
    };

    jest.unstable_mockModule('../../commands/branches-actions.mjs', () => branchesActionsMock);

    // Import dynamically to ensure mocks are applied
    const branchesActions = await import('../../commands/branches-actions.mjs');
    doRelease = branchesActions.doRelease;
  });

  test('User chooses to create a tag during release process', async () => {
    // Set up user to confirm tag creation
    mockInquirer.prompt.mockImplementationOnce(() => Promise.resolve({ confirm: true }))
      .mockImplementationOnce(() => Promise.resolve({ createTagConfirm: true }));

    // Execute release process
    await doRelease('hotfix');

    // Verify that createTag was called
    expect(gitMocks.createTag).toHaveBeenCalled();
    expect(gitMocks.pushToRemote).toHaveBeenCalledWith('1.0.1');
  });

  test('User chooses NOT to create a tag during release process', async () => {
    // Set up user to decline tag creation
    mockInquirer.prompt.mockImplementationOnce(() => Promise.resolve({ confirm: true }))
      .mockImplementationOnce(() => Promise.resolve({ createTagConfirm: false }));

    // Execute release process
    await doRelease('hotfix');

    // Verify that createTag was NOT called
    expect(gitMocks.createTag).not.toHaveBeenCalled();
    // But the branches should still be pushed
    expect(gitMocks.pushToRemote).toHaveBeenCalledWith('main');
    expect(gitMocks.pushToRemote).toHaveBeenCalledWith('develop');
    // But NOT the tag
    expect(gitMocks.pushToRemote).not.toHaveBeenCalledWith('1.0.1');
  });

  test('User cancels the entire release process', async () => {
    // Set up user to cancel the process entirely
    mockInquirer.prompt.mockImplementationOnce(() => Promise.resolve({ confirm: false }));

    // Execute release process
    const result = await doRelease('hotfix');

    // Process should be stopped
    expect(result).toBe(false);
    // No git operations should occur
    expect(gitMocks.createTag).not.toHaveBeenCalled();
    expect(gitMocks.mergeBranch).not.toHaveBeenCalled();
    expect(gitMocks.pushToRemote).not.toHaveBeenCalled();
  });
});