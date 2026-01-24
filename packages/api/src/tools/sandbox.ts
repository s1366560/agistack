import { performance } from 'node:perf_hooks';

export interface SandboxOptions {
  timeoutMs: number;
  maxMemoryMb?: number;
  workingDirectory?: string;
}

export interface SandboxResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    durationMs: number;
    memoryUsedMb?: number;
    timedOut?: boolean;
  };
}

export class Sandbox {
  /**
   * Execute a function within a sandboxed environment
   */
  static async execute<T>(
    fn: () => Promise<T> | T,
    options: SandboxOptions
  ): Promise<SandboxResult<T>> {
    const { timeoutMs, maxMemoryMb, workingDirectory } = options;
    const startTime = performance.now();

    // Get initial memory usage
    const initialMemory = process.memoryUsage();

    try {
      // Execute with timeout
      const result = await Sandbox.withTimeout(fn, timeoutMs);

      // Calculate memory used
      const finalMemory = process.memoryUsage();
      const memoryUsedMb = Sandbox.calculateMemoryUsed(initialMemory, finalMemory);

      // Check memory limit
      if (maxMemoryMb && memoryUsedMb > maxMemoryMb) {
        return {
          success: false,
          error: `Memory limit exceeded: ${memoryUsedMb.toFixed(2)}MB used, limit is ${maxMemoryMb}MB`,
          metadata: {
            durationMs: performance.now() - startTime,
            memoryUsedMb,
          },
        };
      }

      return {
        success: true,
        data: result as T, // Explicitly cast to handle undefined
        metadata: {
          durationMs: performance.now() - startTime,
          memoryUsedMb,
        },
      };
    } catch (error) {
      const durationMs = performance.now() - startTime;
      const finalMemory = process.memoryUsage();
      const memoryUsedMb = Sandbox.calculateMemoryUsed(initialMemory, finalMemory);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if it's a timeout error
      const isTimeout = errorMessage.toLowerCase().includes('timeout') ||
                        errorMessage.toLowerCase().includes('aborted');

      return {
        success: false,
        error: errorMessage,
        metadata: {
          durationMs,
          memoryUsedMb,
          timedOut: isTimeout,
        },
      };
    }
  }

  /**
   * Wrap a promise with timeout using AbortController
   */
  private static async withTimeout<T>(
    fn: () => Promise<T> | T,
    timeoutMs: number
  ): Promise<T> {
    // Create a timeout promise
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      // Race between the function and the timeout
      return await Promise.race([Promise.resolve(fn()), timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  /**
   * Calculate memory used during execution
   */
  private static calculateMemoryUsed(
    initial: NodeJS.MemoryUsage,
    final: NodeJS.MemoryUsage
  ): number {
    // Calculate heap used difference
    const heapUsed = final.heapUsed - initial.heapUsed;

    // Convert to MB
    return heapUsed / (1024 * 1024);
  }
}
