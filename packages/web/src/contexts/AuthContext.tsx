/**
 * AuthContext Provider
 *
 * Authentication context for managing:
 * - User login/logout
 * - JWT token secure storage
 * - User state management
 * - Authentication check on app load
 * - Auth status provision to components
 */

import {
  createContext,
  useContext,
  JSX,
  createSignal,
} from 'solid-js'
import type { User } from '@agistack/shared'
import type {
  AuthContextValue,
  AuthProviderProps,
  LoginCredentials,
} from './AuthContext.types'

// Default storage key for auth token
const DEFAULT_STORAGE_KEY = 'agistack-auth-token'

/**
 * Create the AuthContext
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Helper to get initial token from localStorage
 */
function getInitialToken(storageKey: string): string | null {
  if (typeof window === 'undefined') return null

  try {
    return localStorage.getItem(storageKey)
  } catch {
    // localStorage unavailable
    return null
  }
}

/**
 * Helper to set token in localStorage
 */
function setTokenInStorage(storageKey: string, token: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    localStorage.setItem(storageKey, token)
    return true
  } catch {
    // localStorage unavailable
    return false
  }
}

/**
 * Helper to remove token from localStorage
 */
function removeTokenFromStorage(storageKey: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    localStorage.removeItem(storageKey)
    return true
  } catch {
    // localStorage unavailable
    return false
  }
}

/**
 * AuthContext Provider Component
 */
export function AuthProvider(props: AuthProviderProps): JSX.Element {
  const { apiClient, storageKey = DEFAULT_STORAGE_KEY, children } = props

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = createSignal<boolean>(false)
  const [user, setUser] = createSignal<User | null>(null)
  const [token, setToken] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal<boolean>(false)

  /**
   * Check authentication status by calling /auth/me endpoint
   */
  const checkAuth = async (): Promise<void> => {
    if (!apiClient) {
      setLoading(false)
      return
    }

    try {
      const response = await apiClient.me()

      if (response.success && response.data) {
        setUser(response.data)
        setIsAuthenticated(true)
      } else {
        // Invalid token - clear auth state
        setToken(null)
        setUser(null)
        setIsAuthenticated(false)
        removeTokenFromStorage(storageKey)
      }
    } catch {
      // Network error or other issue - clear auth state
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Login with credentials
   */
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    if (!apiClient) return false

    try {
      const response = await apiClient.login(credentials)

      if (response.success && response.data) {
        const { user: userData, token: newToken } = response.data

        // Validate response data
        if (!userData || !newToken) {
          return false
        }

        // Update state
        setToken(newToken)
        setUser(userData)
        setIsAuthenticated(true)
        setLoading(false)

        // Persist token to localStorage
        setTokenInStorage(storageKey, newToken)

        return true
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Logout current user
   */
  const logout = async (): Promise<boolean> => {
    // Call logout API if available
    if (apiClient) {
      try {
        await apiClient.logout()
      } catch {
        // Ignore logout API errors - we still clear local state
      }
    }

    // Clear local state regardless of API result
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    setLoading(false)

    // Clear token from localStorage
    removeTokenFromStorage(storageKey)

    return true
  }

  /**
   * Refresh token validity by checking current auth status
   */
  const refreshToken = async (): Promise<boolean> => {
    if (!apiClient || !token()) {
      return false
    }

    try {
      const response = await apiClient.me()

      if (response.success && response.data) {
        setUser(response.data)
        setIsAuthenticated(true)
        return true
      }

      // Token invalid - clear auth state
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      removeTokenFromStorage(storageKey)

      return false
    } catch {
      // Network error - clear auth state
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      return false
    }
  }

  /**
   * Create the context value
   */
  const contextValue: AuthContextValue = {
    // State
    isAuthenticated,
    user,
    token,
    loading,

    // Actions
    login,
    logout,
    checkAuth,
    refreshToken,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

/**
 * Hook to use the AuthContext
 *
 * @throws {Error} If used outside of an AuthProvider
 * @returns {AuthContextValue} The auth context value
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
