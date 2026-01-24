/**
 * Layout Component Test Fixtures
 *
 * Mock props and data for layout component testing
 */

import type { SidebarProps, HeaderProps } from '@/components/layout';

export const mockSidebarProps: SidebarProps = {
  workspaces: [
    { id: '1', name: 'Workspace 1' },
    { id: '2', name: 'Workspace 2' },
  ],
  projects: [
    { id: '1', name: 'Project 1', workspaceId: '1' },
    { id: '2', name: 'Project 2', workspaceId: '1' },
  ],
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
  },
  currentPath: '/projects/1',
};

export const mockEmptySidebarProps: SidebarProps = {
  workspaces: [],
  projects: [],
  user: undefined,
};

export const mockHeaderProps: HeaderProps = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
  },
};
