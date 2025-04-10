// commands/feature-branch.mjs - Feature branch creation commands
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
    getCurrentBranch,
    getStatus,
    stashChanges,
    checkoutBranch,
    pullWithRebase,
    createBranch,
    toKebabCase,
    applyStash
} from '../api.mjs';

/**
 * Create a new feature branch
 */
export async function createFeatureBranch() {
    console.log(chalk.blue('\n=== Creating Feature Branch ===\n'));

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
