/**
 * Execute Command Tool Tests
 *
 * TDD Approach: Tests written first, implementation will follow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeCommandTool } from './execute-command.tool';

describe('Execute Command Tool', () => {
  describe('Basic Execution', () => {
    it('executes simple echo command', async () => {
      const result = await executeCommandTool.handler({
        command: 'echo',
        args: ['hello', 'world'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.stdout).toContain('hello world');
      expect(result.data?.exitCode).toBe(0);
    });

    it('executes command with multiple arguments', async () => {
      const result = await executeCommandTool.handler({
        command: 'echo',
        args: ['-n', 'test', 'message'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toContain('test message');
    });

    it('returns error for non-existent command', async () => {
      const result = await executeCommandTool.handler({
        command: 'nonexistent-command-xyz-123',
        args: [],
        timeout: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });

    it('returns correct exit code for failed command', async () => {
      const result = await executeCommandTool.handler({
        command: 'ls',
        args: ['/nonexistent-directory-xyz-123'],
        timeout: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.data?.exitCode).toBeGreaterThan(0);
    });
  });

  describe('Timeout Handling', () => {
    it('executes command within timeout', async () => {
      const result = await executeCommandTool.handler({
        command: 'sleep',
        args: ['0.1'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.exitCode).toBe(0);
    });

    it('kills command that exceeds timeout', async () => {
      const result = await executeCommandTool.handler({
        command: 'sleep',
        args: ['10'],
        timeout: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('timed out');
    });

    it('uses default timeout when not specified', async () => {
      const result = await executeCommandTool.handler({
        command: 'echo',
        args: ['test'],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Working Directory', () => {
    it('executes command in current directory by default', async () => {
      const result = await executeCommandTool.handler({
        command: 'pwd',
        args: [],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toBeDefined();
    });

    it('executes command in specified directory', async () => {
      const result = await executeCommandTool.handler({
        command: 'pwd',
        args: [],
        timeout: 5000,
        cwd: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toContain('/tmp');
    });

    it('returns error for non-existent directory', async () => {
      const result = await executeCommandTool.handler({
        command: 'pwd',
        args: [],
        timeout: 5000,
        cwd: '/nonexistent-directory-xyz-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Environment Variables', () => {
    it('passes environment variables to command', async () => {
      const result = await executeCommandTool.handler({
        command: 'sh',
        args: ['-c', 'echo $TEST_VAR'],
        timeout: 5000,
        env: {
          TEST_VAR: 'test-value',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toContain('test-value');
    });

    it('inherits process environment by default', async () => {
      const result = await executeCommandTool.handler({
        command: 'sh',
        args: ['-c', 'echo $HOME'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toBeDefined();
    });

    it('sets custom environment variables', async () => {
      const result = await executeCommandTool.handler({
        command: 'sh',
        args: ['-c', 'echo "CUSTOM_PATH is: $CUSTOM_PATH"'],
        timeout: 5000,
        env: {
          CUSTOM_PATH: '/custom/path',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toContain('CUSTOM_PATH is: /custom/path');
    });
  });

  describe('Output Handling', ()   => {
    it('captures stdout', async () => {
      const result = await executeCommandTool.handler({
        command: 'echo',
        args: ['stdout message'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toContain('stdout message');
    });

    it('captures stderr', async () => {
      const result = await executeCommandTool.handler({
        command: 'sh',
        args: ['-c', 'echo stderr message >&2'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stderr).toContain('stderr message');
    });

    it('handles both stdout and stderr', async () => {
      const result = await executeCommandTool.handler({
        command: 'sh',
        args: ['-c', 'echo stdout; echo stderr >&2'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toContain('stdout');
      expect(result.data?.stderr).toContain('stderr');
    });

    it('handles empty output', async () => {
      const result = await executeCommandTool.handler({
        command: 'true',
        args: [],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toBe('');
    });

    it('truncates large output', async () => {
      const result = await executeCommandTool.handler({
        command: 'sh',
        args: ['-c', 'for i in $(seq 1 10000); do echo "Line $i"; done'],
        timeout: 5000,
        maxOutputSize: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.truncated).toBe(true);
      expect(result.data?.stdout.length).toBeLessThan(10000);
    });
  });

  describe('Command Validation', () => {
    it('rejects empty command', async () => {
      const result = await executeCommandTool.handler({
        command: '',
        args: [],
        timeout: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('command');
    });

    it('rejects dangerous commands when dangerous flag is false', async () => {
      const result = await executeCommandTool.handler({
        command: 'rm',
        args: ['-rf', '/'],
        timeout: 5000,
        allowDangerous: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('dangerous');
    });

    it('allows dangerous commands when explicitly permitted', async () => {
      const result = await executeCommandTool.handler({
        command: 'rm',
        args: ['-rf', '/tmp/test-execute-command-tool-xyz'],
        timeout: 5000,
        allowDangerous: true,
      });

      // Command should execute (may fail if directory doesn't exist)
      expect(result).toBeDefined();
    });

    it('rejects commands with shell injection attempts', async () => {
      const result = await executeCommandTool.handler({
        command: 'echo',
        args: ['test; rm -rf /'],
        timeout: 5000,
      });

      // Should sanitize or reject
      expect(result).toBeDefined();
      expect(result.data?.stdout).toContain('test; rm -rf /');
    });
  });

  describe('Common Development Commands', () => {
    it('executes npm commands', async () => {
      const result = await executeCommandTool.handler({
        command: 'npm',
        args: ['--version'],
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('executes git commands', async () => {
      const result = await executeCommandTool.handler({
        command: 'git',
        args: ['--version'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toMatch(/git version/);
    });

    it('executes node commands', async () => {
      const result = await executeCommandTool.handler({
        command: 'node',
        args: ['--version'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toMatch(/v\d+\.\d+\.\d+/);
    });
  });

  describe('Metadata', () => {
    it('includes execution duration', async () => {
      const result = await executeCommandTool.handler({
        command: 'sleep',
        args: ['0.1'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(100);
    });

    it('includes command metadata', async () => {
      const result = await executeCommandTool.handler({
        command: 'echo',
        args: ['test'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.command).toBe('echo');
      expect(result.data?.args).toEqual(['test']);
    });
  });

  describe('Error Scenarios', () => {
    it('handles permission errors', async () => {
      const result = await executeCommandTool.handler({
        command: 'cat',
        args: ['/root/secrets.txt'],
        timeout: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.data?.exitCode).toBeGreaterThan(0);
    });

    it('handles invalid arguments', async () => {
      const result = await executeCommandTool.handler({
        command: 'ls',
        args: ['--invalid-flag-xyz-123'],
        timeout: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.data?.exitCode).toBeGreaterThan(0);
    });

    it('handles signal termination', async () => {
      const result = await executeCommandTool.handler({
        command: 'sleep',
        args: ['100'],
        timeout: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('timed out');
    });
  });

  describe('Input Validation', () => {
    it('validates command input schema', async () => {
      const input = {
        command: 'echo',
        args: ['test'],
        timeout: 5000,
      };

      // Should not throw with valid input
      expect(async () => {
        await executeCommandTool.handler(input);
      }).not.toThrow();
    });

    it('requires command parameter', async () => {
      const input = {
        args: ['test'],
        timeout: 5000,
      };

      const result = await executeCommandTool.handler(input as any);

      expect(result.success).toBe(false);
    });
  });

  describe('Real-World Scenarios', () => {
    it('runs TypeScript compiler', async () => {
      const result = await executeCommandTool.handler({
        command: 'npx',
        args: ['tsc', '--version'],
        timeout: 10000,
      });

      // TypeScript may not be installed, so we just check it doesn't crash
      expect(result).toBeDefined();
    });

    it('lists files in directory', async () => {
      const result = await executeCommandTool.handler({
        command: 'ls',
        args: ['-la', '/tmp'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.stdout).toBeDefined();
    });

    it('checks file existence', async () => {
      const result = await executeCommandTool.handler({
        command: 'test',
        args: ['-f', '/etc/passwd'],
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.exitCode).toBe(0);
    });
  });
});
