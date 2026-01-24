/**
 * AuthContext Types
 *
 * Type definitions for the authentication context provider
 */

import type { Accessor } from 'solid-js'
import type { User } from '@agistack/shared'

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string
  password: string
}

/**
 * Login response from API
 */
export interface LoginResponse {
  user: User
  token: string
}

/**
 * Register credentials
 */
export interface RegisterCredentials {
  email: string
  password: string
  name?: string
}

/**
 * Auth state interface (using SolidJS Accessor/signals)
 */
export interface AuthState {
  isAuthenticated: Accessor<boolean>
  user: Accessor<User | null>
  token: Accessor<string | null>
  loading: Accessor<boolean>
}

/**
 * Auth actions interface
 */
export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => Promise<boolean>
  checkAuth: () => Promise<void>
  refreshToken: () => Promise<boolean>
}

/**
 * Combined auth context value interface
 */
export interface AuthContextValue extends AuthState, AuthActions {}

/**
 * Auth API client interface
 */
export interface AuthApiClient {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; data?: LoginResponse; error?: string }>
  logout: () => Promise<{ success: boolean; error?: string }>
  me: () => Promise<{ success: boolean; data?: User; error?: string }>
}

/**
 * Auth context provider props
 */
export interface AuthProviderProps {
  apiClient?: AuthApiClient
  storageKey?: string
  children: JSX.Element
}
