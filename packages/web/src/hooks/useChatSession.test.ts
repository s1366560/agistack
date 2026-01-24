/**
 * useChatSession Hook Tests
 *
 * TDD: Test file written BEFORE implementation (RED phase)
 * Tests the useChatSession custom hook that wraps ChatContext
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot, createSignal, Accessor } from 'solid-js';
import type { Session, Message } from '@agistack/shared';
import type { ChatContextValue } from '../contexts/ChatContext.types';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('@solidjs/router', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useChatContext
let mockContextValue: ChatContextValue;
const mockLoadSession = vi.fn();
const mockSendMessage = vi.fn();
const mockRetry = vi.fn();

vi.mock('../contexts/ChatContext', () => ({
  useChatContext: () => mockContextValue,
}));

// Create a wrapper component that provides the mocked context
function createTestContext(overrides?: Partial<ChatContextValue>): ChatContextValue {
  const [session, setSession] = createSignal<Session | null>(null);
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [streaming, setStreaming] = createSignal(false);
  const [streamText, setStreamText] = createSignal('');

  mockLoadSession.mockImplementation(() => Promise.resolve());
  mockSendMessage.mockImplementation(() => Promise.resolve());
  mockRetry.mockImplementation(() => Promise.resolve());

  return {
    session,
    messages,
    loading,
    error,
    streaming,
    streamText,
    loadSession: mockLoadSession,
    sendMessage: mockSendMessage,
    retry: mockRetry,
    ...overrides,
  };
}

describe('useChatSession', () => {
  // We'll need to import this after setting up mocks
  let useChatSession: (sessionId?: string) => {
    readonly session: Accessor<Session | null>;
    readonly messages: Accessor<Message[]>;
    readonly loading: Accessor<boolean>;
    readonly error: Accessor<string | null>;
    readonly streaming: Accessor<boolean>;
    readonly streamText: Accessor<string>;
    readonly loadSession: (id: string) => Promise<void>;
    readonly sendMessage: (content: string) => Promise<void>;
    readonly retry: () => Promise<void>;
    readonly sessionId: Accessor<string | undefined>;
    readonly canSendMessage: Accessor<boolean>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock context
    mockContextValue = createTestContext();

    // Dynamic import after mocks are set up
    const module = await import('./useChatSession');
    useChatSession = module.useChatSession;
  });

  describe('Basic functionality', () => {
    it('should return correct state accessors', () => {
      createRoot((dispose) => {
        const result = useChatSession('test-session-id');

        expect(result.session).toBeDefined();
        expect(typeof result.session).toBe('function');

        expect(result.messages).toBeDefined();
        expect(typeof result.messages).toBe('function');

        expect(result.loading).toBeDefined();
        expect(typeof result.loading).toBe('function');

        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('function');

        expect(result.streaming).toBeDefined();
        expect(typeof result.streaming).toBe('function');

        expect(result.streamText).toBeDefined();
        expect(typeof result.streamText).toBe('function');

        dispose();
      });
    });

    it('should expose all context state accessors', () => {
      createRoot((dispose) => {
        const testSession: Session = {
          id: 'session-1',
          title: 'Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Update mock context with test data
        mockContextValue = createTestContext({
          session: vi.fn(() => testSession) as unknown as Accessor<Session | null>,
        });

        const result = useChatSession();

        // Verify session accessor returns the same value as context
        expect(result.session()).toEqual(testSession);

        dispose();
      });
    });

    it('should expose all actions', () => {
      createRoot((dispose) => {
        const result = useChatSession();

        expect(result.loadSession).toBeDefined();
        expect(typeof result.loadSession).toBe('function');

        expect(result.sendMessage).toBeDefined();
        expect(typeof result.sendMessage).toBe('function');

        expect(result.retry).toBeDefined();
        expect(typeof result.retry).toBe('function');

        dispose();
      });
    });
  });

  describe('sessionId', () => {
    it('should return the passed sessionId value', () => {
      createRoot((dispose) => {
        const testId = 'my-session-123';
        const result = useChatSession(testId);

        expect(result.sessionId()).toBe(testId);

        dispose();
      });
    });

    it('should return undefined when no sessionId is passed', () => {
      createRoot((dispose) => {
        const result = useChatSession();

        expect(result.sessionId()).toBeUndefined();

        dispose();
      });
    });

    it('should handle empty string sessionId', () => {
      createRoot((dispose) => {
        const result = useChatSession('');

        expect(result.sessionId()).toBe('');

        dispose();
      });
    });
  });

  describe('canSendMessage derived state', () => {
    it('should return true when session exists and not loading/streaming', () => {
      createRoot((dispose) => {
        const testSession: Session = {
          id: 'session-1',
          title: 'Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockContextValue = createTestContext({
          session: vi.fn(() => testSession) as unknown as Accessor<Session | null>,
          loading: vi.fn(() => false) as unknown as Accessor<boolean>,
          streaming: vi.fn(() => false) as unknown as Accessor<boolean>,
        });

        const result = useChatSession();

        expect(result.canSendMessage()).toBe(true);

        dispose();
      });
    });

    it('should return false when no session exists', () => {
      createRoot((dispose) => {
        mockContextValue = createTestContext({
          session: vi.fn(() => null) as unknown as Accessor<Session | null>,
          loading: vi.fn(() => false) as unknown as Accessor<boolean>,
          streaming: vi.fn(() => false) as unknown as Accessor<boolean>,
        });

        const result = useChatSession();

        expect(result.canSendMessage()).toBe(false);

        dispose();
      });
    });

    it('should return false when loading is true', () => {
      createRoot((dispose) => {
        const testSession: Session = {
          id: 'session-1',
          title: 'Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockContextValue = createTestContext({
          session: vi.fn(() => testSession) as unknown as Accessor<Session | null>,
          loading: vi.fn(() => true) as unknown as Accessor<boolean>,
          streaming: vi.fn(() => false) as unknown as Accessor<boolean>,
        });

        const result = useChatSession();

        expect(result.canSendMessage()).toBe(false);

        dispose();
      });
    });

    it('should return false when streaming is true', () => {
      createRoot((dispose) => {
        const testSession: Session = {
          id: 'session-1',
          title: 'Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockContextValue = createTestContext({
          session: vi.fn(() => testSession) as unknown as Accessor<Session | null>,
          loading: vi.fn(() => false) as unknown as Accessor<boolean>,
          streaming: vi.fn(() => true) as unknown as Accessor<boolean>,
        });

        const result = useChatSession();

        expect(result.canSendMessage()).toBe(false);

        dispose();
      });
    });

    it('should return false when both loading and streaming are true', () => {
      createRoot((dispose) => {
        const testSession: Session = {
          id: 'session-1',
          title: 'Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockContextValue = createTestContext({
          session: vi.fn(() => testSession) as unknown as Accessor<Session | null>,
          loading: vi.fn(() => true) as unknown as Accessor<boolean>,
          streaming: vi.fn(() => true) as unknown as Accessor<boolean>,
        });

        const result = useChatSession();

        expect(result.canSendMessage()).toBe(false);

        dispose();
      });
    });
  });

  describe('loadSession wrapper', () => {
    it('should call context.loadSession with the provided id', async () => {
      createRoot(async (dispose) => {
        const testId = 'session-456';
        const result = useChatSession();

        await result.loadSession(testId);

        expect(mockLoadSession).toHaveBeenCalledWith(testId);
        expect(mockLoadSession).toHaveBeenCalledTimes(1);

        dispose();
      });
    });

    it('should call navigate on 404 error', async () => {
      createRoot(async (dispose) => {
        const error404 = new Error('Session not found (404)');
        mockLoadSession.mockRejectedValueOnce(error404);

        const result = useChatSession();

        await expect(result.loadSession('invalid-id')).rejects.toThrow('404');

        expect(mockNavigate).toHaveBeenCalledWith('/sessions', { replace: true });

        dispose();
      });
    });

    it('should call navigate when error message contains 404', async () => {
      createRoot(async (dispose) => {
        const error404 = new Error('HTTP 404 - Not Found');
        mockLoadSession.mockRejectedValueOnce(error404);

        const result = useChatSession();

        await expect(result.loadSession('missing-id')).rejects.toThrow();

        expect(mockNavigate).toHaveBeenCalledWith('/sessions', { replace: true });

        dispose();
      });
    });

    it('should not navigate on successful loadSession', async () => {
      createRoot(async (dispose) => {
        mockLoadSession.mockResolvedValueOnce(undefined);

        const result = useChatSession();

        await result.loadSession('valid-id');

        expect(mockNavigate).not.toHaveBeenCalled();

        dispose();
      });
    });

    it('should not navigate on non-404 errors', async () => {
      createRoot(async (dispose) => {
        const otherError = new Error('Network error');
        mockLoadSession.mockRejectedValueOnce(otherError);

        const result = useChatSession();

        await expect(result.loadSession('session-id')).rejects.toThrow('Network error');

        expect(mockNavigate).not.toHaveBeenCalled();

        dispose();
      });
    });

    it('should re-throw the error after navigating on 404', async () => {
      createRoot(async (dispose) => {
        const error404 = new Error('404 Not Found');
        mockLoadSession.mockRejectedValueOnce(error404);

        const result = useChatSession();

        await expect(result.loadSession('missing-id')).rejects.toThrow('404 Not Found');

        dispose();
      });
    });
  });

  describe('sendMessage and retry', () => {
    it('should call context.sendMessage when sendMessage is called', async () => {
      createRoot(async (dispose) => {
        const testContent = 'Hello, AI!';
        const result = useChatSession();

        await result.sendMessage(testContent);

        expect(mockSendMessage).toHaveBeenCalledWith(testContent);
        expect(mockSendMessage).toHaveBeenCalledTimes(1);

        dispose();
      });
    });

    it('should call context.retry when retry is called', async () => {
      createRoot(async (dispose) => {
        const result = useChatSession();

        await result.retry();

        expect(mockRetry).toHaveBeenCalledTimes(1);

        dispose();
      });
    });

    it('should pass through sendMessage errors', async () => {
      createRoot(async (dispose) => {
        const sendError = new Error('Failed to send');
        mockSendMessage.mockRejectedValueOnce(sendError);

        const result = useChatSession();

        await expect(result.sendMessage('test')).rejects.toThrow('Failed to send');

        dispose();
      });
    });

    it('should pass through retry errors', async () => {
      createRoot(async (dispose) => {
        const retryError = new Error('Failed to retry');
        mockRetry.mockRejectedValueOnce(retryError);

        const result = useChatSession();

        await expect(result.retry()).rejects.toThrow('Failed to retry');

        dispose();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle null session from context', () => {
      createRoot((dispose) => {
        mockContextValue = createTestContext({
          session: vi.fn(() => null) as unknown as Accessor<Session | null>,
        });

        const result = useChatSession();

        expect(result.session()).toBeNull();

        dispose();
      });
    });

    it('should handle empty messages array', () => {
      createRoot((dispose) => {
        mockContextValue = createTestContext({
          messages: vi.fn(() => []) as unknown as Accessor<Message[]>,
        });

        const result = useChatSession();

        expect(result.messages()).toEqual([]);

        dispose();
      });
    });

    it('should handle error state correctly', () => {
      createRoot((dispose) => {
        const testError = 'Something went wrong';
        mockContextValue = createTestContext({
          error: vi.fn(() => testError) as unknown as Accessor<string | null>,
        });

        const result = useChatSession();

        expect(result.error()).toBe(testError);

        dispose();
      });
    });

    it('should handle streamText accumulation', () => {
      createRoot((dispose) => {
        const streamingText = 'Partial response...';
        mockContextValue = createTestContext({
          streamText: vi.fn(() => streamingText) as unknown as Accessor<string>,
        });

        const result = useChatSession();

        expect(result.streamText()).toBe(streamingText);

        dispose();
      });
    });
  });
});
