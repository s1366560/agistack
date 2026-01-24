import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { AuthProviderCombined, useAuthCombined } from './AuthContextCombined';

const mockApiClient = {
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
};

function TestComponent() {
  const context = useAuthCombined();
  return <div data-testid="test">{String(context.isAuthenticated())}</div>;
}

describe('AuthContextCombined - All in one file', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('works with all types inline', () => {
    render(() => (
      <AuthProviderCombined apiClient={mockApiClient as any}>
        <TestComponent />
      </AuthProviderCombined>
    ), container);
    expect(container.querySelector('[data-testid="test"]')).toBeDefined();
  });
});
