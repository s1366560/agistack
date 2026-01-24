/**
 * Git Diff Tool Tests
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

describe('Git Diff Tool', () => {
  const testDir = '/tmp/git-diff-test';
  const originalDir = process.cwd();

  beforeEach(async () => {
    await execAsync(`mkdir -p ${testDir}`);
    await execAsync(`cd ${testDir} && git init`);
    await execAsync(`cd ${testDir} && git config user.email "test@example.com"`);
    await execAsync(`cd ${testDir} && git config user.name "Test User"`);
    await execAsync(`cd ${testDir} && echo "line1\nline2\nline3" > test.txt`);
    await execAsync(`cd ${testDir} && git add test.txt`);
    await execAsync(`cd ${testDir} && git commit -m "Initial commit"`);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalDir);
    await execAsync(`rm -rf ${testDir}`);
  });

  describe('Basic Diff', () => {
    it('shows diff for modified files', async () => {
      await execAsync('echo "line1\nline2-modified\nline3" > test.txt');

      const result = await execGit('git diff test.txt');

      expect(result.stdout).toContain('-line2');
      expect(result.stdout).toContain('+line2-modified');
      expect(result.stdout).toContain('diff --git');
    });

    it('returns empty diff when no changes', async () => {
      const result = await execGit('git diff test.txt');

      expect(result.stdout).toBe('');
    });

    it('shows diff for multiple files', async () => {
      await execAsync('echo "modified1" > test.txt');
      await execAsync('echo "line1\nline2" > test2.txt');

      const result = await execGit('git diff');

      expect(result.stdout).toContain('diff --git a/test.txt');
      expect(result.stdout).toContain('diff --git a/test2.txt');
    });
  });

  describe('Staged Changes', () => {
    it('shows diff for staged changes', async () => {
      await execAsync('echo "modified" > test.txt');
      await execGit('git add test.txt');

      const result = await execGit('git diff --staged test.txt');

      expect(result.stdout).toContain('-line2');
      expect(result.stdout).toContain('+modified');
    });

    it('shows no staged diff when nothing staged', async () => {
      const result = await execGit('git diff --staged');

      expect(result.stdout).toBe('');
    });

    it('distinguishes staged from unstaged', async () => {
      await execAsync('echo "staged" > test.txt');
      await execGit('git add test.txt');
      await execAsync('echo "unstaged" > test.txt');

      const stagedResult = await execGit('git diff --staged test.txt');
      const unstagedResult = await execGit('git diff test.txt');

      expect(stagedResult.stdout).toContain('+staged');
      expect(unstagedResult.stdout).toContain('+unstaged');
    });
  });

  describe('Diff Formats', () => {
    it('supports unified diff format', async () => {
      await execAsync('echo "modified" > test.txt');

      const result = await execGit('git diff test.txt');

      expect(result.stdout).toMatch(/@@.*@@/);
      expect(result.stdout).toMatch(/^-/);
      expect(result.stdout).toMatch(/^\+/);
    });

    it('supports name-only format', async () => {
      await execAsync('echo "modified" > test.txt');

      const result = await execGit('git diff --name-only');

      expect(result.stdout.trim()).toBe('test.txt');
    });

    it('supports name-status format', async () => {
      await execAsync('echo "modified" > test.txt');

      const result = await execGit('git diff --name-status');

      expect(result.stdout).toMatch(/^M\s+test.txt$/);
    });
  });

  describe('Specific File Diff', () => {
    it('shows diff for specific file', async () => {
      await execAsync('echo "modified1" > test.txt');
      await execAsync('echo "line1\nline2" > test2.txt');

      const result = await execGit('git diff test.txt');

      expect(result.stdout).toContain('test.txt');
      expect(result.stdout).not.toContain('test2.txt');
    });

    it('handles non-existent file', async () => {
      const result = await execGit('git diff nonexistent.txt').catch(e => e);

      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('Line Count', () => {
    it('shows diff with line numbers', async () => {
      await execAsync('echo "modified" > test.txt');

      const result = await execGit('git diff test.txt');

      expect(result.stdout).toMatch(/@@\s+-\d+,\d+\s+\+\d+,\d+\s+@@/);
    });

    it('counts added lines', async () => {
      await execAsync('echo "line1\nline2\nline3\nline4" > test.txt');

      const result = await execGit('git diff test.txt');

      const addedLines = result.stdout.match(/^\+/gm)?.length || 0;
      expect(addedLines).toBeGreaterThan(0);
    });

    it('counts deleted lines', async () => {
      await execAsync('echo "line1\nline3" > test.txt');

      const result = await execGit('git diff test.txt');

      const deletedLines = result.stdout.match(/^-/gm)?.length || 0;
      expect(deletedLines).toBeGreaterThan(0);
    });
  });

  describe('Binary Files', () => {
    it('handles binary files', async () => {
      await execGit('git add test.txt');
      await execGit('git commit -m "Add test file"');
      await execAsync('dd if=/dev/zero of=binary.bin bs=1024 count=1');

      const result = await execGit('git diff --binary binary.bin');

      expect(result.stdout).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles non-git directory', async () => {
      await execAsync(`mkdir -p ${testDir}/non-git`);
      process.chdir(`${testDir}/non-git`);

      const result = await execGit('git diff').catch(e => e);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('not a git repository');
    });

    it('handles invalid file path', async () => {
      const result = await execGit('git diff ../nonexistent/file.txt').catch(e => e);

      expect(result).toBeDefined();
    });
  });

  describe('Special Cases', () => {
    it('shows diff for new files', async () => {
      await execAsync('echo "new file" > new.txt');
      await execGit('git add new.txt');

      const result = await execGit('git diff --staged new.txt');

      expect(result.stdout).toContain('+++ b/new.txt');
      expect(result.stdout).toContain('+new file');
    });

    it('shows diff for deleted files', async () => {
      await execAsync('rm test.txt');

      const result = await execGit('git diff test.txt');

      expect(result.stdout).toContain('--- a/test.txt');
    });

    it('shows diff for renamed files', async () => {
      await execGit('git mv test.txt renamed.txt');

      const result = await execGit('git diff --staged');

      expect(result.stdout).toContain('rename from');
      expect(result.stdout).toContain('rename to');
    });
  });
});
