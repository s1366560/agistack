import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { UserRepository } from '../repositories/user.repository';
import { authMiddleware, getAuthUser, generateToken } from '../middleware/auth';

/**
 * Users router
 * Handles user CRUD operations and authentication
 */
export const usersRouter = new Hono();

// Initialize repository
const userRepository = new UserRepository();

/**
 * Validation schemas
 */
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(1).max(255).optional().nullable(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
});

const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * GET /api/users/me
 * Get current authenticated user
 */
usersRouter.get('/me', authMiddleware, async (c) => {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  try {
    const userData = await userRepository.findByEmail(user.email);

    if (!userData) {
      return c.json({
        success: false,
        error: 'User not found',
      }, 404);
    }

    // Return user without sensitive data
    const { passwordHash, ...userWithoutPassword } = userData as any;

    return c.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch user',
    }, 500);
  }
});

/**
 * PATCH /api/users/me
 * Update current user profile
 */
usersRouter.patch('/me', authMiddleware, zValidator('json', UpdateUserSchema.partial()), async (c) => {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  const data = c.req.valid('json');

  try {
    const userData = await userRepository.findByEmail(user.email);

    if (!userData) {
      return c.json({
        success: false,
        error: 'User not found',
      }, 404);
    }

    // Don't allow email changes through this endpoint
    const { email, ...updateData } = data;

    const updatedUser = await userRepository.update(userData.id, updateData);

    if (!updatedUser) {
      return c.json({
        success: false,
        error: 'Failed to update user',
      }, 400);
    }

    const { passwordHash, ...userWithoutPassword } = updatedUser as any;

    return c.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    }, 400);
  }
});

/**
 * PUT /api/users/me/password
 * Update current user password
 */
usersRouter.put('/me/password', authMiddleware, zValidator('json', UpdatePasswordSchema), async (c) => {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  const { currentPassword, newPassword } = c.req.valid('json');

  try {
    const userData = await userRepository.findByEmail(user.email);

    if (!userData) {
      return c.json({
        success: false,
        error: 'User not found',
      }, 404);
    }

    // Verify current password
    const isValid = await userRepository.verifyPassword(
      currentPassword,
      (userData as any).passwordHash
    );

    if (!isValid) {
      return c.json({
        success: false,
        error: 'Current password is incorrect',
      }, 400);
    }

    // Update password
    await userRepository.updatePassword(userData.id, newPassword);

    return c.json({
      success: true,
      data: {
        message: 'Password updated successfully',
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to update password',
    }, 500);
  }
});

/**
 * GET /api/users/:id
 * Get a single user by ID (admin only in production)
 */
usersRouter.get('/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const user = await userRepository.findById(id);

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found',
      }, 404);
    }

    // Return user without sensitive data
    const { passwordHash, ...userWithoutPassword } = user as any;

    return c.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch user',
    }, 500);
  }
});

/**
 * POST /api/users
 * Create a new user (registration)
 * Note: In production, you might want to add email verification
 */
usersRouter.post('/', zValidator('json', CreateUserSchema), async (c) => {
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

    // Create user with password if provided
    let newUser;
    if (data.password) {
      newUser = await userRepository.createWithHashedPassword({
        email: data.email,
        name: data.name || null,
        avatarUrl: data.avatarUrl || null,
        password: data.password,
      });
    } else {
      newUser = await userRepository.create({
        email: data.email,
        name: data.name || null,
        avatarUrl: data.avatarUrl || null,
      });
    }

    // Generate token for auto-login
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
      error: error instanceof Error ? error.message : 'Failed to create user',
    }, 400);
  }
});
