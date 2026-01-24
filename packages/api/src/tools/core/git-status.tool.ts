/**
 * Git Status Tool
 *
 * Provides Git status information for the current repository
 */

import { ToolDefinition } from '@agistack/shared/types/tool';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git Status Tool Definition
 */
export const gitStatusTool: ToolDefinition = {
  name: 'git_status',
  description: 'Get the current Git repository status, including branch, modified files, and untracked files',
  category: 'command',

  inputSchema: z.object({
    format: z.enum(['porcelain', 'short', 'long']).optional()
      .default('porcelain')
      .describe('Output format: porcelain (machine-readable), short, or long'),
    path: z.string().optional()
      .describe('Path to check status for (default: current directory)'),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    data: z.object({
      branch: z.string(),
      status: z.string(),
      files: z.array(z.object({
        status: z.string(),
        path: z.string(),
      })),
    }),
  }),

  dangerous: false,
  enabled: true,

  handler: async (input: any) => {
    try {
      const { format = 'porcelain', path } = input;

      // Build git status command
      let command = 'git status';
      if (format === 'porcelain') {
        command += ' --porcelain';
      } else if (format === 'short') {
        command += ' -s';
      }

      // Add path if specified
      if (path) {
        command += ` ${path}`;
      }

      const result = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // Get current branch
      const branchResult = await execAsync('git branch --show-current');
      const branch = branchResult.stdout.trim();

      // Parse porcelain format
      if (format === 'porcelain') {
        const files = result.stdout
          .trim()
          .split('\n')
          .filter((line: string) => line.length > 0)
          .map((line: string) => ({
            status: line.substring(0, 2).trim(),
            path: line.substring(3),
          }));

        return {
          success: true,
          data: {
            branch,
            status: result.stdout,
            files,
          },
        };
      }

      // For other formats, return raw output
      return {
        success: true,
        data: {
          branch,
          status: result.stdout,
          files: [],
        },
      };
    } catch (error: any) {
      // Check if it's a "not a git repository" error
      const stderr = error.stderr || '';
      const message = error.message || '';

      if (stderr.includes('not a git repository') ||
          message.includes('not a git repository')) {
        return {
          success: false,
          error: 'Not a git repository',
          data: {
            branch: '',
            status: '',
            files: [],
          },
        };
      }

      return {
        success: false,
        error: message || 'Failed to get git status',
        data: {
          branch: '',
          status: '',
          files: [],
        },
      };
    }
  },
};
