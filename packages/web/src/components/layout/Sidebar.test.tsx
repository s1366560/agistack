import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'solid-js/web';
import { fireEvent } from '@testing-library/dom';
import { Sidebar, testIds, type SidebarProps } from './Sidebar';

describe('Sidebar', () => {
  let container: HTMLDivElement;

  const mockWorkspaces = [
    { id: '1', name: 'Workspace 1' },
    { id: '2', name: 'Workspace 2' },
  ];

  const mockProjects = [
    { id: '1', name: 'Project 1', workspaceId: '1' },
    { id: '2', name: 'Project 2', workspaceId: '1' },
  ];

  const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  const defaultProps: SidebarProps = {
    workspaces: mockWorkspaces,
    projects: mockProjects,
    user: mockUser,
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('Rendering', () => {
    it('should render sidebar component', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const sidebar = container.querySelector(`[data-testid="${testIds.root}"]`);
      expect(sidebar).toBeDefined();
    });

    it('should render with all required sections', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      expect(container.querySelector(`[data-testid="${testIds.root}"]`)).toBeDefined();
      expect(container.querySelector(`[data-testid="${testIds.workspaceList}"]`)).toBeDefined();
      expect(container.querySelector(`[data-testid="${testIds.projectList}"]`)).toBeDefined();
      expect(container.querySelector(`[data-testid="${testIds.userProfile}"]`)).toBeDefined();
    });

    it('should render workspace list', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const workspaceList = container.querySelector(`[data-testid="${testIds.workspaceList}"]`);
      expect(workspaceList).toBeDefined();

      const workspaceItems = workspaceList?.querySelectorAll('[data-testid^="workspace-"]');
      expect(workspaceItems?.length).toBe(mockWorkspaces.length);
    });

    it('should render project list', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const projectList = container.querySelector(`[data-testid="${testIds.projectList}"]`);
      expect(projectList).toBeDefined();

      const projectItems = projectList?.querySelectorAll('[data-testid^="project-"]');
      expect(projectItems?.length).toBe(mockProjects.length);
    });

    it('should render user profile section', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const userProfile = container.querySelector(`[data-testid="${testIds.userProfile}"]`);
      expect(userProfile).toBeDefined();

      expect(userProfile?.textContent).toContain(mockUser.name);
      expect(userProfile?.textContent).toContain(mockUser.email);
    });

    it('should render without user profile when user not provided', () => {
      const props = { ...defaultProps, user: undefined };

      render(() => <Sidebar {...props} />, container);

      const userProfile = container.querySelector(`[data-testid="${testIds.userProfile}"]`);
      expect(userProfile).toBeNull();
    });
  });

  describe('Collapsible Behavior', () => {
    it('should render toggle button', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const toggle = container.querySelector(`[data-testid="${testIds.toggle}"]`);
      expect(toggle).toBeDefined();
    });

    it('should be expanded by default', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const sidebar = container.querySelector(`[data-testid="${testIds.root}"]`);
      expect(sidebar?.classList.contains('collapsed')).toBe(false);
    });

    it('should toggle collapse on button click', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const toggle = container.querySelector(`[data-testid="${testIds.toggle}"]`) as HTMLButtonElement;
      const sidebar = container.querySelector(`[data-testid="${testIds.root}"]`);

      // Initial state: expanded
      expect(sidebar?.classList.contains('collapsed')).toBe(false);

      // Click to collapse
      if (toggle) fireEvent.click(toggle);
      expect(sidebar?.classList.contains('collapsed')).toBe(true);

      // Click to expand
      if (toggle) fireEvent.click(toggle);
      expect(sidebar?.classList.contains('collapsed')).toBe(false);
    });

    it('should hide content when collapsed', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const toggle = container.querySelector(`[data-testid="${testIds.toggle}"]`) as HTMLButtonElement;
      const sidebar = container.querySelector(`[data-testid="${testIds.root}"]`);

      // Collapse sidebar
      if (toggle) fireEvent.click(toggle);

      const workspaceList = container.querySelector(`[data-testid="${testIds.workspaceList}"]`);
      const projectList = container.querySelector(`[data-testid="${testIds.projectList}"]`);

      // Content should be hidden (but still in DOM for SolidJS)
      expect(workspaceList?.classList.contains('hidden')).toBe(true);
      expect(projectList?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Navigation', () => {
    it('should highlight active route', () => {
      const props = { ...defaultProps, currentPath: `/projects/${mockProjects[0].id}` };

      render(() => <Sidebar {...props} />, container);

      const activeLink = container.querySelector('[data-active="true"]');
      expect(activeLink).toBeDefined();
      expect(activeLink?.getAttribute('href')).toBe(`/projects/${mockProjects[0].id}`);
    });

    it('should render navigation links for workspaces', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const workspaceLinks = container.querySelectorAll('a[href^="/workspaces/"]');
      expect(workspaceLinks.length).toBe(mockWorkspaces.length);
    });

    it('should render navigation links for projects', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const projectLinks = container.querySelectorAll('a[href^="/projects/"]');
      expect(projectLinks.length).toBe(mockProjects.length);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes', () => {
      render(() => <Sidebar {...defaultProps} />, container);

      const sidebar = container.querySelector(`[data-testid="${testIds.root}"]`);
      expect(sidebar?.classList.contains('sidebar')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should render empty workspace list', () => {
      const props = { ...defaultProps, workspaces: [] };

      render(() => <Sidebar {...props} />, container);

      const workspaceList = container.querySelector(`[data-testid="${testIds.workspaceList}"]`);
      expect(workspaceList).toBeDefined();

      const workspaceItems = workspaceList?.querySelectorAll('[data-testid^="workspace-"]');
      expect(workspaceItems?.length).toBe(0);
    });

    it('should render empty project list', () => {
      const props = { ...defaultProps, projects: [] };

      render(() => <Sidebar {...props} />, container);

      const projectList = container.querySelector(`[data-testid="${testIds.projectList}"]`);
      expect(projectList).toBeDefined();

      const projectItems = projectList?.querySelectorAll('[data-testid^="project-"]');
      expect(projectItems?.length).toBe(0);
    });

    it('should render without crashing when no props provided', () => {
      render(() => <Sidebar />, container);

      const sidebar = container.querySelector(`[data-testid="${testIds.root}"]`);
      expect(sidebar).toBeDefined();
    });
  });
});
