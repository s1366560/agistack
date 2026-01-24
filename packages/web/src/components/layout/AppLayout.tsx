import { Component, JSX, Show } from 'solid-js';

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
 */
export const AppLayout: Component<AppLayoutProps> = (props) => {
  return (
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
  );
};

export default AppLayout;
