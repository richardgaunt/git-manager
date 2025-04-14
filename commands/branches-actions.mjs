// commands/branches.mjs

import inquirer from 'inquirer';
import inquirerAutocomplete from 'inquirer-autocomplete-prompt';
import chalk from 'chalk';
import {
  getCurrentBranch,
  getLocalBranches,
  deleteLocalBranch,
  getAllBranches,
  getStatus,
  checkoutBranch,
  checkIfRemoteBranchExists,
  pullLatestChanges,
  stashChanges,
  pullWithRebase,
  createBranch,
  toKebabCase,
  applyStash,
  listTags, setUpstreamAndPush
} from '../api.mjs';

inquirer.registerPrompt('autocomplete', inquirerAutocomplete);

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

export async function branchesActions() {
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

/**
 * Checkout an existing branch and pull latest changes
 */
export async function checkoutBranchAndUpdate() {
  console.log(chalk.blue('\n=== Checkout Branch and Update ===\n'));

  try {
    // Get current branch
    const currentBranch = getCurrentBranch();
    console.log(`Current branch: ${chalk.green(currentBranch)}\n`);

    // Get all branches
    const branches = getAllBranches()
        .filter(branch => branch !== currentBranch); // Remove current branch from list

    if (branches.length === 0) {
      console.log(chalk.yellow('No other branches available to checkout.'));
      return;
    }

    const { selectedBranch } = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'selectedBranch',
        message: 'Select a branch to checkout:',
        source: (answersSoFar, input = '') => {
          // If no input, return all branches
          if (!input) {
            return Promise.resolve(branches);
          }
          const filtered = branches.filter(branch =>
              branch.toLowerCase().includes(input.toLowerCase())
          );

          return Promise.resolve(filtered);
        },
        pageSize: 15
      }
    ]);


    // Check for uncommitted changes
    const status = getStatus();
    let changesStashed = false;
    let stashedFiles = [];

    if (status.trim()) {
      // Parse the status to get changed files
      stashedFiles = status
          .split('\n')
          .filter(line => line.match(/^\s*[MADRCU?]/) || line.match(/^\s*[MADRCU?][MADRCU?]/))
          .map(line => line.trim().replace(/^[MADRCU?][MADRCU?]?\s+/, ''));

      console.log(chalk.yellow(`\nStashing ${stashedFiles.length} changed files...`));

      // Stash changes automatically
      changesStashed = stashChanges(`Auto stash before checking out ${selectedBranch}`);
    }

    // Checkout the branch
    console.log(chalk.yellow(`\nChecking out branch: ${selectedBranch}`));
    checkoutBranch(selectedBranch);

    // Check if this is a remote branch
    const isRemoteBranch = checkIfRemoteBranchExists(selectedBranch);

    // Pull latest changes if it's a remote branch
    if (isRemoteBranch) {
      console.log(chalk.yellow('\nPulling latest changes from remote...'));
      try {
        const pullResult = pullLatestChanges();
        console.log(chalk.dim(pullResult));
      } catch (error) {
        console.log(chalk.red(`Error pulling latest changes: ${error.message}`));
      }
    } else {
      console.log(chalk.yellow('\nBranch exists only locally. No remote updates available.'));
    }

    // Apply stashed changes if needed
    if (changesStashed) {
      console.log(chalk.yellow('\nApplying stashed changes...'));
      applyStash();

      // Display which files were restored
      console.log(chalk.green('\nRestored changes to the following files:'));
      stashedFiles.forEach(file => {
        console.log(chalk.dim(`  - ${file}`));
      });
    }

    console.log(chalk.green(`\n✓ Successfully checked out branch: ${selectedBranch}`));

  } catch (error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}

/**
 * Create a new feature branch
 */
export async function createFeatureBranch() {
  console.log(chalk.blue('\n=== Creating Feature Branch ===\n'));

  try {
    await checkoutDevelop();

    // Ask for issue number
    const { issueKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'issueKey',
        message: 'Enter the issue key/number (e.g., JIRA-123):',
        validate: input => !!input.trim() || 'Issue key is required'
      }
    ]);

    // Ask for branch name
    const { branchName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'branchName',
        message: 'Enter a descriptive branch name:',
        validate: input => !!input.trim() || 'Branch name is required'
      }
    ]);

    // Create kebab-case branch name
    const kebabIssueKey = toKebabCase(issueKey);
    const kebabBranchName = toKebabCase(branchName).toLowerCase();
    const newBranchName = `feature/${kebabIssueKey}-${kebabBranchName}`;

    // Create and checkout the new branch
    console.log(chalk.yellow(`\nCreating and checking out new branch: ${newBranchName}`));
    createBranch(newBranchName, 'develop');

    // Pop stashed changes if any
    if (changesStashed) {
      console.log(chalk.yellow('\nApplying stashed changes...'));
      applyStash();
    }

    console.log(chalk.green(`\n✓ Successfully created feature branch: ${newBranchName}`));

  } catch (error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}


/**
 * Create a new release.
 * @returns {Promise<void>}
 */
export async function createReleaseBranch() {

  try {
    console.log(chalk.blue('\n=== Creating Release ===\n'));
    console.log(chalk.blue('\nChecking to see if a release already exists...\n'));
    const branches = getAllBranches();
    const existingReleases = branches.filter(branch => branch.startsWith('release/'));
    if (existingReleases.length > 0) {
      throw new Error(`A release already exists. Please complete the following release(s): ${existingReleases.join(', ')}`);
    }
    else {
      console.log(chalk.yellow('No release branches found.'));
    }

    await checkoutDevelop();

    // Ask for branch name
    const tags = (await listTags()).slice(0, 3);
    console.log(chalk.yellow(`\nRecent tags: ${tags.join(', ')}`));
    const { releaseTag } = await inquirer.prompt([
      {
        type: 'input',
        name: 'releaseTag',
        message: 'Enter the release tag (e.g., 1.0.0):',
        default: tags[0],
        validate: input => !!input.trim() || 'Release tag is required'
      }
    ]);

    // Create kebab-case branch name
    const newBranchName = `release/${releaseTag}`;

    // Create and checkout the new branch
    console.log(chalk.yellow(`\nCreating a new release: ${newBranchName}`));
    createBranch(newBranchName, 'develop');

    console.log(chalk.green(`\n✓ Successfully created a release branch: ${newBranchName}`));
  
    setUpstreamAndPush();
    console.log(chalk.green(`\n✓ Successfully published release branch: ${newBranchName}`));

  } catch (error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}

/**
 * Stashes staged changes, checks out develop, gets latest changes.
 * @returns {Promise<void>}
 */
async function checkoutDevelop() {
  try {
    // Get current branch for reference
    const currentBranch = getCurrentBranch();
    console.log(`Current branch: ${chalk.green(currentBranch)}`);

    // Show current changes
    const status = getStatus();
    if (status.trim()) {
      console.log('\nCurrent changes:');
      console.log(status);
    } else {
      console.log('\nNo uncommitted changes detected.');
    }

    // Stash changes if needed
    const hasChanges = status.trim().length > 0;
    let changesStashed = false;

    if (hasChanges) {
      console.log(chalk.yellow('\nStashing current changes...'));
      changesStashed = stashChanges();
    }

    // Checkout develop branch.
    console.log(chalk.yellow('\nChecking out develop branch...'));
    checkoutBranch('develop');

    // Pull with rebase
    console.log(chalk.yellow('\nUpdating develop branch with git pull --rebase...'));
    pullWithRebase();
  }
  catch (error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}
