#!/usr/bin/env node
// index.mjs - Main entry point

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { isGitRepository, getCurrentBranch, getCurrentDirectory } from './api.mjs';
import { commands, registerCommands } from './commands/index.mjs';

// Check if current directory is a git repository
if (!isGitRepository()) {
  console.error(chalk.red('Error: Not in a git repository'));
  process.exit(1);
}

const program = new Command();

// Set up program metadata
program
  .name('git-manager')
  .description('A CLI tool for managing git operations')
  .version('1.0.0');

// Register all commands
registerCommands(program);

// Interactive mode command
program
  .command('interactive')
  .description('Start interactive mode')
  .action(async () => {
    await showInteractiveMenu();
  });

// If no command is provided, start in interactive mode
if (process.argv.length <= 2) {
  showInteractiveMenu().catch(error => {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  });
} else {
  program.parse(process.argv);
}

// Interactive menu function
async function showInteractiveMenu() {
  console.log(chalk.bold.blue('\n=== Git Manager ===\n'));

  // Display current branch
  const currentDirectory = getCurrentDirectory();
  const currentBranch = getCurrentBranch();
  console.log(`Current Directory: ${chalk.bold.blue(currentDirectory)}`);
  console.log(`Current branch: ${chalk.green(currentBranch)}`);

  // Define menu options
  const menuOptions = [
    { name: 'List all branches', value: 'list-branches' },
    { name: 'Checkout branch', value: 'checkout-branch'},
    { name: 'Delete local branches', value: 'delete-branches' },
    { name: 'Create feature branch', value: 'create-feature'},
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
        await commands.branches.branches();
        break;
      case 'create-feature':
        await commands.feature.createFeatureBranch()
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
