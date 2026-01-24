/**
 * Session Test Fixtures
 *
 * Mock data and utilities for session and message testing
 */

import type { Session, SessionSummary, Message } from '@agistack/shared';

export const mockSessions: Session[] = [
  {
    id: 'session-1',
    projectId: 'project-1',
    agentType: 'claude-opus-4-5-20251101',
    title: 'Help with bug fix',
    messages: [
      {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'I have a bug in my code',
        createdAt: new Date('2024-01-15T10:00:00'),
      },
      {
        id: 'msg-2',
        sessionId: 'session-1',
        role: 'assistant',
        content: 'I can help with that. What is the issue?',
        createdAt: new Date('2024-01-15T10:00:30'),
      },
    ],
    context: {},
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

export const mockSessionSummaries: SessionSummary[] = [
  {
    id: 'session-1',
    projectId: 'project-1',
    agentType: 'claude-opus-4-5-20251101',
    title: 'Help with bug fix',
    messageCount: 2,
    lastMessageAt: new Date('2024-01-15T10:00:30'),
    createdAt: new Date('2024-01-15'),
  },
];

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    sessionId: 'session-1',
    role: 'user',
    content: 'Test message from user',
    createdAt: new Date('2024-01-15T10:00:00'),
  },
  {
    id: 'msg-2',
    sessionId: 'session-1',
    role: 'assistant',
    content: 'Test response from assistant',
    createdAt: new Date('2024-01-15T10:00:30'),
  },
];

export function createMockSession(overrides?: Partial<Session>): Session {
  return {
    id: 'session-test',
    projectId: 'project-1',
    agentType: 'claude-opus-4-5-20251101',
    messages: [],
    context: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockSessionSummary(overrides?: Partial<SessionSummary>): SessionSummary {
  return {
    id: 'session-test',
    projectId: 'project-1',
    agentType: 'claude-opus-4-5-20251101',
    messageCount: 0,
    lastMessageAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockMessage(overrides?: Partial<Message>): Message {
  return {
    id: 'msg-test',
    sessionId: 'session-test',
    role: 'user',
    content: 'Test message',
    createdAt: new Date(),
    ...overrides,
  };
}
