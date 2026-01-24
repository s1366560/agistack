import { createContext, useContext, JSX } from 'solid-js';
import { createSignal, Accessor } from 'solid-js';
import type { User } from '@agistack/shared';

// Inline types - no separate imports
interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

interface AuthState {
  isAuthenticated: Accessor<boolean>;
  user: Accessor<User | null>;
  token: Accessor<string | null>;
  loading: Accessor<boolean>;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

interface AuthContextValue extends AuthState, AuthActions {}

interface AuthProviderProps {
  apiClient?: {
    login: (credentials: LoginCredentials) => Promise<{ success: boolean; data?: LoginResponse; error?: string }>;
    logout: () => Promise<{ success: boolean; error?: string }>;
    me: () => Promise<{ success: boolean; data?: User; error?: string }>;
  };
  storageKey?: string;
  children: JSX.Element;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProviderInlineTypes(props: AuthProviderProps): JSX.Element {
  const { apiClient, storageKey = 'agistack-auth-token', children } = props;

  const [isAuthenticated, setIsAuthenticated] = createSignal<boolean>(false);
  const [user, setUser] = createSignal<User | null>(null);
  const [token, setToken] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal<boolean>(false);

  const login = async (): Promise<boolean> => true;
  const logout = async (): Promise<boolean> => true;
  const checkAuth = async (): Promise<void> => {};
  const refreshToken = async (): Promise<boolean> => true;

  const contextValue: AuthContextValue = {
    isAuthenticated,
    user,
    token,
    loading,
    login,
    logout,
    checkAuth,
    refreshToken,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuthInlineTypes(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthInlineTypes must be used within an AuthProviderInlineTypes');
  }
  return context;
}
