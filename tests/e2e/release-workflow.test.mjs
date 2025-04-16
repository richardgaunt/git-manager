import { describe, expect, test, afterAll, beforeAll, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  createTestEnvironment,
  getCurrentBranch,
  getBranches,
  createFile,
} from './test-helpers.mjs';

/**
 * End-to-End tests for release workflow
 *
 * These tests verify the specific release branch workflow
 * from creation to completion and cleanup.
 */
describe('Release Workflow E2E Tests', () => {
  let testEnv;

  beforeAll(() => {
    // Create test environment with git repository
    testEnv = createTestEnvironment({
      withDevelop: true,
      withRemote: true
    });

    // Silence console output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterAll(() => {
    // Restore console output
    jest.restoreAllMocks();

    // Clean up test environment
    testEnv.cleanup();
  });

  test('complete release workflow', () => {
    // 1. Start from develop branch
    execSync('git checkout develop', { cwd: testEnv.repoPath });
    expect(getCurrentBranch(testEnv.repoPath)).toBe('develop');

    // 2. Add some content to develop
    createFile(testEnv.repoPath, 'develop-feature.txt', 'New feature for release', true);
    execSync('git commit -m "Add new feature for release"', { cwd: testEnv.repoPath });

    // 3. Create release branch
    const releaseBranch = 'release/1.0.0';
    execSync(`git checkout -b ${releaseBranch}`, { cwd: testEnv.repoPath });
    expect(getCurrentBranch(testEnv.repoPath)).toBe(releaseBranch);

    // 4. Make release-specific changes
    createFile(testEnv.repoPath, 'version.txt', '1.0.0', true);
    execSync('git commit -m "Update version to 1.0.0"', { cwd: testEnv.repoPath });

    // 5. Merge release to main
    execSync('git checkout main', { cwd: testEnv.repoPath });
    execSync(`git merge --no-ff ${releaseBranch} -m "Merge release 1.0.0"`, { cwd: testEnv.repoPath });

    // 6. Verify release content is on main
    expect(fs.existsSync(path.join(testEnv.repoPath, 'version.txt'))).toBe(true);
    expect(fs.existsSync(path.join(testEnv.repoPath, 'develop-feature.txt'))).toBe(true);

    // 7. Create tag for the release
    execSync('git tag -a v1.0.0 -m "Version 1.0.0"', { cwd: testEnv.repoPath });

    // 8. Merge release to develop
    execSync('git checkout develop', { cwd: testEnv.repoPath });
    execSync(`git merge --no-ff ${releaseBranch} -m "Merge release 1.0.0 to develop"`, { cwd: testEnv.repoPath });

    // 9. Verify release content is on develop
    expect(fs.existsSync(path.join(testEnv.repoPath, 'version.txt'))).toBe(true);

    // 10. Delete release branch
    execSync(`git branch -d ${releaseBranch}`, { cwd: testEnv.repoPath });
    const branches = getBranches(testEnv.repoPath);
    expect(branches).not.toContain(releaseBranch);

    // 11. Verify tag was created
    const tags = execSync('git tag', { cwd: testEnv.repoPath, encoding: 'utf8' }).split('\n').filter(Boolean);
    expect(tags).toContain('v1.0.0');
  });

  test('release with bug fixes', () => {
    // 1. Create new release branch
    const releaseBranch = 'release/1.1.0';
    execSync('git checkout develop', { cwd: testEnv.repoPath });
    execSync(`git checkout -b ${releaseBranch}`, { cwd: testEnv.repoPath });

    // 2. Add release content
    createFile(testEnv.repoPath, 'new-feature.txt', 'New feature for 1.1.0', true);
    execSync('git commit -m "Add new feature for 1.1.0"', { cwd: testEnv.repoPath });

    // 3. Fix a bug in the release
    createFile(testEnv.repoPath, 'bugfix.txt', 'Fix for release', true);
    execSync('git commit -m "Fix bug in release"', { cwd: testEnv.repoPath });

    // 4. Complete release
    execSync('git checkout main', { cwd: testEnv.repoPath });
    execSync(`git merge --no-ff ${releaseBranch} -m "Merge release 1.1.0"`, { cwd: testEnv.repoPath });
    execSync('git tag -a v1.1.0 -m "Version 1.1.0"', { cwd: testEnv.repoPath });

    // 5. Verify release content is on main
    expect(fs.existsSync(path.join(testEnv.repoPath, 'new-feature.txt'))).toBe(true);
    expect(fs.existsSync(path.join(testEnv.repoPath, 'bugfix.txt'))).toBe(true);

    // 6. Merge back to develop
    execSync('git checkout develop', { cwd: testEnv.repoPath });
    execSync(`git merge --no-ff ${releaseBranch} -m "Merge release 1.1.0 to develop"`, { cwd: testEnv.repoPath });

    // 7. Verify develop has all content
    expect(fs.existsSync(path.join(testEnv.repoPath, 'new-feature.txt'))).toBe(true);
    expect(fs.existsSync(path.join(testEnv.repoPath, 'bugfix.txt'))).toBe(true);

    // 8. Clean up
    execSync(`git branch -d ${releaseBranch}`, { cwd: testEnv.repoPath });
  });
});
