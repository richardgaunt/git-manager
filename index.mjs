#!/usr/bin/env node
// index.mjs - Main entry point

import { Command } from 'commander';
import chalk from 'chalk';
import { isGitRepository } from './api.mjs';
import { registerCommands, showInteractiveMenu } from './commands/index.mjs';

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


// If no command is provided, start in interactive mode
if (process.argv.length <= 2) {
  showInteractiveMenu().catch(error => {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  });
} else {
  program.parse(process.argv);
}
