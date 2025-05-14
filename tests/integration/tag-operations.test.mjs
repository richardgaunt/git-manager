/**
 * Integration tests for tag operations
 * 
 * These tests verify that the git-manager handles tags correctly,
 * including creation, listing, and pushing to remote
 */

import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { execSync } from 'child_process';
import { createTestRepository } from './test-repository.mjs';
import {
  listTags,
  createTag,
  pushToRemote
} from '../../api.mjs';

describe('Tag Operations Integration', () => {
  let testRepo;
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test repository with remote
    testRepo = createTestRepository({
      withDevelop: true,
      withRemote: true
    });
    
    // Change to test repository directory
    process.chdir(testRepo.path);
    
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Clean up test repository and restore console
    process.chdir(originalCwd);
    testRepo.cleanup();
    jest.restoreAllMocks();
  });

  test('can create and list tags', async () => {
    // Create a tag
    const tagName = 'v1.0.0';
    await createTag(tagName);
    
    // List tags and verify the new tag is included
    const tags = listTags();
    expect(tags).toContain(tagName);
  });

  test('can push tags to remote', async () => {
    // Create a tag
    const tagName = 'v2.0.0';
    await createTag(tagName);
    
    // Push the tag to remote
    pushToRemote(tagName);
    
    // Verify tag exists on remote
    const remoteTags = execSync('git ls-remote --tags origin', { 
      cwd: testRepo.path,
      encoding: 'utf8'
    });
    
    expect(remoteTags).toContain(tagName);
  });

  test('tag management with releases', async () => {
    // Create a release branch
    execSync('git checkout -b release/3.0.0', { cwd: testRepo.path });
    
    // Add a file and commit
    execSync('echo "Version 3.0.0" > version.txt', { cwd: testRepo.path });
    execSync('git add version.txt', { cwd: testRepo.path });
    execSync('git commit -m "Prepare 3.0.0 release"', { cwd: testRepo.path });
    
    // Create tag associated with the release
    const tagName = 'v3.0.0';
    await createTag(tagName);
    
    // Verify tag exists
    const tags = listTags();
    expect(tags).toContain(tagName);
    
    // Push tag to remote
    pushToRemote(tagName);
    
    // Verify tag exists on remote
    const remoteTags = execSync('git ls-remote --tags origin', { 
      cwd: testRepo.path,
      encoding: 'utf8'
    });
    
    expect(remoteTags).toContain(tagName);
  });
});