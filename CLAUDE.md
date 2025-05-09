# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Build/Run: `npm start`
- Run specific command: `node index.mjs [command-name]`
- Run tests: `npm test`
- Run specific test file: `npm test -- --testPathPattern=tests/path/to/test.mjs`

## Code Style Guidelines
- **JS/Node.js**: ES modules with `.mjs` extension
- **Imports**: Order - built-ins, then third-party, then local modules
- **Exports**: Use named exports rather than default exports
- **Error Handling**: Catch exceptions, provide meaningful error messages
- **Documentation**: JSDoc comments for functions with @param and @returns
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Function Style**: Use async/await for asynchronous operations
- **String Templates**: Use backticks for string interpolation
- **Formatting**: 2-space indentation, semicolons required
- **Git Commands**: Always add proper error handling when executing git commands
- **Chalk Usage**: Use chalk for colorized console output

## Technical Architecture
- **Entry Point**: `index.mjs` - Sets up Commander.js CLI and directs to interactive menu or specific commands
- **API Layer**: `api.mjs` - Core git operations wrapped as reusable functions
- **Command Modules**: `commands/*.mjs` - Implementation of specific git workflows
- **Interactive UI**: Uses Inquirer.js for menu system and interactive prompts

## Application Flow
1. User launches app via command line (`node index.mjs` or alias)
2. If no arguments provided, interactive menu displays (implemented in `commands/index.mjs`)
3. User selects operation from menu or provides command directly
4. Command implementation (from `commands/branches-actions.mjs`) executes
5. Git operations executed via functions in `api.mjs` which wrap `execSync` calls

## Key Features
- Feature branch creation with standardized naming
- Hotfix/release branch workflows based on git-flow pattern
- Interactive branch selection with autocomplete
- Auto-stashing changes during branch operations
- Automatic rebasing from remote during checkout
- Branch deletion with safety checks
- Smart branch naming with kebab-case conversion

## Development Guidelines
- Read the assigned issue
- Make all new features in a feature branch
- Create tests to support feature
- Create a PR for any new features using the `PULL_REQUEST_TEMPLATE.md`:

```
## Checklist before requesting a review

- [ ] I have formatted the subject to include ticket number as `[#123] Verb in past tense with dot at the end.`
- [ ] I have added a link to the issue tracker
- [ ] I have provided information in `Changed` section about WHY something was done if this was not a normal implementation
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] I have run new and existing relevant tests locally with my changes, and they passed
- [ ] I have provided screenshots, where applicable

## Changed

1.

## Screenshots

```
