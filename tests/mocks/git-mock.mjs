// Mock implementation for git commands

// Mock responses for various git commands
export const gitMockResponses = {
  'rev-parse --is-inside-work-tree': 'true',
  'branch --show-current': 'feature-branch',
  'branch': '* feature-branch\n  develop\n  main',
  'branch -a': '* feature-branch\n  develop\n  main\n  remotes/origin/develop\n  remotes/origin/main',
  'status -s': ' M file.txt',
  'remote': 'origin\nupstream',
  'stash list': 'stash@{0}: WIP on feature-branch: 1234567 commit message',
  'ls-remote --heads origin main': '1234567890abcdef1234567890abcdef12345678 refs/heads/main'
};

// A utility function to mock execSync
export function mockExecSync(command, options = {}) {
  // Find the matching command in our mock responses
  const matchingCommand = Object.keys(gitMockResponses).find(cmd =>
    command === `git ${cmd}` || command.startsWith(`git ${cmd} `)
  );

  if (matchingCommand) {
    // If encoding is set to 'utf8', return the string, otherwise return a Buffer
    if (options.encoding === 'utf8') {
      return gitMockResponses[matchingCommand];
    }
    return Buffer.from(gitMockResponses[matchingCommand]);
  }

  // For commands we don't have explicit mocks for
  if (command.startsWith('git ')) {
    return options.encoding === 'utf8' ? 'Mock git command executed' : Buffer.from('Mock git command executed');
  }

  // For non-git commands or if we want to simulate a failure
  throw new Error(`Command not mocked: ${command}`);
}

// Mock implementation that throws errors for specific commands
export function mockExecSyncWithError(command, options = {}) {
  const error = new Error('Git command failed');
  error.status = 128;
  throw error;
}
