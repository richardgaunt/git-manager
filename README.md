# Git Manager

A powerful CLI tool to streamline Git workflow operations with an interactive interface.

## Features

- **Interactive Menu System**: Navigate through Git operations with an easy-to-use menu interface
- **Branch Management**:
  - List all local branches
  - Delete multiple branches with a single command
  - Force delete branches without confirmation
  - Checkout branches with automatic updates
  - Create and manage feature branches
  - Create and manage hotfix branches
  - Finish hotfix branches with proper merging
- **Feature Branch Workflow**:
  - Automated workflow to create standardized feature branches
  - Automatically stashes current changes
  - Updates develop branch with latest changes
  - Creates properly formatted branches (issue-key-branch-name)
  - Restores stashed changes to new branch
- **Hotfix Branch Workflow**:
  - Create hotfix branches from main/master
  - Finish hotfixes with proper merging to main and develop
  - Automatic version tagging
- **Branch Management Utilities**:
  - Checkout branches with automatic stashing of changes
  - Pull latest changes with rebase option
  - Apply stashed changes automatically
  - Smart branch naming with kebab-case conversion

## Requirements

- Node.js v22 or higher
- Git installed and available in your PATH

## Installation

1. Clone the repository:
```shell
  git clone [https://github.com/richard-gaunt/git-manager.git](https://github.com/richard-gaunt/git-manager.git)
```

2. Install dependencies:
```shell
  npm install
``` 

3. Make the script executable (Linux/macOS):
```shell
  chmod +x index.js
``` 

## Setting Up the Alias

For convenience, you can set up an alias in your `.bashrc` or `.zshrc` file:

1. Open your `.bashrc` or `.zshrc` file:
```shell
vim ~/.bashrc
# or
vim ~/.zshrc
``` 

2. Add the following line, replacing `<path_to_app>` with the absolute path to your git-manager directory:
```shell
  alias git_manager="node <path_to_app>/index.js"
``` 

3. Save and close the file

4. Apply the changes:
```shell
  source ~/.bashrc
# or
  source ~/.zshrc
``` 

**Note**: This application requires Node.js v22 or higher. Make sure you have the correct version installed:
```shell
  node --version
``` 

If you need to update Node.js, consider using a version manager like [nvm](https://github.com/nvm-sh/nvm).

## Usage

### Interactive Mode

Simply run the alias without any arguments:
```shell
git_manager
``` 

This will display the interactive menu that allows you to:
- List all branches
- Delete branches
- Create feature branches
- Create and manage release branches
- Create and manage hotfix branches
- Checkout and update branches
- And more...

### Command Mode

You can also run specific commands directly:
```shell
# List all branches
git_manager branches
# Delete branches
git_manager delete-branches
# Create feature branch
git_manager create-feature
# Create a release
git_manager create-release
# Finish a release
git_manager finish-release
# Create hotfix branch
git_manager create-hotfix
# Finish a hotfix branch
git_manager finish-hotfix
# Checkout and update a branch
git_manager checkout
``` 

## Feature Branch Workflow

When creating a feature branch, the tool will:

1. Show your current uncommitted changes
2. Automatically stash any changes
3. Checkout the develop branch
4. Update develop with `git pull --rebase`
5. Prompt for an issue key/number (e.g., JIRA-123)
6. Prompt for a descriptive branch name
7. Create a kebab-case branch in the format `JIRA-123-branch-name`
8. Restore your stashed changes to the new branch

This ensures consistent branch naming and up-to-date feature branches across your team.

## Hotfix Branch Workflow

When creating and finishing hotfix branches, the tool will:

1. Create hotfix branches from the main/master branch
2. When finishing a hotfix:
   - Merge changes back to main/master
   - Create a version tag
   - Merge changes to develop to keep branches in sync
   - Push changes to remote repositories

## Branch Checkout and Update

The checkout functionality provides:

1. Interactive branch selection with autocomplete
2. Automatic stashing of uncommitted changes
3. Pulling latest changes from the remote
4. Restoring stashed changes to the selected branch

## Architecture
```
git-manager/ 
├── index.mjs # Main entry point with Commander setup 
├── api.mjs # Common git operations 
├── package.json # Project metadata with dependencies 
└── commands/ # Command modules 
   ├── index.mjs # Command registry and loader 
   └── branches-actions.mjs # Branch workflow implementations
``` 

## License

This project is licensed under the MIT License - see the LICENSE file for details.
