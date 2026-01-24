import { Component, createSignal, For, Show, onMount } from 'solid-js';
import { A } from '@solidjs/router';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Workspace, Project, User } from '@agistack/shared';

export interface SidebarProps {
  currentPath?: string;
}

export interface SidebarTestIds {
  root: string;
  toggle: string;
  workspaceList: string;
  projectList: string;
  userProfile: string;
}

export const testIds: SidebarTestIds = {
  root: 'sidebar',
  toggle: 'sidebar-toggle',
  workspaceList: 'workspace-list',
  projectList: 'project-list',
  userProfile: 'user-profile',
};

/**
 * Sidebar Component
 *
 * Navigation sidebar with workspace, project lists, and user profile.
 * Supports collapsible behavior and responsive design.
 * Fetches data from Context instead of props.
 */
export const Sidebar: Component<SidebarProps> = (props) => {
  const [isCollapsed, setIsCollapsed] = createSignal(false);

  const { projects } = useProjectContext();
  const { workspaces, loadWorkspaces } = useWorkspaceContext();
  const { user } = useAuth();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed());
  };

  // Load workspaces on mount
  onMount(async () => {
    await loadWorkspaces();
  });

  return (
    <aside
      data-testid={testIds.root}
      class={`sidebar ${isCollapsed() ? 'collapsed' : ''}`}
    >
      <button
        data-testid={testIds.toggle}
        onClick={toggleCollapse}
        class="sidebar-toggle"
        aria-label="Toggle sidebar"
      >
        {isCollapsed() ? '→' : '←'}
      </button>

      <nav
        data-testid={testIds.workspaceList}
        class={`workspace-list ${isCollapsed() ? 'hidden' : ''}`}
      >
        <h3>Workspaces</h3>
        <Show
          when={workspaces().length > 0}
          fallback={
            <p class="text-sm text-gray-500 dark:text-gray-400">
              No workspaces yet
            </p>
          }
        >
          <ul>
            <For each={workspaces()}>
              {(workspace) => (
                <li>
                  <A
                    href={`/workspaces/${workspace.id}`}
                    data-active={props.currentPath === `/workspaces/${workspace.id}`}
                    data-testid={`workspace-${workspace.id}`}
                  >
                    {workspace.name}
                  </A>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </nav>

      <nav
        data-testid={testIds.projectList}
        class={`project-list ${isCollapsed() ? 'hidden' : ''}`}
      >
        <h3>Projects</h3>
        <Show
          when={projects().length > 0}
          fallback={
            <p class="text-sm text-gray-500 dark:text-gray-400">
              No projects yet
            </p>
          }
        >
          <ul>
            <For each={projects()}>
              {(project) => (
                <li>
                  <A
                    href={`/projects/${project.id}`}
                    data-active={props.currentPath === `/projects/${project.id}`}
                    data-testid={`project-${project.id}`}
                  >
                    {project.name}
                  </A>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </nav>

      <Show when={user()}>
        <div data-testid={testIds.userProfile} class="user-profile">
          <Show when={user()?.avatarUrl}>
            <img src={user()?.avatarUrl} alt={`${user()?.name} avatar`} />
          </Show>
          <div class="user-info">
            <div class="user-name">{user()?.name || user()?.email}</div>
            <div class="user-email">{user()?.email}</div>
          </div>
        </div>
      </Show>
    </aside>
  );
};

export default Sidebar;
