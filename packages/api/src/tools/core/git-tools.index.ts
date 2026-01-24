/**
 * Git Tools Export
 *
 * Exports all Git-related tools for registration
 */

export { gitStatusTool } from './git-status.tool';
export { gitDiffTool } from './git-diff.tool';
export { gitCommitTool } from './git-commit.tool';

/**
 * All Git tools for easy registration
 */
export const gitTools = [
  'git-status.tool',
  'git-diff.tool',
  'git-commit.tool',
];
