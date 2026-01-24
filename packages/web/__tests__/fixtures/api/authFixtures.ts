/**
 * Authentication Test Fixtures
 *
 * Mock data and utilities for authentication testing
 */

import type { User } from '@agistack/shared';

export const mockUsers: Record<string, User> = {
  testUser: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  adminUser: {
    id: 'user-admin',
    email: 'admin@example.com',
    name: 'Admin User',
    avatarUrl: 'https://example.com/admin-avatar.jpg',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

export const mockTokens = {
  valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid',
  expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired',
  invalid: 'invalid-token',
};

export const mockCredentials = {
  valid: {
    email: 'test@example.com',
    password: 'password123',
  },
  invalid: {
    email: 'test@example.com',
    password: 'wrongpassword',
  },
  nonexistent: {
    email: 'nonexistent@example.com',
    password: 'password123',
  },
};

export const mockAuthResponse = {
  success: true,
  data: {
    user: mockUsers.testUser,
    token: mockTokens.valid,
  },
};

export const mockLoginError = {
  success: false,
  error: 'Invalid credentials',
};

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-test',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
