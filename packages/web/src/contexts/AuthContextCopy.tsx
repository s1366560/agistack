import { createContext, useContext, JSX } from 'solid-js';
import { createSignal, Accessor } from 'solid-js';
import type { User } from '@agistack/shared';

/**
 * Auth state interface
 */
interface AuthState {
  isAuthenticated: Accessor<boolean>;
  user: Accessor<User | null>;
  token: Accessor<string | null>;
  loading: Accessor<boolean>;
}

/**
 * Auth actions interface
 */
interface AuthActions {
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<boolean>;
}

/**
 * Combined auth context value interface
 */
interface AuthContextValue extends AuthState, AuthActions {}

/**
 * Auth context provider props
 */
interface AuthProviderProps {
  apiClient?: any;
  children: JSX.Element;
}

/**
 * AuthContext
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthContext Provider Component
 */
export function AuthProviderCopy(props: AuthProviderProps): JSX.Element {
  // Reactive state
  const [isAuthenticated, setIsAuthenticated] = createSignal<boolean>(false);
  const [user, setUser] = createSignal<User | null>(null);
  const [token, setToken] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal<boolean>(false);

  const login = async (): Promise<boolean> => true;
  const logout = async (): Promise<boolean> => true;

  const state: AuthContextValue = {
    isAuthenticated,
    user,
    token,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={state}>
      {props.children}
    </AuthContext.Provider>
  );
}

/**
 * Use Auth Context Hook
 */
export function useAuthCopy(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthCopy must be used within an AuthProviderCopy');
  }

  return context;
}
