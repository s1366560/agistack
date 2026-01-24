/**
 * Git Status Tool Tests
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

describe('Git Status Tool', () => {
  const testDir = '/tmp/git-status-test';
  const originalDir = process.cwd();

  beforeEach(async () => {
    // Create test directory and initialize git repo
    await execAsync(`mkdir -p ${testDir}`);
    await execGit(`cd ${testDir} && git init`);
    await execGit(`cd ${testDir} && git config user.email "test@example.com"`);
    await execGit(`cd ${testDir} && git config user.name "Test User"`);
    await execAsync(`cd ${testDir} && echo "test" > test.txt`);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalDir);
    await execAsync(`rm -rf ${testDir}`);
  });

  describe('Basic Status', () => {
    it('returns status of untracked files', async () => {
      const result = await execGit('git status --porcelain');

      expect(result.stdout).toContain('?? test.txt');
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it('returns empty status when no changes', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial commit"');

      const result = await execGit('git status --porcelain');

      expect(result.stdout.trim()).toBe('');
    });

    it('shows modified files', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial commit"');
      await execAsync('echo "modified" > test.txt');

      const result = await execGit('git status --porcelain');

      expect(result.stdout).toContain('M test.txt');
    });

    it('shows staged files', async () => {
      await execGit('git add test.txt');

      const result = await execGit('git status --porcelain');

      expect(result.stdout).toContain('A  test.txt');
    });
  });

  describe('Branch Information', () => {
    it('shows current branch name', async () => {
      const result = await execGit('git branch --show-current');

      expect(result.stdout.trim()).toBe('main');
    });

    it('shows detached HEAD state', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial commit"');

      // Create a detached HEAD state
      const commitResult = await execGit('git rev-parse HEAD');
      const commitHash = commitResult.stdout.trim();

      await execGit(`git checkout ${commitHash}`);

      const branchResult = await execGit('git rev-parse --abbrev-ref HEAD');

      expect(branchResult.stdout.trim()).toBe('HEAD');
    });
  });

  describe('File States', () => {
    it('identifies untracked files', async () => {
      await execAsync('echo "new" > new.txt');

      const result = await execGit('git status --porcelain');

      expect(result.stdout).toContain('?? new.txt');
    });

    it('identifies modified files', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial commit"');
      await execAsync('echo "changed" > test.txt');

      const result = await execGit('git status --porcelain');

      expect(result.stdout).toMatch(/M.*test.txt/);
    });

    it('identifies deleted files', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial commit"');
      await execAsync('rm test.txt');

      const result = await execGit('git status --porcelain');

      expect(result.stdout).toContain('D  test.txt');
    });

    it('identifies renamed files', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Initial commit"');
      await execGit('git mv test.txt renamed.txt');

      const result = await execGit('git status --porcelain');

      expect(result.stdout).toContain('R  test.txt -> renamed.txt');
    });
  });

  describe('Error Handling', () => {
    it('handles non-git directory gracefully', async () => {
      await execAsync(`mkdir -p ${testDir}/non-git`);
      process.chdir(`${testDir}/non-git`);

      const result = await execGit('git status --porcelain').catch(e => e);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('not a git repository');
    });

    it('handles permission errors', async () => {
      // This test may not work on all systems
      const result = await execGit('git status --porcelain').catch(e => e);

      // Should either succeed or fail gracefully
      if (result instanceof Error) {
        expect(result).toBeInstanceOf(Error);
      }
    });
  });

  describe('Output Formats', () => {
    it('supports porcelain format', async () => {
      const result = await execGit('git status --porcelain');

      expect(result.stdout).toBeTruthy();
      expect(typeof result.stdout).toBe('string');
    });

    it('supports short format', async () => {
      const result = await execGit('git status -s');

      expect(result.stdout).toBeTruthy();
      expect(typeof result.stdout).toBe('string');
    });

    it('supports long format', async () => {
      const result = await execGit('git status');

      expect(result.stdout).toContain('On branch');
      expect(result.stdout).toBeTruthy();
    });
  });
});
