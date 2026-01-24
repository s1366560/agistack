import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { createContext, useContext, JSX } from 'solid-js';
import { createSignal, Accessor } from 'solid-js';

interface FakeUser {
  id: string;
  email: string;
}

const AuthContext = createContext<{
  isAuthenticated: Accessor<boolean>;
  user: Accessor<FakeUser | null>;
  token: Accessor<string | null>;
  loading: Accessor<boolean>;
  login: () => Promise<boolean>;
  logout: () => Promise<boolean>;
} | undefined>(undefined);

function TestProvider(props: { children: any }) {
  const [isAuthenticated] = createSignal<boolean>(false);
  const [user] = createSignal<FakeUser | null>(null);
  const [token] = createSignal<string | null>(null);
  const [loading] = createSignal<boolean>(false);

  const login = async (): Promise<boolean> => true;
  const logout = async (): Promise<boolean> => true;

  const value = {
    isAuthenticated,
    user,
    token,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

function useTestAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useTestAuth must be used within TestProvider');
  }
  return context;
}

function TestComponent() {
  const context = useTestAuth();
  return <div data-testid="test">{String(context.isAuthenticated())}</div>;
}

describe('NoUserType - Minimal test', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('works without User type import', () => {
    render(() => (
      <TestProvider>
        <TestComponent />
      </TestProvider>
    ), container);
    expect(container.querySelector('[data-testid="test"]')).toBeDefined();
  });
});
