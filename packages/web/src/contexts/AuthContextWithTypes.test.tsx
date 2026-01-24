import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { AuthProviderWithTypes, useAuthWithTypes } from './AuthContextWithTypes';

const mockApiClient = {
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
};

function TestComponent() {
  const context = useAuthWithTypes();
  return <div data-testid="test">{String(context.isAuthenticated())}</div>;
}

describe('AuthContextWithTypes - With type imports', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('works with types import', () => {
    render(() => (
      <AuthProviderWithTypes apiClient={mockApiClient as any}>
        <TestComponent />
      </AuthProviderWithTypes>
    ), container);
    expect(container.querySelector('[data-testid="test"]')).toBeDefined();
  });
});
