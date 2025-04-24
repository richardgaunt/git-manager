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
  listTags,
  setUpstreamAndPush,
  getMainBranch,
  mergeBranch,
  createTag,
  pushToRemote,
  deleteRemoteBranch,
  getLatestCommits,
  cherryPickCommit
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
    const result = deleteLocalBranch(branch, true);
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
    } else {
      console.log(chalk.yellow('No release branches found.'));
    }

    await checkoutDevelop();

    const releaseTag = await listAndSelectTag();

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
  } catch (error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}

/**
 * Stashes staged changes, checks out main or master, gets latest changes.
 * @returns {Promise<void>}
 */
async function checkoutMain() {
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

    if (hasChanges) {
      console.log(chalk.yellow('\nStashing current changes...'));
      stashChanges();
    }

    const mainBranch = getMainBranch();

    // Checkout develop branch.
    console.log(chalk.yellow(`\nChecking out ${mainBranch} branch...`));
    checkoutBranch(mainBranch);

    // Pull with rebase
    console.log(chalk.yellow(`\nUpdating ${mainBranch} branch with git pull --rebase...`));
    pullWithRebase();
  } catch (error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}


/**
 * Create a hotfix.
 * @returns {Promise<void>}
 */
export async function createHotfix() {
  try {
    console.log(chalk.blue('\n=== Creating Release ===\n'));
    console.log(chalk.blue('\nChecking to see if a release already exists...\n'));
    const branches = getAllBranches();
    const existingHotfixes = branches.filter(branch => branch.startsWith('hotfix/'));
    if (existingHotfixes.length > 0) {
      throw new Error(`A hotfix already exists. Please complete the following release(s): ${existingHotfixes.join(', ')}`);
    } else {
      console.log(chalk.yellow('No release branches found.'));
    }

    await checkoutMain();

    // Output recent tags.
    const releaseTag = await listAndSelectTag();
    // Create kebab-case branch name
    const newBranchName = `hotfix/${releaseTag}`;

    // Create and checkout the new branch
    console.log(chalk.yellow(`\nCreating a new hotfix: ${newBranchName}`));
    createBranch(newBranchName, getMainBranch());

    console.log(chalk.green(`\n✓ Successfully created hotfix: ${newBranchName}`));
  } catch (error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}

/**
 * Creates tags for branch.
 *
 * @returns {Promise<string>}
 */
async function listAndSelectTag() {
  const tags = (listTags()).slice(0, 3);
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

  return releaseTag;
}

/**
 * Finishes a hotfix branch by merging it into master and develop,
 * creating a tag, and cleaning up the hotfix branch
 */
export async function finishHotfix() {
  console.log(chalk.blue('\n=== Finish Hotfix ===\n'));
  await doRelease('hotfix');
}

/**
 * Finishes a release branch by merging it into master and develop,
 * creating a tag, and cleaning up the release branch
 */
export async function finishRelease() {
  console.log(chalk.blue('\n=== Finish Release ===\n'));
  await doRelease('release');
}

/**
 * Manage release or hotfix release process.
 *
 * @param type
 * @returns {Promise<void>}
 */
async function doRelease(type) {
  if (['hotfix', 'release'].indexOf(type) === -1) {
    throw new Error(`Invalid release management type: ${type}`);
  }
  try {
    // Get hotfix or release branch
    const branchPrefix = type === 'hotfix' ? 'hotfix/' : 'release/';
    const releaseBranches = getAllBranches().filter(branch => branch.startsWith(branchPrefix));
    if (releaseBranches.length === 0) {
      console.log(chalk.yellow('No hotfix branches exist.'));
      return;
    }
    const { releaseBranch } = await inquirer.prompt([
      {
        type: 'list',
        name: 'releaseBranch',
        message: `Select a ${type} branch to finish:`,
        choices: releaseBranches,
      }
    ]);

    console.log(chalk.yellow(`\nChecking out ${type} branch: ${releaseBranch}`));
    // Extract the release management version for tagging
    const tagName = releaseBranch.replace(branchPrefix, '');

    // Get the main branch (main or master)
    const mainBranch = getMainBranch();
    if (!mainBranch) {
      console.log(chalk.red('Could not determine main branch (main or master).'));
      return;
    }

    // Confirm action
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to finish ${type} '${releaseBranch}', merge it into ${mainBranch} and develop, and create tag '${tagName}'?`,
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Operation canceled.'));
      return;
    }

    stashChanges();
    console.log(chalk.blue(`\nChecking out ${type} branch: ${releaseBranch}`));
    checkoutBranch(releaseBranch);
    console.log(chalk.blue(`\n Checking out ${mainBranch} branch`));
    checkoutBranch(mainBranch);
    console.log(chalk.blue(`\n Updating ${mainBranch} branch to latest`));
    pullLatestChanges();
    console.log(chalk.blue('\nChecking out develop branch'));
    checkoutBranch('develop');
    console.log(chalk.blue('\nUpdating develop branch to latest'));
    pullLatestChanges();
    console.log(chalk.blue(`\nChecking out ${mainBranch} branch`));
    checkoutBranch(mainBranch);
    console.log(chalk.blue(`\nMerging ${type} branch into ${mainBranch}`));
    try {
      mergeBranch(releaseBranch);
    } catch (error) {
      console.log(chalk.red(`Merge conflicts detected when merging ${type} into ${mainBranch}. Please resolve conflicts manually.`));
      console.log(chalk.yellow(error.message));
      return;
    }


    console.log(chalk.blue('\nChecking out develop branch'));
    checkoutBranch('develop');

    console.log(chalk.blue('\nMerging ${type} branch into develop'));
    mergeBranch(releaseBranch);
    try {
      mergeBranch(releaseBranch);
    } catch (error) {
      console.log(chalk.red(`Merge conflicts detected when merging ${type} into develop. Please resolve conflicts manually.`));
      console.log(chalk.yellow(error.message));
      return;
    }
    const tag = await listAndSelectTag();
    await createTag(tag);
    pushToRemote(mainBranch);
    pushToRemote('develop');
    pushToRemote(tagName);

    console.log(chalk.blue(`\nDeleting ${type} branch locally`));
    const result = deleteLocalBranch(releaseBranch, false);
    if (!result.success) {
      console.log(chalk.red(`Failed to delete local ${type} branch: ${result.message}`));
      return;
    }

    console.log(chalk.blue(`\nDeleting ${type} branch from remote`));
    await deleteRemoteBranch(releaseBranch);

    console.log(chalk.blue('\n16. Checking out develop branch'));
    checkoutBranch('develop');


    console.log(chalk.green(`\n✅ ${type} successfully completed!`));
  } catch (error) {
    console.error(chalk.red('\nAn error occurred:'), error);
  }
}

/**
 * Cherry-pick a specific commit from another branch
 */
export async function cherryPickChanges() {
  console.log(chalk.blue('\n=== Cherry Pick Changes ===\n'));
  
  try {
    // Get the current branch for reference
    const currentBranch = getCurrentBranch();
    console.log(`Current branch: ${chalk.green(currentBranch)}`);
    
    // Check for uncommitted changes that should be stashed
    const status = getStatus();
    let changesStashed = false;
    
    if (status.trim()) {
      console.log('\nUncommitted changes detected:');
      console.log(status);
      
      console.log(chalk.yellow('\nStashing current changes...'));
      changesStashed = stashChanges('Auto stash before cherry-picking');
    }
    
    // Get all branches to choose from
    const branches = getAllBranches()
      .filter(branch => branch !== currentBranch); // Remove current branch from list
    
    if (branches.length === 0) {
      console.log(chalk.yellow('No other branches available to cherry-pick from.'));
      return;
    }
    
    // Select branch to cherry-pick from
    const { selectedBranch } = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'selectedBranch',
        message: 'Select a branch to cherry-pick from:',
        source: (answersSoFar, input = '') => {
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
    
    console.log(chalk.yellow(`\nFetching latest commits from branch: ${selectedBranch}`));
    
    // Let's checkout the branch temporarily to get commits if needed
    const tempCheckout = selectedBranch !== currentBranch;
    
    if (tempCheckout) {
      checkoutBranch(selectedBranch);
    }
    
    // Get the latest commits from the selected branch
    const commits = getLatestCommits(20);
    
    // Go back to the original branch if we temporarily switched
    if (tempCheckout) {
      checkoutBranch(currentBranch);
    }
    
    if (commits.length === 0) {
      console.log(chalk.yellow('No commits found on the selected branch.'));
      
      // Apply stashed changes if needed
      if (changesStashed) {
        console.log(chalk.yellow('\nApplying stashed changes...'));
        applyStash();
      }
      
      return;
    }
    
    // Format commits for display
    const commitChoices = commits.map((commit) => ({
      name: `${commit.hash} - ${commit.date} - ${commit.message} (${commit.author})`,
      value: commit.hash
    }));
    
    // Select commit to cherry-pick
    const { selectedCommit } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedCommit',
        message: 'Select a commit to cherry-pick:',
        choices: commitChoices,
        pageSize: 15
      }
    ]);
    
    // Confirm the cherry-pick
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to cherry-pick commit ${selectedCommit}?`,
        default: false
      }
    ]);
    
    if (!confirm) {
      console.log(chalk.yellow('Cherry-pick operation canceled.'));
      
      // Apply stashed changes if needed
      if (changesStashed) {
        console.log(chalk.yellow('\nApplying stashed changes...'));
        applyStash();
      }
      
      return;
    }
    
    // Execute cherry-pick
    console.log(chalk.yellow(`\nCherry-picking commit ${selectedCommit}...`));
    const result = cherryPickCommit(selectedCommit);
    
    if (result.success) {
      console.log(chalk.green(result.message));
    } else {
      console.log(chalk.red(result.message));
      console.log(chalk.yellow('\nYou may need to resolve conflicts and then run:'));
      console.log(chalk.dim('git cherry-pick --continue'));
    }
    
    // Apply stashed changes if needed
    if (changesStashed) {
      console.log(chalk.yellow('\nApplying stashed changes...'));
      
      try {
        applyStash();
        console.log(chalk.green('Successfully applied stashed changes.'));
      } catch (error) {
        console.log(chalk.red('Error applying stashed changes. You may need to apply them manually.'));
        console.log(chalk.yellow('Use: git stash apply'));
      }
    }
    
    console.log(chalk.green('\n✓ Cherry-pick operation completed.'));
  } catch (error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    throw error;
  }
}
