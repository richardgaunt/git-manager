// commands/branches.mjs

import inquirer from 'inquirer';
import chalk from 'chalk';
import { getCurrentBranch, getLocalBranches, deleteLocalBranch } from '../api.mjs';

export async function listBranches() {
  const currentBranch = getCurrentBranch();
  const branches = getLocalBranches();

  console.log(`\nCurrent branch: ${chalk.green(currentBranch)}`);
  console.log('\nAll local branches:');

  branches.forEach(branch => {
    if (branch === currentBranch) {
      console.log(`  ${chalk.green('* ' + branch)}`);
    } else {
      console.log(`    ${branch}`);
    }
  });
}

export async function deleteBranches() {
  const currentBranch = getCurrentBranch();
  const allBranches = getLocalBranches();

  // Filter out current branch
  const branches = allBranches.filter(branch => branch !== currentBranch);

  if (branches.length === 0) {
    console.log(chalk.yellow('\nNo local branches to delete (excluding current branch)'));
    return;
  }

  const { selectedBranches } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedBranches',
      message: 'Select branches to delete:',
      choices: branches,
      pageSize: 15
    }
  ]);

  if (selectedBranches.length === 0) {
    console.log(chalk.yellow('No branches selected for deletion.'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete ${selectedBranches.length} branch(es)?`,
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Operation canceled.'));
    return;
  }

  console.log('\nDeleting branches...');

  for (const branch of selectedBranches) {
    let result = deleteLocalBranch(branch, true);
    if (result.success) {
      console.log(chalk.green(result.message));
    } else {
      console.log(chalk.red(result.message));
    }
  }

  console.log(chalk.green('\nOperation completed.'));
}
