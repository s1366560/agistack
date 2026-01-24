import { createContext, useContext, JSX } from 'solid-js';
import { createSignal, Accessor } from 'solid-js';
import type { User } from '@agistack/shared';
import type { LoginCredentials, LoginResponse, AuthContextValue, AuthProviderProps } from './AuthContext.types';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProviderWithTypes(props: AuthProviderProps): JSX.Element {
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

export function useAuthWithTypes(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthWithTypes must be used within an AuthProviderWithTypes');
  }
  return context;
}
