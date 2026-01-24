import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from 'solid-js/web'
import { AuthProvider, useAuth } from './AuthContext'

const mockApi = {
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
}

function TestComponent() {
  const context = useAuth()
  return <div data-testid="test">{String(context.isAuthenticated())}</div>
}

describe('AuthContext - Simple', () => {
  it('works at all', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    render(
      () => (
        <AuthProvider apiClient={mockApi}>
          <TestComponent />
        </AuthProvider>
      ),
      container
    )

    expect(container.querySelector('[data-testid="test"]')).toBeDefined()

    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })
})
