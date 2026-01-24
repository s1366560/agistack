import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import type { User } from '../db/schema';

/**
 * JWT configuration
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface AuthContext {
  user: JWTPayload;
}

/**
 * Generate JWT token for a user
 */
export function generateToken(user: { id: string; email: string }): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token and return payload
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header and adds user to context
 */
export async function authMiddleware(c: Context, next: Next) {
  // Get Authorization header
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: 'Unauthorized: Missing or invalid Authorization header',
    }, 401);
  }

  // Extract token
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Verify token
  const payload = verifyToken(token);

  if (!payload) {
    return c.json({
      success: false,
      error: 'Unauthorized: Invalid or expired token',
    }, 401);
  }

  // Add user to context
  c.set('user', payload);

  await next();
}

/**
 * Optional authentication middleware
 * Attaches user to context if token is provided, but doesn't require it
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload) {
      c.set('user', payload);
    }
  }

  await next();
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(c: Context): JWTPayload | undefined {
  return c.get('user');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(c: Context): boolean {
  return !!getAuthUser(c);
}
