import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { AuthProvider, useAuth } from './AuthContext';

const mockApi = {
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
};

function TestConsumer() {
  const auth = useAuth();
  return <div data-testid="test">{String(auth.isAuthenticated())}</div>;
}

describe('AuthContext - Import Test', () => {
  it('works when imported from separate file', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(() => (
      <AuthProvider apiClient={mockApi as any}>
        <TestConsumer />
      </AuthProvider>
    ), container);

    const el = container.querySelector('[data-testid="test"]');
    expect(el?.textContent).toBe('false');

    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });
});
