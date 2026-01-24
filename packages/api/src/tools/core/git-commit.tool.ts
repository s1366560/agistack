/**
 * Git Commit Tool
 *
 * Creates Git commits with staged files
 */

import { ToolDefinition } from '@agistack/shared/types/tool';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git Commit Tool Definition
 */
export const gitCommitTool: ToolDefinition = {
  name: 'git_commit',
  description: 'Create a Git commit with staged files. Files must be staged with git add before committing.',
  category: 'command',

  inputSchema: z.object({
    message: z.string().min(1)
      .describe('Commit message (required)'),
    allowEmpty: z.boolean().optional()
      .default(false)
      .describe('Allow creating empty commits'),
    amend: z.boolean().optional()
      .default(false)
      .describe('Amend the previous commit instead of creating a new one'),
    author: z.object({
      name: z.string().describe('Author name'),
      email: z.string().email().describe('Author email'),
    }).optional()
      .describe('Override commit author'),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    data: z.object({
      commitHash: z.string(),
      message: z.string(),
      author: z.object({
        name: z.string(),
        email: z.string(),
      }),
      branch: z.string(),
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
      const { message, allowEmpty = false, amend = false, author } = input;

      // Build git commit command
      let command = 'git commit';

      // Add message
      command += ` -m "${message.replace(/"/g, '\\"')}"`;

      // Add allow-empty flag
      if (allowEmpty) {
        command += ' --allow-empty';
      }

      // Add amend flag
      if (amend) {
        command += ' --amend';
      }

      // Add author override if specified
      if (author) {
        command += ` --author="${author.name} <${author.email}>"`;
      }

      const result = await execAsync(command, {
        env: {
          ...process.env,
          // Set locale to ensure consistent English output
          LC_ALL: 'C',
          LANG: 'C',
        },
      });

      // Get commit hash
      const hashResult = await execAsync('git rev-parse HEAD');
      const commitHash = hashResult.stdout.trim();

      // Get branch
      const branchResult = await execAsync('git branch --show-current');
      const branch = branchResult.stdout.trim();

      // Get commit author
      const authorResult = await execAsync('git log --format=%an -n 1 HEAD');
      const emailResult = await execAsync('git log --format=%ae -n 1 HEAD');

      // Get committed files
      const filesResult = await execAsync('git show --name-status --pretty="" HEAD');
      const files = filesResult.stdout
        .trim()
        .split('\n')
        .filter((line: string) => line.length > 0)
        .map((line: string) => {
          const [status, ...pathParts] = line.split('\t');
          return {
            status,
            path: pathParts.join('\t'),
          };
        });

      return {
        success: true,
        data: {
          commitHash,
          message,
          author: {
            name: authorResult.stdout.trim(),
            email: emailResult.stdout.trim(),
          },
          branch,
          files,
        },
      };
    } catch (error: any) {
      // Check if it's a "nothing to commit" error
      const stderr = error.stderr || '';
      const stdout = error.stdout || '';
      const message = error.message || '';

      if (stderr.includes('nothing to commit') ||
          stdout.includes('nothing to commit') ||
          message.includes('nothing to commit') ||
          stderr.includes('no changes added') ||
          stdout.includes('no changes added') ||
          message.includes('no changes added')) {
        return {
          success: false,
          error: 'No changes staged for commit. Use git add to stage files first.',
          data: {
            commitHash: '',
            message: '',
            author: {
              name: '',
              email: '',
            },
            branch: '',
            files: [],
          },
        };
      }

      return {
        success: false,
        error: message || 'Failed to create commit',
        data: {
          commitHash: '',
          message: '',
          author: {
            name: '',
            email: '',
          },
          branch: '',
          files: [],
        },
      };
    }
  },
};
