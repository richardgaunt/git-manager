// commands/index.mjs

import * as branches from './branches.mjs';
import * as feature from './feature-branch.mjs';

// Export all commands
export const commands = {
  branches,
  feature,
};

// Export a function to register all commands with a Commander program
export function registerCommands(program) {
  // Branch commands
  program
    .command('branches')
    .description('List all branches')
    .action(async () => {
      await branches.listBranches();
    });

  program
    .command('checkout-branch')
    .description('Checkout a branch')
    .action(async () => {
      await branches.checkoutBranchAndUpdate();
    });

  program
    .command('delete-branches')
    .description('Delete local branches')
    .action(async () => {
      await branches.branches();
    });

  program
      .command('create-feature')
      .description('Create a new feature branch')
      .action(feature.createFeatureBranch);

  // Add more command registrations here

  return program;
}
