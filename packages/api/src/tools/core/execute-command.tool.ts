/**
 * Execute Command Tool
 *
 * Safely executes shell commands with timeout, working directory,
 * environment variable control, and output capture
 */

import { ToolDefinition } from '@agistack/shared/types/tool';
import { z } from 'zod';
import { spawn } from 'child_process';

/**
 * List of dangerous commands that require explicit permission
 */
const DANGEROUS_COMMANDS = [
  'rm',
  'rmdir',
  'mkfs',
  'dd',
  'chmod',
  'chown',
  'kill',
  'killall',
  'pkill',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'init',
  'systemctl',
  'service',
  'fdisk',
  'parted',
  'mkfs.*',
  'format',
  'del',
  'delete',
];

/**
 * Check if a command is dangerous
 */
function isDangerousCommand(command: string): boolean {
  const cmd = command.toLowerCase().trim();
  return DANGEROUS_COMMANDS.some((dangerous) => {
    const regex = new RegExp(`^${dangerous.replace('.', '\\.')}(\\s|$)`);
    return regex.test(cmd);
  });
}

/**
 * Execute Command Tool Definition
 */
export const executeCommandTool: ToolDefinition = {
  name: 'execute_command',
  description:
    'Execute shell commands safely with timeout, working directory, and environment control. Useful for running npm, git, build tools, and other development commands.',
  category: 'command',

  inputSchema: z
    .object({
      command: z.string().min(1).describe('Command to execute (e.g., npm, git, ls)'),
      args: z.array(z.string()).default([]).describe('Command arguments'),
      timeout: z.number().positive().default(30000).describe('Timeout in milliseconds (default: 30000)'),
      cwd: z.string().optional().describe('Working directory (default: current directory)'),
      env: z.record(z.string()).optional().describe('Environment variables to set'),
      allowDangerous: z.boolean().default(false).describe('Allow execution of dangerous commands (rm, dd, etc.)'),
      maxOutputSize: z.number().positive().default(10000000).describe('Maximum output size in bytes (default: 10MB)'),
    })
    .strict(),

  outputSchema: z.object({
    success: z.boolean(),
    data: z.object({
      stdout: z.string().describe('Standard output from command'),
      stderr: z.string().describe('Standard error output'),
      exitCode: z.number().describe('Process exit code'),
      command: z.string().describe('Command that was executed'),
      args: z.array(z.string()).describe('Arguments passed to command'),
      truncated: z.boolean().describe('Whether output was truncated due to size limit'),
    }),
  }),

  dangerous: true,
  enabled: true,

  metadata: {
    version: '1.0.0',
    author: 'Agistack',
    tags: ['shell', 'command', 'execution', 'development'],
  },

  handler: async (input: any) => {
    const startTime = Date.now();
    const { command, args = [], timeout = 30000, cwd, env = {}, allowDangerous = false, maxOutputSize = 10000000 } = input;

    // Validate command
    if (!command || command.trim().length === 0) {
      return {
        success: false,
        error: 'Command is required and cannot be empty',
      };
    }

    // Check for dangerous commands
    if (isDangerousCommand(command) && !allowDangerous) {
      return {
        success: false,
        error: `Command "${command}" is dangerous. Set allowDangerous=true to execute.`,
      };
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      // Validate working directory
      if (cwd) {
        try {
          process.chdir(cwd);
        } catch (error: any) {
          resolve({
            success: false,
            error: `Invalid working directory: ${error.message}`,
            metadata: {
              durationMs: Date.now() - startTime,
            },
          });
          return;
        }
      }

      // Prepare environment variables
      const processEnv = {
        ...process.env,
        ...env,
      };

      // Spawn the command
      const childProcess = spawn(command, args, {
        cwd: cwd || process.cwd(),
        env: processEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        killed = true;
        childProcess.kill('SIGTERM');
      }, timeout);

      // Collect stdout with truncation
      childProcess.stdout?.on('data', (data) => {
        if (stdout.length < maxOutputSize) {
          stdout += data.toString();
          if (stdout.length > maxOutputSize) {
            stdout = stdout.substring(0, maxOutputSize);
          }
        }
      });

      // Collect stderr with truncation
      childProcess.stderr?.on('data', (data) => {
        if (stderr.length < maxOutputSize) {
          stderr += data.toString();
          if (stderr.length > maxOutputSize) {
            stderr = stderr.substring(0, maxOutputSize);
          }
        }
      });

      // Helper to build response object
      const buildResponse = (success: boolean, error?: string, exitCode = -1) => ({
        success,
        error,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
          command,
          args,
          truncated: stdout.length >= maxOutputSize || stderr.length >= maxOutputSize,
        },
        metadata: {
          durationMs: Date.now() - startTime,
        },
      });

      // Handle process exit
      childProcess.on('close', (code, signal) => {
        clearTimeout(timeoutHandle);

        if (killed) {
          resolve(buildResponse(false, `Command timed out after ${timeout}ms`));
        } else if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          resolve(buildResponse(false, `Command terminated by signal: ${signal}`));
        } else {
          resolve(buildResponse(code === 0, code !== 0 ? stderr.trim() : undefined, code || 0));
        }
      });

      // Handle spawn errors
      childProcess.on('error', (error) => {
        clearTimeout(timeoutHandle);

        if (error.code === 'ENOENT') {
          resolve({
            success: false,
            error: `Command not found: ${command}. Make sure it is installed and in PATH.`,
            data: {
              stdout: '',
              stderr: error.message,
              exitCode: -1,
              command,
              args,
              truncated: false,
            },
            metadata: {
              durationMs: Date.now() - startTime,
            },
          });
        } else {
          resolve(buildResponse(false, `Failed to execute command: ${error.message}`));
        }
      });
    });
  },
};
