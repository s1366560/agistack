import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { AuthProviderInlineTypes, useAuthInlineTypes } from './AuthContextInlineTypes';

const mockApiClient = {
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
};

function TestComponent() {
  const context = useAuthInlineTypes();
  return <div data-testid="test">{String(context.isAuthenticated())}</div>;
}

describe('AuthContextInlineTypes - Inline types', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('works with inline types', () => {
    render(() => (
      <AuthProviderInlineTypes apiClient={mockApiClient as any}>
        <TestComponent />
      </AuthProviderInlineTypes>
    ), container);
    expect(container.querySelector('[data-testid="test"]')).toBeDefined();
  });
});
