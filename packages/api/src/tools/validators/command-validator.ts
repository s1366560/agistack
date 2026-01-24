export interface CommandValidationResult {
  valid: boolean;
  sanitized?: string[];
  error?: string;
}

export interface CommandValidatorOptions {
  allowedCommands?: string[];
  deniedCommands?: string[];
  allowShellOperators?: boolean;
}

// Dangerous shell operators and patterns
const DANGEROUS_OPERATORS = ['|', ';', '&', '>', '<', '`', '$(', '${'];

// Injection patterns
const INJECTION_PATTERNS = [
  /\$\(.+?\)/, // $(command) substitution
  /`.+?`/, // backtick substitution
  /\$\{.+?\}/, // ${var} expansion
  /\$[A-Za-z_]/, // variable expansion
];

// Control characters
const CONTROL_CHARS = ['\n', '\r', '\t', '\x00', '\x1b'];

export class CommandValidator {
  private options: Required<CommandValidatorOptions>;

  constructor(options: CommandValidatorOptions = {}) {
    this.options = {
      allowedCommands: options.allowedCommands || [],
      deniedCommands: options.deniedCommands || [],
      allowShellOperators: options.allowShellOperators ?? false,
    };
  }

  validate(command: string[]): CommandValidationResult {
    // Check for empty command
    if (!command || command.length === 0) {
      return {
        valid: false,
        error: 'Command array is empty',
      };
    }

    const [cmdName, ...args] = command;

    // Validate command name
    if (!cmdName || typeof cmdName !== 'string') {
      return {
        valid: false,
        error: 'Invalid command name',
      };
    }

    // Check denylist first (highest priority)
    if (this.options.deniedCommands.length > 0) {
      const baseCmd = this.getBaseCommand(cmdName);
      if (
        this.options.deniedCommands.includes(baseCmd) ||
        this.options.deniedCommands.includes(cmdName)
      ) {
        return {
          valid: false,
          error: `Command '${baseCmd}' is blocked by denylist`,
        };
      }
    }

    // Check allowlist
    if (this.options.allowedCommands.length > 0) {
      const baseCmd = this.getBaseCommand(cmdName);
      if (
        !this.options.allowedCommands.includes(baseCmd) &&
        !this.options.allowedCommands.includes(cmdName)
      ) {
        return {
          valid: false,
          error: `Command '${baseCmd}' is not in allowlist`,
        };
      }
    }

    // Validate all arguments
    for (const arg of [cmdName, ...args]) {
      const argResult = this.validateArgument(arg);
      if (!argResult.valid) {
        return argResult;
      }
    }

    // If shell operators are disabled, check for them in all arguments
    if (!this.options.allowShellOperators) {
      const shellCheck = this.checkForShellOperators(command);
      if (!shellCheck.valid) {
        return shellCheck;
      }
    }

    // Sanitize and return
    const sanitized = this.sanitize(command);

    return {
      valid: true,
      sanitized,
    };
  }

  sanitize(args: string[]): string[] {
    return args
      .map((arg) => arg.trim())
      .filter((arg) => arg.length > 0);
  }

  isSafe(command: string): boolean {
    const baseCmd = this.getBaseCommand(command);

    // Check denylist
    if (this.options.deniedCommands.includes(baseCmd)) {
      return false;
    }

    // Check allowlist
    if (this.options.allowedCommands.length > 0) {
      return this.options.allowedCommands.includes(baseCmd);
    }

    // No restrictions, allow everything
    return true;
  }

  private validateArgument(arg: string): CommandValidationResult {
    // Check for null bytes
    if (arg.includes('\x00')) {
      return {
        valid: false,
        error: 'Argument contains null byte',
      };
    }

    // Check for control characters (except spaces)
    for (const char of CONTROL_CHARS) {
      if (arg.includes(char)) {
        if (char === '\n' || char === '\r') {
          return {
            valid: false,
            error: 'Argument contains newline character',
          };
        }
        if (char === '\x00') {
          return {
            valid: false,
            error: 'Argument contains null byte',
          };
        }
      }
    }

    return { valid: true };
  }

  private checkForShellOperators(command: string[]): CommandValidationResult {
    for (const arg of command) {
      // Check if the argument itself IS a shell operator
      if (DANGEROUS_OPERATORS.includes(arg as any)) {
        if (arg === '`' || arg === '$(' || arg === '${') {
          return {
            valid: false,
            error: 'command substitution',
          };
        }
        return {
          valid: false,
          error: `shell operator '${arg}' is not allowed`,
        };
      }

      // Check for dangerous shell operators within arguments
      for (const operator of DANGEROUS_OPERATORS) {
        if (arg.includes(operator)) {
          // Check if it's a redirection operator
          if (['>', '<'].includes(operator)) {
            // Redirection might be ok in some contexts, but we'll block it for safety
            return {
              valid: false,
              error: `shell operator '${operator}' is not allowed`,
            };
          }

          // Check for command substitution
          if (operator === '`' || operator === '$(' || operator === '${') {
            return {
              valid: false,
              error: 'command substitution',
            };
          }

          // Other operators
          return {
            valid: false,
            error: `shell operator '${operator}' is not allowed`,
          };
        }
      }

      // Check for variable expansion first (more specific)
      if (/\$[A-Za-z_]/.test(arg) && !/\$\(/.test(arg) && !/\$\{/.test(arg)) {
        return {
          valid: false,
          error: 'variable expansion',
        };
      }

      // Check for injection patterns (command substitution, etc)
      for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(arg)) {
          return {
            valid: false,
            error: 'Command substitution detected',
          };
        }
      }

      // Check for pipe in middle of arguments (not just part of a path)
      const parts = arg.split('|');
      if (parts.length > 1) {
        // If we have multiple parts with actual content, it's likely a pipe
        const nonEmptyParts = parts.filter((p) => p.trim().length > 0);
        if (nonEmptyParts.length > 1) {
          return {
            valid: false,
            error: 'Pipe operator is not allowed',
          };
        }
      }
    }

    return { valid: true };
  }

  private getBaseCommand(command: string): string {
    // Remove path if present
    const parts = command.split('/');
    return parts[parts.length - 1];
  }
}
