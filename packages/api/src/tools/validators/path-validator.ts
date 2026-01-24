import { resolve, normalize, dirname, join } from 'node:path';
import { existsSync, realpathSync, statSync } from 'node:fs';

export interface PathValidationResult {
  valid: boolean;
  resolvedPath?: string;
  error?: string;
}

export interface PathValidatorOptions {
  allowedExtensions?: string[];
  deniedExtensions?: string[];
  caseSensitiveExtensions?: boolean;
}

export class PathValidator {
  private allowedRoots: Set<string>;
  private options: Required<PathValidatorOptions>;

  constructor(
    allowedRoots: string[] = [],
    options: PathValidatorOptions = {}
  ) {
    // Normalize and resolve all allowed roots to absolute paths
    this.allowedRoots = new Set(
      allowedRoots.map((root) => {
        try {
          if (existsSync(root)) {
            return realpathSync(root);
          }
          // If path doesn't exist, resolve to absolute path
          return resolve(root);
        } catch {
          // Fallback to normalization
          return normalize(root);
        }
      })
    );

    this.options = {
      allowedExtensions: options.allowedExtensions || [],
      deniedExtensions: options.deniedExtensions || [],
      caseSensitiveExtensions: options.caseSensitiveExtensions ?? false,
    };
  }

  validate(path: string | undefined, access: 'read' | 'write' | 'delete'): PathValidationResult {
    // Validate input
    if (!path || typeof path !== 'string') {
      return {
        valid: false,
        error: 'Path is required and must be a string',
      };
    }

    // Check for null bytes
    if (path.includes('\0')) {
      return {
        valid: false,
        error: 'Path cannot contain null bytes',
      };
    }

    // Sanitize the path first
    const sanitized = this.sanitize(path);

    // Resolve to absolute path (relative to current working directory)
    let resolvedPath: string;
    try {
      // Use resolve to handle relative paths properly
      const absolutePath = resolve(sanitized);

      // Resolve the real path by:
      // 1. If path exists, use realpath to resolve symlinks
      // 2. If path doesn't exist, resolve parent directory recursively and append remaining path
      if (existsSync(absolutePath)) {
        resolvedPath = realpathSync(absolutePath);
      } else {
        // Split path into parts
        const pathParts = sanitized.split('/').filter(Boolean);
        let currentPath = '/';
        let resolvedBase = absolutePath.startsWith('/') ? '/' : '.';
        let remainingParts = [...pathParts];

        // Walk up the path until we find a directory that exists
        for (let i = pathParts.length - 1; i >= 0; i--) {
          const testPath = '/' + pathParts.slice(0, i + 1).join('/');

          if (existsSync(testPath)) {
            const realBase = realpathSync(testPath);
            const remainingPath = pathParts.slice(i + 1).join('/');
            resolvedPath = remainingPath ? join(realBase, remainingPath) : realBase;
            break;
          }

          // If we've exhausted all options, use the absolute path
          if (i === 0) {
            resolvedPath = absolutePath;
          }
        }

        // Fallback: just use the absolute path if we couldn't resolve anything
        if (!resolvedPath) {
          resolvedPath = absolutePath;
        }
      }
    } catch (error) {
      return {
        valid: false,
        error: `Failed to resolve path: ${(error as Error).message}`,
      };
    }

    // Check if path is within allowed roots
    if (!this.isWithinAllowedRoots(resolvedPath)) {
      return {
        valid: false,
        error: 'Path is outside allowed directories',
      };
    }

    // Validate extensions for write/delete operations
    if (access === 'write' || access === 'delete') {
      const extResult = this.validateExtension(resolvedPath);
      if (!extResult.valid) {
        return extResult;
      }
    }

    return {
      valid: true,
      resolvedPath,
    };
  }

  sanitize(path: string): string {
    if (!path || path.trim() === '') {
      return '';
    }

    // Remove URL encoding
    let sanitized = path.replace(/%2e%2e/gi, '..');
    sanitized = sanitized.replace(/%2f/gi, '/');
    sanitized = sanitized.replace(/%5c/gi, '\\');

    // Normalize path separators
    sanitized = sanitized.replace(/\\/g, '/');

    // Remove redundant slashes
    sanitized = sanitized.replace(/\/+/g, '/');

    // Remove leading ./ if present
    sanitized = sanitized.replace(/^\.\//, '');

    // Return normalized path
    const normalized = normalize(sanitized);

    // Handle empty string case from normalize
    return normalized === '.' ? '' : normalized;
  }

  isAllowed(path: string): boolean {
    const result = this.validate(path, 'read');
    return result.valid;
  }

  private isWithinAllowedRoots(resolvedPath: string): boolean {
    // If no roots specified, allow all paths (for testing purposes)
    if (this.allowedRoots.size === 0) {
      return true;
    }

    // Normalize the resolved path for comparison
    const normalizedPath = resolvedPath.replace(/\/+$/, '');

    // Check if path is within any of the allowed roots
    for (const root of this.allowedRoots) {
      const normalizedRoot = root.replace(/\/+$/, '');

      if (normalizedPath === normalizedRoot || normalizedPath.startsWith(normalizedRoot + '/')) {
        return true;
      }
    }

    return false;
  }

  private validateExtension(path: string): PathValidationResult {
    const ext = this.getExtension(path);

    // Check denylist first
    if (this.options.deniedExtensions.length > 0) {
      const isDenied = this.options.caseSensitiveExtensions
        ? this.options.deniedExtensions.includes(ext)
        : this.options.deniedExtensions.some(
            (denied) => denied.toLowerCase() === ext.toLowerCase()
          );

      if (isDenied) {
        return {
          valid: false,
          error: `File extension '${ext}' is blocked by denylist`,
        };
      }
    }

    // Check allowlist
    if (this.options.allowedExtensions.length > 0) {
      const isAllowed = this.options.caseSensitiveExtensions
        ? this.options.allowedExtensions.includes(ext)
        : this.options.allowedExtensions.some(
            (allowed) => allowed.toLowerCase() === ext.toLowerCase()
          );

      if (!isAllowed) {
        return {
          valid: false,
          error: `File extension '${ext}' is not in allowlist`,
        };
      }
    }

    return { valid: true };
  }

  private getExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    if (lastDot === -1 || lastDot === path.length - 1) {
      return '';
    }
    return path.substring(lastDot);
  }
}
