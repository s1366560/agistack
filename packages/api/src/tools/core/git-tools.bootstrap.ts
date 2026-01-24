/**
 * Git Tools Bootstrap
 *
 * Automatically registers all Git tools with the ToolRegistry
 */

import { ToolRegistry } from '../registry';
import { gitStatusTool } from './git-status.tool';
import { gitDiffTool } from './git-diff.tool';
import { gitCommitTool } from './git-commit.tool';

/**
 * Bootstrap function to register all Git tools
 */
export function bootstrapGitTools(registry: ToolRegistry): void {
  registry.register(gitStatusTool);
  registry.register(gitDiffTool);
  registry.register(gitCommitTool);
}

/**
 * Auto-register with the singleton registry
 */
export function autoRegisterGitTools(): void {
  const registry = ToolRegistry.getInstance();
  bootstrapGitTools(registry);
}
