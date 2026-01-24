/**
 * AuthContext Tests
 *
 * Test suite for the authentication context provider
 * Following TDD methodology: tests written before implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'solid-js/web'
import { AuthProvider, useAuth } from './AuthContext'

// Mock user data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: 'https://example.com/avatar.png',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

// Mock token
const mockToken = 'mock-jwt-token-123456'

// Mock API client factory
const createMockApiClient = () => ({
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
})

// Global test result capture
let testResult: unknown = null
let testError: Error | null = null

// Test component that uses the auth context
function TestComponent(props: {
  testFn: (context: ReturnType<typeof useAuth>) => void | Promise<void>
}) {
  const context = useAuth()

  // Run the test function with the context
  const result = props.testFn(context)
  if (result instanceof Promise) {
    result.catch((error) => {
      testError = error
    })
  }

  return (
    <div data-testid="auth-context">
      <div data-testid="authenticated">{String(context.isAuthenticated())}</div>
      <div data-testid="loading">{String(context.loading())}</div>
      <div data-testid="user">{context.user()?.email || 'none'}</div>
      <div data-testid="token">{context.token() || 'none'}</div>
    </div>
  )
}

describe('AuthContext', () => {
  let container: HTMLDivElement
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>
    setItem: ReturnType<typeof vi.fn>
    removeItem: ReturnType<typeof vi.fn>
    clear: ReturnType<typeof vi.fn>
    length: number
    key: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create localStorage mock
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    }
    vi.stubGlobal('localStorage', localStorageMock)

    // Create fresh container for each test
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()

    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  describe('Initial State', () => {
    it('user is not authenticated by default', () => {
      const mockApi = createMockApiClient()

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={(context) => {
                expect(context.isAuthenticated()).toBe(false)
              }}
            />
          </AuthProvider>
        ),
        container
      )
    })

    it('token is null initially when no token in localStorage', () => {
      const mockApi = createMockApiClient()
      localStorageMock.getItem.mockReturnValue(null)

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={(context) => {
                expect(context.token()).toBe(null)
              }}
            />
          </AuthProvider>
        ),
        container
      )
    })

    it('user is null initially', () => {
      const mockApi = createMockApiClient()

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={(context) => {
                expect(context.user()).toBe(null)
              }}
            />
          </AuthProvider>
        ),
        container
      )
    })

    it('loading is false when no token in localStorage', () => {
      const mockApi = createMockApiClient()
      localStorageMock.getItem.mockReturnValue(null)

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={(context) => {
                expect(context.loading()).toBe(false)
              }}
            />
          </AuthProvider>
        ),
        container
      )
    })
  })

  describe('Login Flow', () => {
    it('can login with valid credentials', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })

      let testResult: boolean | null = null

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                testResult = await context.login({ email: 'test@example.com', password: 'password' })
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(testResult).toBe(true)
    })

    it('sets token after successful login', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.token()).toBe(mockToken)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('sets user data after successful login', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.user()).toEqual(mockUser)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('sets isAuthenticated to true after successful login', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.isAuthenticated()).toBe(true)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('stores token in localStorage after successful login', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(localStorageMock.setItem).toHaveBeenCalledWith('agistack-auth-token', mockToken)
    })

    it('returns false on login failure', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      })

      let testResult: boolean | null = null

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                testResult = await context.login({ email: 'test@example.com', password: 'wrong' })
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(testResult).toBe(false)
    })

    it('does not set token on login failure', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'wrong' })
                expect(context.token()).toBe(null)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('does not set user on login failure', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'wrong' })
                expect(context.user()).toBe(null)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('handles network errors during login gracefully', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockRejectedValue(new Error('Network error'))

      let testResult: boolean | null = null

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                testResult = await context.login({ email: 'test@example.com', password: 'password' })
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(testResult).toBe(false)
    })
  })

  describe('Logout Flow', () => {
    it('can logout when authenticated', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })
      mockApi.logout.mockResolvedValue({ success: true })

      let testResult: boolean | null = null

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.isAuthenticated()).toBe(true)
                testResult = await context.logout()
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(testResult).toBe(true)
    })

    it('clears token from localStorage on logout', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })
      mockApi.logout.mockResolvedValue({ success: true })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                await context.logout()
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('agistack-auth-token')
    })

    it('clears user data on logout', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })
      mockApi.logout.mockResolvedValue({ success: true })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.user()).not.toBe(null)
                await context.logout()
                expect(context.user()).toBe(null)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('sets isAuthenticated to false on logout', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })
      mockApi.logout.mockResolvedValue({ success: true })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.isAuthenticated()).toBe(true)
                await context.logout()
                expect(context.isAuthenticated()).toBe(false)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('clears token state on logout', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })
      mockApi.logout.mockResolvedValue({ success: true })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.token()).toBe(mockToken)
                await context.logout()
                expect(context.token()).toBe(null)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('returns true even when logout API fails', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })
      mockApi.logout.mockResolvedValue({ success: false, error: 'Logout failed' })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                const result = await context.logout()
                expect(result).toBe(true)
                expect(context.isAuthenticated()).toBe(false)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('handles logout when not authenticated gracefully', async () => {
      const mockApi = createMockApiClient()
      mockApi.logout.mockResolvedValue({ success: true })

      let testResult: boolean | null = null

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                testResult = await context.logout()
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(testResult).toBe(true)
    })
  })

  describe('Authentication Check', () => {
    it('calls /auth/me endpoint to verify token', async () => {
      const mockApi = createMockApiClient()
      mockApi.me.mockResolvedValue({ success: true, data: mockUser })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.checkAuth()
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(mockApi.me).toHaveBeenCalled()
    })

    it('sets user data if token is valid', async () => {
      const mockApi = createMockApiClient()
      mockApi.me.mockResolvedValue({ success: true, data: mockUser })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.checkAuth()
                expect(context.user()).toEqual(mockUser)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('clears token if token is invalid', async () => {
      const mockApi = createMockApiClient()
      mockApi.me.mockResolvedValue({ success: false, error: 'Invalid token' })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.checkAuth()
                expect(context.token()).toBe(null)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('agistack-auth-token')
    })

    it('sets loading to false after check', async () => {
      const mockApi = createMockApiClient()
      mockApi.me.mockResolvedValue({ success: true, data: mockUser })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.checkAuth()
                expect(context.loading()).toBe(false)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('handles network errors gracefully', async () => {
      const mockApi = createMockApiClient()
      mockApi.me.mockRejectedValue(new Error('Network error'))

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.checkAuth()
                expect(context.loading()).toBe(false)
                expect(context.isAuthenticated()).toBe(false)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })
  })

  describe('Token Management', () => {
    it('retrieves token from localStorage on mount', async () => {
      const mockApi = createMockApiClient()
      localStorageMock.getItem.mockReturnValue(mockToken)
      mockApi.me.mockResolvedValue({ success: true, data: mockUser })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent testFn={() => {}} />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(localStorageMock.getItem).toHaveBeenCalledWith('agistack-auth-token')
    })

    it('updates token in localStorage when changed by login', async () => {
      const newToken = 'new-jwt-token'
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: newToken },
      })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(localStorageMock.setItem).toHaveBeenCalledWith('agistack-auth-token', newToken)
    })

    it('provides getter for current token', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.token()).toBe(mockToken)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('handles missing localStorage gracefully', async () => {
      vi.unstubAllGlobals()
      vi.stubGlobal('localStorage', undefined)

      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })

      let testResult: boolean | null = null

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                testResult = await context.login({ email: 'test@example.com', password: 'password' })
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(testResult).toBe(true)
    })
  })

  describe('Provider Integration', () => {
    it('provides auth context to child components', () => {
      const mockApi = createMockApiClient()

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={(context) => {
                expect(context).toBeDefined()
                expect(context.isAuthenticated).toBeDefined()
                expect(context.user).toBeDefined()
                expect(context.token).toBeDefined()
                expect(context.loading).toBeDefined()
                expect(context.login).toBeDefined()
                expect(context.logout).toBeDefined()
                expect(context.checkAuth).toBeDefined()
              }}
            />
          </AuthProvider>
        ),
        container
      )
    })

    it('throws error if useAuth used outside provider', () => {
      const testContainer = document.createElement('div')
      document.body.appendChild(testContainer)

      expect(() => {
        render(
          () => {
            const context = useAuth()
            return <div>{context.isAuthenticated()}</div>
          },
          testContainer
        )
      }).toThrow('useAuth must be used within an AuthProvider')

      if (testContainer.parentNode) {
        testContainer.parentNode.removeChild(testContainer)
      }
    })
  })

  describe('Token Refresh', () => {
    it('refreshToken returns true when token is valid', async () => {
      const mockApi = createMockApiClient()
      localStorageMock.getItem.mockReturnValue(mockToken)
      mockApi.me.mockResolvedValue({ success: true, data: mockUser })

      let testResult: boolean | null = null

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                testResult = await context.refreshToken()
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(testResult).toBe(true)
    })

    it('refreshToken returns false when token is invalid', async () => {
      const mockApi = createMockApiClient()
      localStorageMock.getItem.mockReturnValue(mockToken)
      mockApi.me.mockResolvedValue({ success: false, error: 'Invalid token' })

      let testResult: boolean | null = null

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                testResult = await context.refreshToken()
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(testResult).toBe(false)
    })

    it('refreshToken clears auth state on failure', async () => {
      const mockApi = createMockApiClient()
      localStorageMock.getItem.mockReturnValue(mockToken)
      mockApi.me.mockResolvedValue({ success: false, error: 'Invalid token' })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.refreshToken()
                expect(context.isAuthenticated()).toBe(false)
                expect(context.user()).toBe(null)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })
  })

  describe('Edge Cases', () => {
    it('handles login with missing data gracefully', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: undefined as unknown as { user: typeof mockUser; token: string },
      })

      let testResult: boolean | null = null

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                testResult = await context.login({ email: 'test@example.com', password: 'password' })
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(testResult).toBe(false)
    })

    it('handles login with partial data gracefully', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: null as unknown as typeof mockUser, token: mockToken },
      })

      let testResult: boolean | null = null

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                testResult = await context.login({ email: 'test@example.com', password: 'password' })
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(testResult).toBe(false)
    })

    it('handles localStorage errors during token storage gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage unavailable')
      })

      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.token()).toBe(mockToken)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('handles rapid login/logout sequences', async () => {
      const mockApi = createMockApiClient()
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      })
      mockApi.logout.mockResolvedValue({ success: true })

      render(
        () => (
          <AuthProvider apiClient={mockApi}>
            <TestComponent
              testFn={async (context) => {
                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.isAuthenticated()).toBe(true)

                await context.logout()
                expect(context.isAuthenticated()).toBe(false)

                await context.login({ email: 'test@example.com', password: 'password' })
                expect(context.isAuthenticated()).toBe(true)

                await context.logout()
                expect(context.isAuthenticated()).toBe(false)
              }}
            />
          </AuthProvider>
        ),
        container
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(mockApi.login).toHaveBeenCalledTimes(2)
    })
  })
})
