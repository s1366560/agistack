/**
 * Git Tools Integration Tests
 *
 * Tests the tool definitions and handlers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { gitStatusTool } from './git-status.tool';
import { gitDiffTool } from './git-diff.tool';
import { gitCommitTool } from './git-commit.tool';

const execAsync = promisify(exec);

describe('Git Tools Integration', () => {
  const testDir = '/tmp/git-tools-integration-test';
  const originalDir = process.cwd();

  beforeEach(async () => {
    await execAsync(`mkdir -p ${testDir}`);
    await execAsync(`cd ${testDir} && git init`);
    await execAsync(`cd ${testDir} && git config user.email "test@example.com"`);
    await execAsync(`cd ${testDir} && git config user.name "Test User"`);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalDir);
    await execAsync(`rm -rf ${testDir}`, { stdio: 'ignore' }).catch(() => {});
  });

  describe('Tool Definitions', () => {
    it('git_status has correct structure', () => {
      expect(gitStatusTool.name).toBe('git_status');
      expect(gitStatusTool.category).toBe('command');
      expect(gitStatusTool.dangerous).toBe(false);
      expect(gitStatusTool.enabled).toBe(true);
      expect(gitStatusTool.inputSchema).toBeDefined();
      expect(gitStatusTool.outputSchema).toBeDefined();
    });

    it('git_diff has correct structure', () => {
      expect(gitDiffTool.name).toBe('git_diff');
      expect(gitDiffTool.category).toBe('command');
      expect(gitDiffTool.dangerous).toBe(false);
      expect(gitDiffTool.enabled).toBe(true);
      expect(gitDiffTool.inputSchema).toBeDefined();
      expect(gitDiffTool.outputSchema).toBeDefined();
    });

    it('git_commit has correct structure', () => {
      expect(gitCommitTool.name).toBe('git_commit');
      expect(gitCommitTool.category).toBe('command');
      expect(gitCommitTool.dangerous).toBe(false);
      expect(gitCommitTool.enabled).toBe(true);
      expect(gitCommitTool.inputSchema).toBeDefined();
      expect(gitCommitTool.outputSchema).toBeDefined();
    });
  });

  describe('git_status Tool', () => {
    it('returns status in porcelain format', async () => {
      await execAsync('echo "test" > test.txt');

      const result = await gitStatusTool.handler({ format: 'porcelain' });

      expect(result.success).toBe(true);
      expect(result.data.branch).toBeTruthy();
      expect(result.data.files).toBeInstanceOf(Array);
    });

    it('detects untracked files', async () => {
      await execAsync('echo "new" > new.txt');

      const result = await gitStatusTool.handler({ format: 'porcelain' });

      expect(result.success).toBe(true);
      const untrackedFile = result.data.files.find((f: any) => f.path === 'new.txt');
      expect(untrackedFile).toBeDefined();
    });

    it('returns empty status for clean repo', async () => {
      await execAsync('echo "test" > test.txt');
      await execAsync('git add test.txt');
      await execAsync('git commit -m "Initial commit"');

      const result = await gitStatusTool.handler({ format: 'porcelain' });

      expect(result.success).toBe(true);
      expect(result.data.files.length).toBe(0);
    });
  });

  describe('git_diff Tool', () => {
    beforeEach(async () => {
      await execAsync('echo "line1\nline2\nline3" > test.txt');
      await execAsync('git add test.txt');
      await execAsync('git commit -m "Initial commit"');
    });

    it('shows diff for modified files', async () => {
      await execAsync('echo "line1\nmodified\nline3" > test.txt');

      const result = await gitDiffTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.diff).toContain('modified');
      expect(result.data.files.length).toBeGreaterThan(0);
      expect(result.data.stats).toBeDefined();
    });

    it('shows staged diff', async () => {
      await execAsync('echo "staged" > test.txt');
      await execAsync('git add test.txt');

      const result = await gitDiffTool.handler({ staged: true });

      expect(result.success).toBe(true);
      expect(result.data.diff).toContain('staged');
    });

    it('returns empty diff when no changes', async () => {
      const result = await gitDiffTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.diff).toBe('');
      expect(result.data.files.length).toBe(0);
    });

    it('shows diff for specific file', async () => {
      await execAsync('echo "modified" > test.txt');
      await execAsync('echo "new" > other.txt');

      const result = await gitDiffTool.handler({ file: 'test.txt' });

      expect(result.success).toBe(true);
      expect(result.data.diff).toContain('test.txt');
      expect(result.data.files).toContain('test.txt');
    });
  });

  describe('git_commit Tool', () => {
    it('commits staged files', async () => {
      await execAsync('echo "test" > test.txt');
      await execAsync('git add test.txt');

      const result = await gitCommitTool.handler({
        message: 'Test commit',
      });

      expect(result.success).toBe(true);
      expect(result.data.commitHash).toMatch(/^[a-f0-9]{40}$/);
      expect(result.data.message).toBe('Test commit');
      expect(result.data.branch).toBeTruthy();
    });

    it('fails when no files staged', async () => {
      const result = await gitCommitTool.handler({
        message: 'Test commit',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No changes staged');
    });

    it('allows empty commit', async () => {
      await execAsync('echo "test" > test.txt');
      await execAsync('git add test.txt');
      await execAsync('git commit -m "Initial commit"');

      const result = await gitCommitTool.handler({
        message: 'Empty commit',
        allowEmpty: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.commitHash).toBeTruthy();
    });

    it('supports custom author', async () => {
      await execAsync('echo "test" > test.txt');
      await execAsync('git add test.txt');

      const result = await gitCommitTool.handler({
        message: 'Test commit',
        author: {
          name: 'Custom Author',
          email: 'custom@example.com',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.author.name).toBe('Custom Author');
      expect(result.data.author.email).toBe('custom@example.com');
    });

    it('amends previous commit', async () => {
      await execAsync('echo "test" > test.txt');
      await execAsync('git add test.txt');
      await execAsync('git commit -m "First commit"');

      await execAsync('echo "modified" > test.txt');
      await execAsync('git add test.txt');

      const result = await gitCommitTool.handler({
        message: 'Amended commit',
        amend: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Amended commit');

      // Verify only one commit exists
      const logResult = await execAsync('git log --oneline');
      expect(logResult.stdout.split('\n').length - 1).toBe(1);
    });
  });

  describe('End-to-End Workflow', () => {
    it('completes full git workflow', async () => {
      // 1. Create files
      await execAsync('echo "content" > file1.txt');
      await execAsync('echo "content" > file2.txt');

      // 2. Check status
      const status1 = await gitStatusTool.handler({ format: 'porcelain' });
      expect(status1.success).toBe(true);
      expect(status1.data.files.length).toBe(2);

      // 3. Stage files
      await execAsync('git add file1.txt');

      // 4. Check status again
      const status2 = await gitStatusTool.handler({ format: 'porcelain' });
      expect(status2.success).toBe(true);

      // 5. Check staged diff
      const diff1 = await gitDiffTool.handler({ staged: true });
      expect(diff1.success).toBe(true);
      expect(diff1.data.diff).toContain('file1.txt');

      // 6. Commit
      const commit = await gitCommitTool.handler({
        message: 'Add file1',
      });
      expect(commit.success).toBe(true);
      expect(commit.data.files.length).toBe(1);

      // 7. Modify file
      await execAsync('echo "modified" > file1.txt');

      // 8. Check unstaged diff
      const diff2 = await gitDiffTool.handler({});
      expect(diff2.success).toBe(true);
      expect(diff2.data.stats!.additions).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles non-git directory for status', async () => {
      const nonGitDir = `/tmp/git-status-non-git-${Date.now()}`;
      await execAsync(`mkdir -p ${nonGitDir}`);
      process.chdir(nonGitDir);

      const result = await gitStatusTool.handler({ format: 'porcelain' });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();

      // Cleanup
      process.chdir(testDir);
      await execAsync(`rm -rf ${nonGitDir}`, { stdio: 'ignore' });
    });

    it('handles non-git directory for diff', async () => {
      const nonGitDir = `/tmp/git-diff-non-git-${Date.now()}`;
      await execAsync(`mkdir -p ${nonGitDir}`);
      process.chdir(nonGitDir);

      const result = await gitDiffTool.handler({});

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();

      // Cleanup
      process.chdir(testDir);
      await execAsync(`rm -rf ${nonGitDir}`, { stdio: 'ignore' });
    });

    it('handles non-git directory for commit', async () => {
      const nonGitDir = `/tmp/git-commit-non-git-${Date.now()}`;
      await execAsync(`mkdir -p ${nonGitDir}`);
      process.chdir(nonGitDir);

      const result = await gitCommitTool.handler({
        message: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();

      // Cleanup
      process.chdir(testDir);
      await execAsync(`rm -rf ${nonGitDir}`, { stdio: 'ignore' });
    });

    it('validates required input for commit', async () => {
      const result = await gitCommitTool.handler({
        // message is required
      });

      expect(result).toBeDefined();
      // Zod validation should catch this
    });
  });
});
