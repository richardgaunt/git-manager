#!/usr/bin/env node
// index.mjs - Main entry point

import { Command } from 'commander';
import chalk from 'chalk';
import { isGitRepository } from './api.mjs';
import { registerCommands, showInteractiveMenu } from './commands/index.mjs';

// Handle Ctrl+C gracefully - exit silently
function isUserExit(error) {
  return error?.name === 'ExitPromptError' || error?.message?.includes('force closed');
}

function handleExit(error) {
  if (isUserExit(error)) {
    process.exit(0);
  }
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
}

process.on('uncaughtException', (error) => {
  if (isUserExit(error)) process.exit(0);
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  if (isUserExit(error)) process.exit(0);
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
});

// Check if current directory is a git repository
if (!isGitRepository()) {
  console.error(chalk.red('Error: Not in a git repository'));
  process.exit(1);
}

const program = new Command();

// Set up program metadata
program
  .name('gbm')
  .description('A CLI tool for managing git operations')
  .version('1.0.0');

// Register all commands
registerCommands(program);


// If no command is provided, start in interactive mode
if (process.argv.length <= 2) {
  showInteractiveMenu().catch(handleExit);
} else {
  program.parse(process.argv);
}
