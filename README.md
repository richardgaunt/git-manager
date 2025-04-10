# Git Manager

A powerful CLI tool to streamline Git workflow operations with an interactive interface.

## Features

- **Interactive Menu System**: Navigate through Git operations with an easy-to-use menu interface
- **Branch Management**:
    - List all local branches
    - Delete multiple branches with a single command
    - Force delete branches without confirmation
- **Feature Branch Creation**:
    - Automated workflow to create standardized feature branches
    - Automatically stashes current changes
    - Updates develop branch with latest changes
    - Creates properly formatted branches (issue-key-branch-name)
    - Restores stashed changes to new branch

## Requirements

- Node.js v22 or higher
- Git installed and available in your PATH

## Installation

1. Clone the repository:
```shell script
  git clone https://github.com/yourusername/git-manager.git
   cd git-manager
```

2. Install dependencies:
```shell script
npm install
```

3. Make the script executable (Linux/macOS):
```shell script
chmod +x index.js
```

## Setting Up the Alias

For convenience, you can set up an alias in your `.bashrc` or `.zshrc` file:

1. Open your `.bashrc` or `.zshrc` file:
```shell script
  nano ~/.bashrc
   # or
   nano ~/.zshrc
```

2. Add the following line, replacing `<path_to_app>` with the absolute path to your git-manager directory:
```shell script
alias git_manager="node <path_to_app>/index.js"
```

3. Save and close the file

4. Apply the changes:
```shell script
source ~/.bashrc
   # or
   source ~/.zshrc
```

**Note**: This application requires Node.js v22 or higher. Make sure you have the correct version installed:
```shell script
node --version
```

If you need to update Node.js, consider using a version manager like [nvm](https://github.com/nvm-sh/nvm).

## Usage

### Interactive Mode

Simply run the alias without any arguments:
```shell script
git_manager
```

This will display the interactive menu that allows you to:
- List all branches
- Delete branches
- Create feature branches
- And more...

### Command Mode

You can also run specific commands directly:
```shell script
# List all branches
git_manager branches

# Delete branches
git_manager delete-branches

# Create feature branch
git_manager create-feature
```

## Feature Branch Workflow

When creating a feature branch, the tool will:

1. Show your current uncommitted changes
2. Automatically stash any changes
3. Checkout the develop branch
4. Update develop with `git pull --rebase`
5. Prompt for an issue key/number (e.g., JIRA-123)
6. Prompt for a descriptive branch name
7. Create a kebab-case branch in the format `issue-key-branch-name`
8. Restore your stashed changes to the new branch

This ensures consistent branch naming and up-to-date feature branches across your team.

## Architecture

git-manager/
├── index.mjs            # Main entry point with Commander setup
├── api.mjs              # Common git operations
├── package.json         # Project metadata with dependencies
└── commands/            # Command modules
├── index.mjs        # Command registry and loader
└── branches.mjs     # Branch management commands

## License

This project is licensed under the MIT License - see the LICENSE file for details.
