/**
 * Core Tools - Built-in tools for the AI agent
 *
 * This module exports all core tools that can be used by AI agents
 * to interact with the codebase.
 */

import { readFileSyncTool } from './read-file.tool';
import { writeFileSyncTool } from './write-file.tool';
import { listFilesTool } from './list-files.tool';
import { searchCodeTool } from './search-code.tool';
import { gitStatusTool } from './git-status.tool';
import { gitDiffTool } from './git-diff.tool';
import { gitCommitTool } from './git-commit.tool';
import { executeCommandTool } from './execute-command.tool';
import { ToolRegistry } from '../registry';

// Re-export all tools for easy importing
export {
  readFileSyncTool,
  writeFileSyncTool,
  listFilesTool,
  searchCodeTool,
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,
  executeCommandTool,
};

export const coreTools = [
  readFileSyncTool,
  writeFileSyncTool,
  listFilesTool,
  searchCodeTool,
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,
  executeCommandTool,
];

// Export a function to register all core tools
export function registerCoreTools(registry: ToolRegistry): void {
  coreTools.forEach((tool) => registry.register(tool));
}
