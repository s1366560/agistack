import { Component, JSX, Show } from 'solid-js';
import { ProjectContextProvider } from '../../contexts/ProjectContext';
import { WorkspaceContextProvider } from '../../contexts/WorkspaceContext';
import { createApiEndpoints } from '../../services/api';
import { createApiClient } from '../../services/api/client';
import { AuthProvider, type AuthContextProps } from '../../contexts/AuthContext';

export interface AppLayoutProps {
  children?: JSX.Element;
  isLoading?: boolean;
  error?: Error | null;
}

export interface AppLayoutTestIds {
  root: string;
  sidebar: string;
  main: string;
  loading: string;
  error: string;
}

export const testIds: AppLayoutTestIds = {
  root: 'app-layout',
  sidebar: 'app-layout-sidebar',
  main: 'app-layout-main',
  loading: 'app-layout-loading',
  error: 'app-layout-error',
};

/**
 * AppLayout Component
 *
 * Main application layout with sidebar and main content area.
 * Handles loading states and error boundaries.
 * Provides all necessary Context Providers for the application.
 */
export const AppLayout: Component<AppLayoutProps> = (props) => {
  // Initialize API client
  const apiClient = createApiClient({
    baseURL: '/api',
    timeout: 10000,
    retries: 3,
    getToken: () => {
      // Get token from localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_token') || undefined;
      }
      return undefined;
    },
  });

  // Create API endpoints
  const apiEndpoints = createApiEndpoints(apiClient);

  return (
    <AuthProvider apiClient={apiEndpoints}>
      <WorkspaceContextProvider apiClient={apiEndpoints}>
        <ProjectContextProvider apiClient={apiEndpoints}>
          <div
            data-testid={testIds.root}
            class="layout-grid responsive"
          >
          {/* Sidebar Area */}
          <aside
            data-testid={testIds.sidebar}
            role="complementary"
            aria-label="Sidebar navigation"
            class="sidebar"
          >
            {/* Sidebar content will be rendered here */}
          </aside>

          {/* Main Content Area */}
          <main
            data-testid={testIds.main}
            role="main"
            class="main-content"
          >
            {/* Error State */}
            <Show when={props.error}>
              <div
                data-testid={testIds.error}
                class="error-message"
                role="alert"
              >
                <h2>Error</h2>
                <p>{props.error?.message}</p>
              </div>
            </Show>

            {/* Loading State */}
            <Show when={props.isLoading && !props.error}>
              <div
                data-testid={testIds.loading}
                class="loading-indicator"
                role="status"
                aria-live="polite"
              >
                <p>Loading...</p>
              </div>
            </Show>

            {/* Content */}
            <Show when={!props.isLoading && !props.error}>
              {props.children}
            </Show>
          </main>
        </div>
      </ProjectContextProvider>
    </WorkspaceContextProvider>
    </AuthProvider>
  );
};

export default AppLayout;
