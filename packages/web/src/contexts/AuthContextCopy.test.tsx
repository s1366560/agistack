import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { AuthProviderCopy, useAuthCopy } from './AuthContextCopy';

const mockApiClient = {
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
};

function TestComponent() {
  const context = useAuthCopy();
  return <div data-testid="test">{String(context.isAuthenticated())}</div>;
}

describe('AuthContextCopy - Separate test file', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('works with separate test file', () => {
    render(() => (
      <AuthProviderCopy apiClient={mockApiClient as any}>
        <TestComponent />
      </AuthProviderCopy>
    ), container);
    expect(container.querySelector('[data-testid="test"]')).toBeDefined();
  });
});
