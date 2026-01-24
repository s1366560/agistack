import { Component, createSignal, For, Show } from 'solid-js';
import { A } from '@solidjs/router';

export interface Workspace {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface SidebarProps {
  workspaces?: Workspace[];
  projects?: Project[];
  user?: User;
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
 */
export const Sidebar: Component<SidebarProps> = (props) => {
  const [isCollapsed, setIsCollapsed] = createSignal(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed());
  };

  const workspaces = () => props.workspaces || [];
  const projects = () => props.projects || [];

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
      </nav>

      <nav
        data-testid={testIds.projectList}
        class={`project-list ${isCollapsed() ? 'hidden' : ''}`}
      >
        <h3>Projects</h3>
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
      </nav>

      <Show when={props.user}>
        <div data-testid={testIds.userProfile} class="user-profile">
          <Show when={props.user?.avatarUrl}>
            <img src={props.user?.avatarUrl} alt={`${props.user?.name} avatar`} />
          </Show>
          <div class="user-info">
            <div class="user-name">{props.user?.name}</div>
            <div class="user-email">{props.user?.email}</div>
          </div>
        </div>
      </Show>
    </aside>
  );
};

export default Sidebar;
