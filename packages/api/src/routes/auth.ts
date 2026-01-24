import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { UserRepository } from '../repositories/user.repository';
import { generateToken } from '../middleware/auth';

/**
 * Auth router
 * Handles authentication: login, register, logout
 */
export const authRouter = new Hono();

// Initialize repository
const userRepository = new UserRepository();

/**
 * Validation schemas
 */
const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
authRouter.post('/register', zValidator('json', RegisterSchema), async (c) => {
  const data = c.req.valid('json');

  try {
    // Check if user already exists
    const existingUser = await userRepository.findByEmail(data.email);

    if (existingUser) {
      return c.json({
        success: false,
        error: 'User with this email already exists',
      }, 400);
    }

    // Create user with hashed password
    const newUser = await userRepository.createWithHashedPassword({
      email: data.email,
      name: data.name || null,
      avatarUrl: data.avatarUrl || null,
      password: data.password,
    });

    // Generate token
    const token = generateToken(newUser);

    // Return user without sensitive data
    const { passwordHash, ...userWithoutPassword } = newUser as any;

    return c.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register user',
    }, 400);
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
authRouter.post('/login', zValidator('json', LoginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  try {
    // Find user by email
    const user = await userRepository.findByEmail(email);

    if (!user) {
      return c.json({
        success: false,
        error: 'Invalid email or password',
      }, 401);
    }

    // Verify password
    const passwordHash = (user as any).passwordHash;

    if (!passwordHash) {
      return c.json({
        success: false,
        error: 'Invalid email or password',
      }, 401);
    }

    const isValid = await userRepository.verifyPassword(password, passwordHash);

    if (!isValid) {
      return c.json({
        success: false,
        error: 'Invalid email or password',
      }, 401);
    }

    // Generate token
    const token = generateToken(user);

    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user as any;

    return c.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to login',
    }, 500);
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token deletion)
 * Note: In a stateless JWT system, logout is handled client-side by deleting the token
 * For server-side logout, you would implement a token blacklist
 */
authRouter.post('/logout', async (c) => {
  // In a simple JWT implementation, logout is handled client-side
  // The client should delete the stored token
  return c.json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 * Note: This endpoint requires the authMiddleware
 */
authRouter.get('/me', async (c) => {
  // This endpoint should be protected by authMiddleware in the main app
  // For now, return an error
  return c.json({
    success: false,
    error: 'Unauthorized: No token provided',
  }, 401);
});

/**
 * POST /api/auth/verify
 * Verify if a token is valid
 */
authRouter.post('/verify', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: 'No token provided',
    }, 401);
  }

  const token = authHeader.substring(7);
  const { verifyToken } = await import('../middleware/auth');

  const payload = verifyToken(token);

  if (!payload) {
    return c.json({
      success: false,
      error: 'Invalid or expired token',
    }, 401);
  }

  try {
    const user = await userRepository.findByEmail(payload.email);

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found',
      }, 404);
    }

    const { passwordHash, ...userWithoutPassword } = user as any;

    return c.json({
      success: true,
      data: {
        user: userWithoutPassword,
        valid: true,
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to verify token',
    }, 500);
  }
});
