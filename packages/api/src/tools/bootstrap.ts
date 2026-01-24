/**
 * Tool Bootstrap
 *
 * Central entry point for registering all tools with the ToolRegistry
 */

import { ToolRegistry } from './registry';
import { registerCoreTools } from './core';

/**
 * Bootstrap all tools
 *
 * This function registers all available tools with the provided registry.
 * If no registry is provided, it uses the singleton instance.
 *
 * @param registry - Optional registry instance (defaults to singleton)
 */
export function bootstrapTools(registry?: ToolRegistry): void {
  // Use singleton if no registry provided
  const targetRegistry = registry || ToolRegistry.getInstance();

  try {
    // Register core tools (file, code, and git operations)
    registerCoreTools(targetRegistry);
  } catch (error) {
    console.error('Error bootstrapping tools:', error);
    // Continue even if some tools fail to register
  }
}

/**
 * Auto-bootstrap with singleton registry
 *
 * Convenience function to bootstrap tools with the singleton registry
 */
export function autoBootstrapTools(): void {
  bootstrapTools(ToolRegistry.getInstance());
}
