/**
 * WebSocket Chat Message Handler
 *
 * Handles chat-specific WebSocket messages including:
 * - Chat messages with AI streaming responses
 * - Session subscription management
 * - Message broadcasting to subscribers
 */

import { z } from 'zod';

// Message schemas for validation
const ChatMessageSchema = z.object({
  type: z.literal('chat'),
  sessionId: z.string().min(1),
  content: z.string().min(1, 'Content cannot be empty'),
  timestamp: z.string(),
});

const SubscribeMessageSchema = z.object({
  type: z.literal('subscribe'),
  sessionId: z.string().min(1),
});

const UnsubscribeMessageSchema = z.object({
  type: z.literal('unsubscribe'),
  sessionId: z.string().min(1),
});

const PingMessageSchema = z.object({
  type: z.literal('ping'),
});

// Client message union
const ClientMessageSchema = z.discriminatedUnion('type', [
  ChatMessageSchema,
  SubscribeMessageSchema,
  UnsubscribeMessageSchema,
  PingMessageSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

/**
 * Session subscription manager
 * Maps session IDs to sets of subscribed client IDs
 */
export class SessionSubscriptionManager {
  private subscriptions: Map<string, Set<string>> = new Map();

  /**
   * Subscribe a client to a session
   */
  subscribe(sessionId: string, clientId: string): void {
    if (!this.subscriptions.has(sessionId)) {
      this.subscriptions.set(sessionId, new Set());
    }
    this.subscriptions.get(sessionId)!.add(clientId);
  }

  /**
   * Unsubscribe a client from a session
   */
  unsubscribe(sessionId: string, clientId: string): boolean {
    const subscribers = this.subscriptions.get(sessionId);
    if (subscribers) {
      const removed = subscribers.delete(clientId);
      // Clean up empty sessions
      if (subscribers.size === 0) {
        this.subscriptions.delete(sessionId);
      }
      return removed;
    }
    return false;
  }

  /**
   * Get all subscribers for a session
   */
  getSubscribers(sessionId: string): string[] {
    const subscribers = this.subscriptions.get(sessionId);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Remove all subscriptions for a client
   */
  removeClient(clientId: string): void {
    for (const [sessionId, subscribers] of this.subscriptions.entries()) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(sessionId);
      }
    }
  }

  /**
   * Get subscription count for a session
   */
  getSubscriptionCount(sessionId: string): number {
    const subscribers = this.subscriptions.get(sessionId);
    return subscribers ? subscribers.size : 0;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

/**
 * Create a chat error message
 */
export function createErrorMessage(
  code: string,
  message: string,
  sessionId?: string
): { type: string; code: string; message: string; sessionId?: string; timestamp: string } {
  return {
    type: 'error',
    code,
    message,
    sessionId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a subscribed confirmation message
 */
export function createSubscribedMessage(sessionId: string): {
  type: string;
  sessionId: string;
  timestamp: string;
} {
  return {
    type: 'subscribed',
    sessionId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an unsubscribed confirmation message
 */
export function createUnsubscribedMessage(sessionId: string): {
  type: string;
  sessionId: string;
  timestamp: string;
} {
  return {
    type: 'unsubscribed',
    sessionId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a pong message
 */
export function createPongMessage(): {
  type: string;
  timestamp: string;
} {
  return {
    type: 'pong',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate client message
 */
export function validateClientMessage(data: unknown): {
  success: boolean;
  data?: ClientMessage;
  error?: string;
} {
  try {
    const message = ClientMessageSchema.parse(data);
    return { success: true, data: message };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

/**
 * Handle chat message with AI streaming
 *
 * This function integrates with AgentOrchestrator to provide real AI responses
 * Uses configuration from environment variables
 */
export async function handleChatWithAI(
  sessionId: string,
  content: string,
  agentType: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    console.log('[WebSocket Chat] Starting AI response for session:', sessionId, 'agent:', agentType);

    // Dynamic imports to avoid circular dependencies
    const { AgentOrchestrator } = await import('../agents');
    const { createProvider } = await import('../../services/ai');
    const { ToolRegistry } = await import('../../tools/registry');
    const { getSessionAIConfig } = await import('../../config/ai.config');

    // Get AI configuration from environment
    const config = getSessionAIConfig(agentType as 'build' | 'plan' | 'general');
    console.log('[WebSocket Chat] AI config:', { type: config.type, model: config.model, baseURL: config.baseURL });

    // Initialize AI provider and orchestrator
    const aiProvider = createProvider(config);
    const toolRegistry = new ToolRegistry();
    const orchestrator = new AgentOrchestrator(aiProvider, toolRegistry);

    const messages = [{ role: 'user' as const, content }];
    const agentConfig = {
      type: agentType as 'build' | 'plan' | 'general',
      state: 'idle' as const,
      capabilities: {
        canReadFiles: true,
        canWriteFiles: true,
        canExecuteCommands: false,
        canSearchCode: true,
        canUseLSP: false,
        canUseMCP: false,
      },
      permissions: [],
    };

    console.log('[WebSocket Chat] Starting stream...');
    let chunkCount = 0;

    // First, try non-streaming to test API
    console.log('[WebSocket Chat] Testing non-streaming API...');
    try {
      const testResult = await orchestrator.executeAgent(agentConfig.type, messages, agentConfig);
      console.log('[WebSocket Chat] Non-streaming result:', {
        hasContent: !!testResult.content,
        contentLength: testResult.content?.length || 0,
        contentPreview: testResult.content?.substring(0, 100) || '(empty)',
        usage: testResult.usage,
      });

      // If non-streaming works, send the response as chunks
      if (testResult.content) {
        const fullText = testResult.content;
        // Split into chunks for streaming effect
        const chunkSize = 20;
        for (let i = 0; i < fullText.length; i += chunkSize) {
          const chunk = fullText.substring(i, Math.min(i + chunkSize, fullText.length));
          chunkCount++;
          onChunk(chunk);
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      onDone();
      return;
    } catch (testError) {
      console.error('[WebSocket Chat] Non-streaming test failed:', testError);
      // Fall back to streaming
    }

    // Stream AI responses
    for await (const chunk of orchestrator.streamAgent(agentConfig.type, messages, agentConfig)) {
      console.log('[WebSocket Chat] Chunk received:', chunk);
      if (chunk.content) {
        chunkCount++;
        onChunk(chunk.content);
      }
      if (chunk.done) {
        console.log('[WebSocket Chat] Stream completed. Total chunks:', chunkCount);
        onDone();
        break;
      }
    }
  } catch (error) {
    console.error('[WebSocket Chat] Error:', error);
    onError(error instanceof Error ? error.message : 'AI response failed');
  }
}
