import { describe, expect, test, jest, beforeEach } from '@jest/globals';

// Mock Commander for testing command registration
jest.unstable_mockModule('commander', () => ({
  Command: jest.fn().mockImplementation(() => ({
    command: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis()
  }))
}));

// Import modules after mocking
const commander = await import('commander');

describe('Command Registration', () => {
  let commandsIndex;
  let mockProgram;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock program object
    mockProgram = {
      command: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      action: jest.fn().mockReturnThis()
    };

    // Dynamically import commands index to use our mocks
    commandsIndex = await import('../../commands/index.mjs');
  });

  test('registers all expected commands', () => {
    // Call the register function
    commandsIndex.registerCommands(mockProgram);

    // Verify all expected commands are registered
    expect(mockProgram.command).toHaveBeenCalledWith('interactive');
    expect(mockProgram.command).toHaveBeenCalledWith('branches');
    expect(mockProgram.command).toHaveBeenCalledWith('checkout-branch');
    expect(mockProgram.command).toHaveBeenCalledWith('delete-branches');
    expect(mockProgram.command).toHaveBeenCalledWith('create-feature');
    expect(mockProgram.command).toHaveBeenCalledWith('create-release');
    expect(mockProgram.command).toHaveBeenCalledWith('create-hotfix');
    expect(mockProgram.command).toHaveBeenCalledWith('finish-hotfix');

    // Verify each command has a description
    const callCount = mockProgram.description.mock.calls.length;
    expect(callCount).toBeGreaterThanOrEqual(8); // At least 8 commands with descriptions

    // Verify each command has an action
    expect(mockProgram.action).toHaveBeenCalledTimes(callCount);
  });
});
