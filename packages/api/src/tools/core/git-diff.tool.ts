/**
 * Git Diff Tool
 *
 * Shows Git differences between commits, working tree, and files
 */

import { ToolDefinition } from '@agistack/shared/types/tool';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git Diff Tool Definition
 */
export const gitDiffTool: ToolDefinition = {
  name: 'git_diff',
  description: 'Show Git differences between commits, working tree, and specific files',
  category: 'command',

  inputSchema: z.object({
    file: z.string().optional()
      .describe('Specific file to show diff for (default: all files)'),
    staged: z.boolean().optional()
      .default(false)
      .describe('Show staged changes instead of unstaged'),
    format: z.enum(['unified', 'name-only', 'name-status']).optional()
      .default('unified')
      .describe('Output format'),
    contextLines: z.number().int().min(0).max(16).optional()
      .describe('Number of context lines to show (default: 3)'),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    data: z.object({
      diff: z.string(),
      files: z.array(z.string()),
      stats: z.object({
        additions: z.number(),
        deletions: z.number(),
        changes: z.number(),
      }).optional(),
    }),
  }),

  dangerous: false,
  enabled: true,

  handler: async (input: any) => {
    try {
      const { file, staged = false, format = 'unified', contextLines } = input;

      // Build git diff command
      let command = 'git diff';

      // Add staged flag if requested
      if (staged) {
        command += ' --staged';
      }

      // Add format options
      if (format === 'name-only') {
        command += ' --name-only';
      } else if (format === 'name-status') {
        command += ' --name-status';
      }

      // Add context lines if specified
      if (contextLines !== undefined) {
        command += ` -U${contextLines}`;
      }

      // Add file if specified
      if (file) {
        command += ` ${file}`;
      }

      const result = await execAsync(command, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large diffs
      });

      // Parse diff output
      const files: string[] = [];
      let additions = 0;
      let deletions = 0;

      if (format === 'unified') {
        // Extract changed files from diff
        const fileMatches = result.stdout.matchAll(/\+\+\+ b\/(.+)/g);
        for (const match of fileMatches) {
          if (match[1] && !files.includes(match[1])) {
            files.push(match[1]);
          }
        }

        // Count additions and deletions
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            additions++;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            deletions++;
          }
        }
      } else if (format === 'name-only' || format === 'name-status') {
        const filesList = result.stdout.trim().split('\n').filter((f: string) => f.length > 0);
        files.push(...filesList);
      }

      return {
        success: true,
        data: {
          diff: result.stdout,
          files,
          stats: format === 'unified' ? {
            additions,
            deletions,
            changes: additions + deletions,
          } : undefined,
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
            diff: '',
            files: [],
          },
        };
      }

      return {
        success: false,
        error: message || 'Failed to get git diff',
        data: {
          diff: '',
          files: [],
        },
      };
    }
  },
};
