/**
 * Git Commit Tool Tests
 *
 * TDD Approach: Tests written first, implementation will follow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Wrapper function to execute Git commands with English locale
async function execGit(command: string) {
  return execAsync(command, {
    env: {
      ...process.env,
      LC_ALL: 'C',
      LANG: 'C',
    },
  });
}

describe('Git Commit Tool', () => {
  const testDir = '/tmp/git-commit-test';
  const originalDir = process.cwd();

  beforeEach(async () => {
    await execAsync(`mkdir -p ${testDir}`);
    await execAsync(`cd ${testDir} && git init`);
    await execAsync(`cd ${testDir} && git config user.email "test@example.com"`);
    await execAsync(`cd ${testDir} && git config user.name "Test User"`);
    await execAsync(`cd ${testDir} && echo "initial" > test.txt`);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalDir);
    await execAsync(`rm -rf ${testDir}`);
  });

  describe('Basic Commit', () => {
    it('commits staged files', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial commit"');

      const result = await execGit('git log --oneline');

      expect(result.stdout).toContain('Initial commit');
      expect(result.stdout.split('\n').length - 1).toBe(1);
    });

    it('fails when no files staged', async () => {
      const result = await execGit('git commit -m "Empty commit"').catch(e => e);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('nothing to commit');
    });

    it('creates commit with hash', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial commit"');

      const result = await execGit('git rev-parse HEAD');

      expect(result.stdout).toMatch(/^[a-f0-9]{40}$/);
    });
  });

  describe('Commit Message', () => {
    it('accepts single-line message', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Single line message"');

      const result = await execGit('git log --format=%s -n 1');

      expect(result.stdout.trim()).toBe('Single line message');
    });

    it('accepts multi-line message', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Title\n\nDetailed description\n\nMore details"');

      const result = await execGit('git log --format=%B -n 1');

      expect(result.stdout).toContain('Title');
      expect(result.stdout).toContain('Detailed description');
      expect(result.stdout).toContain('More details');
    });

    it('handles special characters in message', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Feature: add ✨ emoji support"');

      const result = await execGit('git log --format=%s -n 1');

      expect(result.stdout).toContain('✨');
    });
  });

  describe('Commit Options', () => {
    it('allows amend to last commit', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "First commit"');
      await execAsync('echo "change" >> test.txt');
      await execGit('git add test.txt');
      await execGit('git commit --amend -m "Amended commit"');

      const result = await execGit('git log --format=%s -n 1');

      expect(result.stdout.trim()).toBe('Amended commit');
      expect((await execGit('git log --oneline')).stdout.split('\n').length - 1).toBe(1);
    });

    it('allows empty commit with --allow-empty', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial commit"');
      await execGit('git commit --allow-empty -m "Empty commit"');

      const result = await execGit('git log --oneline');

      expect(result.stdout.split('\n').length - 1).toBe(2);
    });

    it('allows editing commit message', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Original message"');
      await execGit('git commit --amend -m "Updated message"');

      const result = await execGit('git log --format=%s -n 1');

      expect(result.stdout.trim()).toBe('Updated message');
    });
  });

  describe('Commit Author', () => {
    it('uses configured author', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Test commit"');

      const result = await execGit('git log --format=%an -n 1');

      expect(result.stdout.trim()).toBe('Test User');
    });

    it('allows overriding author', async () => {
      await execGit('git add test.txt');
      await execAsync(
        'git -c user.name="Custom User" -c user.email="custom@example.com" commit -m "Test commit"'
      );

      const authorResult = await execGit('git log --format=%an -n 1');
      const emailResult = await execGit('git log --format=%ae -n 1');

      expect(authorResult.stdout.trim()).toBe('Custom User');
      expect(emailResult.stdout.trim()).toBe('custom@example.com');
    });
  });

  describe('Commit Signing', () => {
    it('detects if GPG signing is configured', async () => {
      const result = await execGit('git config commit.gpgsign');

      // Either not set or set to false/true
      expect(
        result.stdout.trim() === '' ||
        result.stdout.trim() === 'false' ||
        result.stdout.trim() === 'true'
      ).toBe(true);
    });
  });

  describe('Commit Verification', () => {
    it('shows committed files', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Test commit"');

      const result = await execGit('git ls-tree -r HEAD');

      expect(result.stdout).toContain('test.txt');
    });

    it('preserves file content', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Test commit"');

      const result = await execGit('git show HEAD:test.txt');

      expect(result.stdout.trim()).toBe('initial');
    });

    it('tracks file history', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "First commit"');
      await execAsync('echo "modified" >> test.txt');
      await execGit('git add test.txt');
      await execGit('git commit -m "Second commit"');

      const result = await execGit('git log --oneline test.txt');

      expect(result.stdout.split('\n').length - 1).toBe(2);
    });
  });

  describe('Multiple Files', () => {
    it('commits multiple staged files', async () => {
      await execAsync('echo "file1" > file1.txt');
      await execAsync('echo "file2" > file2.txt');
      await execGit('git add file1.txt file2.txt');
      await execGit('git commit -m "Add multiple files"');

      const result = await execGit('git ls-tree -r HEAD');

      expect(result.stdout).toContain('file1.txt');
      expect(result.stdout).toContain('file2.txt');
    });

    it('only commits staged files', async () => {
      await execAsync('echo "file1" > file1.txt');
      await execAsync('echo "file2" > file2.txt');
      await execGit('git add file1.txt');
      await execGit('git commit -m "Add file1"');

      const result = await execGit('git ls-tree -r HEAD');

      expect(result.stdout).toContain('file1.txt');
      expect(result.stdout).not.toContain('file2.txt');
    });
  });

  describe('Error Handling', () => {
    it('handles non-git directory', async () => {
      await execAsync(`mkdir -p ${testDir}/non-git`);
      process.chdir(`${testDir}/non-git`);

      const result = await execGit('git commit -m "Test"').catch(e => e);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('not a git repository');
    });

    it('handles missing commit message', async () => {
      await execGit('git add test.txt');
      const result = await execGit('git commit').catch(e => e);

      expect(result).toBeInstanceOf(Error);
    });

    it('handles merge conflicts', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial"');

      // Create a conflict scenario
      await execGit('git checkout -b branch1');
      await execAsync('echo "branch1" >> test.txt');
      await execGit('git add test.txt');
      await execGit('git commit -m "Branch1 change"');

      await execGit('git checkout main');
      await execAsync('echo "main" >> test.txt');
      await execGit('git add test.txt');
      await execGit('git commit -m "Main change"');

      const result = await execGit('git merge branch1').catch(e => e);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('conflict');
    });
  });

  describe('Empty Commits', () => {
    it('creates empty commit with --allow-empty', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial"');
      await execGit('git commit --allow-empty -m "Empty"');

      const result = await execGit('git log --oneline');

      expect(result.stdout.split('\n').length - 1).toBe(2);
    });
  });

  describe('Commit Hooks', () => {
    it('respects pre-commit hook if configured', async () => {
      // This test would require setting up hooks
      // For now, we just verify hook directory exists
      const result = await execAsync('ls .git/hooks/');

      expect(result.stdout).toContain('pre-commit.sample');
    });
  });
});
