// commands/index.mjs

import * as branches from './branches-actions.mjs';
import chalk from 'chalk';
import { getCurrentBranch, getCurrentDirectory } from '../api.mjs';
import inquirer from 'inquirer';

// Export all commands
export const commands = {
  branches,
};

// Export a function to register all commands with a Commander program
// Used to bypass the interactive menu.
export function registerCommands(program) {
  //
  program
    .command('interactive')
    .description('Start interactive mode')
    .action(async () => {
      await showInteractiveMenu();
    });

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
      await branches.branchesActions();
    });

  program
    .command('create-feature')
    .description('Create a new feature branch')
    .action(branches.createFeatureBranch);

  program
    .command('create-release')
    .description('Create a new release')
    .action(branches.createReleaseBranch);

  program
    .command('create-hotfix')
    .description('Create a new hotfix branch')
    .action(branches.createHotfix);

  program
    .command('finish-hotfix')
    .description('Finish a hotfix branch')
    .action(branches.finishHotfix);
    
  program
    .command('cherry-pick')
    .description('Cherry-pick a specific commit from another branch')
    .action(branches.cherryPickChanges);
    
  program
    .command('merge-feature')
    .description('Merge a feature branch into the current branch')
    .action(branches.mergeFeatureBranchCommand);

  return program;
}

// Interactive menu function
export async function showInteractiveMenu() {
  console.log(chalk.bold.blue('\n=== Git Manager ===\n'));

  // Display current branch
  const currentDirectory = getCurrentDirectory();
  const currentBranch = getCurrentBranch();
  console.log(`Current Directory: ${chalk.bold.blue(currentDirectory)}`);
  console.log(`Current branch: ${chalk.green(currentBranch)}`);

  // Define menu options
  const menuOptions = [
    { name: 'List all branches', value: 'list-branches' },
    { name: 'Checkout branch', value: 'checkout-branch' },
    { name: 'Delete local branches', value: 'delete-branches' },
    { name: 'Create feature branch', value: 'create-feature' },
    { name: 'Create a release', value: 'create-release' },
    { name: 'Finish a release', value: 'finish-release' },
    { name: 'Create a hotfix', value: 'create-hotfix' },
    { name: 'Finish a hotfix', value: 'finish-hotfix' },
    { name: 'Cherry pick a commit', value: 'cherry-pick' },
    { name: 'Merge a feature branch', value: 'merge-feature' },
    { name: 'Exit', value: 'exit' }
  ];

  let exitRequested = false;

  while (!exitRequested) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: menuOptions,
        pageSize: 10
      }
    ]);

    switch (action) {
      case 'list-branches':
        await commands.branches.listBranches();
        break;
      case 'checkout-branch':
        await commands.branches.checkoutBranchAndUpdate();
        break;
      case 'delete-branches':
        await commands.branches.branchesActions();
        break;
      case 'create-feature':
        await commands.branches.createFeatureBranch();
        break;
      case 'create-release':
        await commands.branches.createReleaseBranch();
        break;
      case 'finish-release':
        await commands.branches.finishRelease();
        break;
      case 'create-hotfix':
        await commands.branches.createHotfix();
        break;
      case 'finish-hotfix':
        await commands.branches.finishHotfix();
        break;
      case 'cherry-pick':
        await commands.branches.cherryPickChanges();
        break;
      case 'merge-feature':
        await commands.branches.mergeFeatureBranchCommand();
        break;
      case 'exit':
        exitRequested = true;
        break;
    }

    if (!exitRequested) {
      console.log(''); // Empty line for better readability
      const { continue: shouldContinue } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Return to main menu?',
          default: true
        }
      ]);

      if (!shouldContinue) {
        exitRequested = true;
      }
    }
  }

  console.log(chalk.blue('\nThank you for using Git Manager!'));
}
