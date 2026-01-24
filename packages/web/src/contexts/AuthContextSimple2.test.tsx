import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { AuthProvider, useAuth } from './AuthContext';

describe('AuthContext - Exact Copy of ProjectPattern', () => {
  let container: HTMLDivElement;

  const mockApiClient = {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  };

  // Helper component to test context - EXACT copy of ProjectContext pattern
  function TestComponent() {
    const context = useAuth();
    return (
      <div data-testid="auth-context">
        <div data-testid="authenticated">{String(context.isAuthenticated())}</div>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should render context provider without crashing', () => {
    render(() => (
      <AuthProvider apiClient={mockApiClient as any}>
        <TestComponent />
      </AuthProvider>
    ), container);
    expect(container.querySelector('[data-testid="auth-context"]')).toBeDefined();
  });
});
