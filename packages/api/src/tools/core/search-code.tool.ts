import { ToolDefinition } from '@agistack/shared';
import { z } from 'zod';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { PathValidator } from '../validators/path-validator';
import { Sandbox } from '../sandbox';

interface Match {
  file: string;
  lineNumber: number;
  content: string;
  context?: {
    before: string[];
    after: string[];
  };
}

export const searchCodeTool: ToolDefinition = {
  name: 'search-code',
  description: 'Search for text patterns in files',
  category: 'search' as const,
  inputSchema: z.object({
    path: z.string().min(1),
    pattern: z.string().min(1),
    recursive: z.boolean().default(true),
    caseSensitive: z.boolean().default(false),
    useRegex: z.boolean().default(false),
    extensions: z.array(z.string()).optional(),
    contextLines: z.number().int().min(0).max(10).default(0),
    maxResults: z.number().int().min(1).default(1000),
  }),
  outputSchema: z.object({
    matches: z.array(z.object({
      file: z.string(),
      lineNumber: z.number(),
      content: z.string(),
    })),
    count: z.number(),
    path: z.string(),
  }),
  permissions: [{ resourceType: 'file', pattern: '/**', action: 'allow' }],
  rateLimit: 100,
  handler: async (input: any, context: any) => {
    const { path, pattern, recursive, caseSensitive, useRegex, extensions, contextLines, maxResults } = input;
    const validator = new PathValidator([process.cwd()]);
    const pathValidation = validator.validate(path, 'read');
    if (!pathValidation.valid) {
      return { success: false, error: pathValidation.error || 'Invalid path' };
    }

    const sandboxResult = await Sandbox.execute(async () => {
      if (!existsSync(path)) {
        throw new Error('Directory not found');
      }

      let regex: RegExp;
      try {
        const flags = caseSensitive ? 'g' : 'gi';
        regex = useRegex ? new RegExp(pattern, flags) : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      } catch (error) {
        throw new Error('Invalid regex');
      }

      const matches: Match[] = [];
      searchInDir(path, regex, { recursive, extensions, contextLines, maxResults, matches });
      return { matches, count: matches.length, path, truncated: matches.length >= maxResults };
    }, { timeoutMs: context.timeout || 30000 });

    if (sandboxResult.success && sandboxResult.data) {
      return { success: true, data: sandboxResult.data };
    }
    return sandboxResult;
  },
};

function searchInDir(dirPath: string, regex: RegExp, options: any): void {
  const { recursive, extensions, maxResults, matches } = options;
  if (matches.length >= maxResults) return;

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (matches.length >= maxResults) break;
      const fullPath = join(dirPath, entry.name);
      if (entry.name.startsWith('.')) continue;

      if (entry.isDirectory()) {
        if (recursive) searchInDir(fullPath, regex, options);
      } else if (entry.isFile()) {
        if (extensions && extensions.length > 0) {
          const ext = extname(entry.name);
          if (!extensions.includes(ext)) continue;
        }
        if (isBinary(fullPath)) continue;
        searchInFile(fullPath, regex, options.contextLines, matches, maxResults);
      }
    }
  } catch (error) {
    // Skip files we can't read
  }
}

function searchInFile(filePath: string, regex: RegExp, contextLines: number, matches: Match[], maxResults: number): void {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (matches.length >= maxResults) break;
      regex.lastIndex = 0;
      if (regex.test(lines[i])) {
        const match: Match = { file: filePath, lineNumber: i + 1, content: lines[i].trim() };
        if (contextLines > 0) {
          match.context = {
            before: lines.slice(Math.max(0, i - contextLines), i).map((l) => l.trim()),
            after: lines.slice(i + 1, Math.min(lines.length, i + 1 + contextLines)).map((l) => l.trim()),
          };
        }
        matches.push(match);
      }
    }
  } catch (error) {
    // Skip files we can't read
  }
}

function isBinary(filePath: string): boolean {
  try {
    const buffer = readFileSync(filePath, { encoding: null });
    const checkSize = Math.min(buffer.length, 1024);
    for (let i = 0; i < checkSize; i++) {
      if (buffer[i] === 0) return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}
