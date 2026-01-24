import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { ProjectContextProvider, useProjectContext } from './ProjectContext';
import type { Project, CreateProject, UpdateProject } from '@agistack/shared';

/**
 * ProjectContext TDD Tests
 *
 * Test-Driven Development:
 * 1. RED - Write failing tests first
 * 2. GREEN - Implement minimal code to pass
 * 3. REFACTOR - Improve code while keeping tests green
 */

describe('ProjectContext', () => {
  let container: HTMLDivElement;

  // Mock API client
  const mockApiClient = {
    getProjects: vi.fn(),
    getProject: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  };

  // Helper component to test context
  function TestComponent() {
    const context = useProjectContext();
    return (
      <div data-testid="project-context">
        <div data-testid="loading">{String(context.isLoading())}</div>
        <div data-testid="error">{context.error() || 'no error'}</div>
        <div data-testid="current-project">
          {context.currentProject()?.id || 'none'}
        </div>
        <div data-testid="projects-count">
          {context.projects().length}
        </div>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('Context Provider', () => {
    it('should render context provider without crashing', () => {
      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestComponent />
        </ProjectContextProvider>
      ), container);
      expect(container.querySelector('[data-testid="project-context"]')).toBeDefined();
    });

    it('should provide context values to children', () => {
      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestComponent />
        </ProjectContextProvider>
      ), container);

      expect(container.querySelector('[data-testid="project-context"]')).toBeDefined();
      expect(container.querySelector('[data-testid="loading"]')).toBeDefined();
      expect(container.querySelector('[data-testid="error"]')).toBeDefined();
    });

    it('should throw error when useProjectContext is used outside provider', () => {
      const consoleError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(() => <TestComponent />, container);
      }).toThrow('useProjectContext must be used within a ProjectContextProvider');

      console.error = consoleError;
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty projects array', () => {
      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestComponent />
        </ProjectContextProvider>
      ), container);

      expect(container.querySelector('[data-testid="projects-count"]')?.textContent).toBe('0');
    });

    it('should initialize with null current project', () => {
      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestComponent />
        </ProjectContextProvider>
      ), container);

      expect(container.querySelector('[data-testid="current-project"]')?.textContent).toBe('none');
    });

    it('should initialize with not loading state', () => {
      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestComponent />
        </ProjectContextProvider>
      ), container);

      expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe('false');
    });

    it('should initialize with no error', () => {
      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestComponent />
        </ProjectContextProvider>
      ), container);

      expect(container.querySelector('[data-testid="error"]')?.textContent).toBe('no error');
    });
  });

  describe('Load Projects', () => {
    const mockProjects: Project[] = [
      {
        id: '1',
        workspaceId: 'workspace-1',
        name: 'Project 1',
        path: '/path/to/project1',
        description: 'First project',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        workspaceId: 'workspace-1',
        name: 'Project 2',
        path: '/path/to/project2',
        description: 'Second project',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    it('should load projects successfully', async () => {
      mockApiClient.getProjects.mockResolvedValue({
        success: true,
        data: mockProjects,
      });

      function TestLoadComponent() {
        const context = useProjectContext();
        return (
          <div>
            <button
              data-testid="load-projects"
              onClick={() => context.loadProjects('workspace-1')}
            >
              Load Projects
            </button>
            <div data-testid="projects-count">{context.projects().length}</div>
          </div>
        );
      }

      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestLoadComponent />
        </ProjectContextProvider>
      ), container);

      const loadButton = container.querySelector('[data-testid="load-projects"]') as HTMLButtonElement;
      loadButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(container.querySelector('[data-testid="projects-count"]')?.textContent).toBe('2');
    });

    it('should set loading state while loading projects', async () => {
      mockApiClient.getProjects.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                data: [],
              });
            }, 100);
          })
      );

      function TestLoadComponent() {
        const context = useProjectContext();
        return (
          <div>
            <button
              data-testid="load-projects"
              onClick={() => context.loadProjects('workspace-1')}
            >
              Load Projects
            </button>
            <div data-testid="loading">{String(context.isLoading())}</div>
          </div>
        );
      }

      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestLoadComponent />
        </ProjectContextProvider>
      ), container);

      const loadButton = container.querySelector('[data-testid="load-projects"]') as HTMLButtonElement;
      loadButton.click();

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe('true');
    });

    it('should handle load projects error', async () => {
      mockApiClient.getProjects.mockResolvedValue({
        success: false,
        error: 'Failed to load projects',
      });

      function TestLoadComponent() {
        const context = useProjectContext();
        return (
          <div>
            <button
              data-testid="load-projects"
              onClick={() => context.loadProjects('workspace-1')}
            >
              Load Projects
            </button>
            <div data-testid="error">{context.error() || 'no error'}</div>
          </div>
        );
      }

      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestLoadComponent />
        </ProjectContextProvider>
      ), container);

      const loadButton = container.querySelector('[data-testid="load-projects"]') as HTMLButtonElement;
      loadButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(container.querySelector('[data-testid="error"]')?.textContent).toBe('Failed to load projects');
    });
  });

  describe('Load Single Project', () => {
    const mockProject: Project = {
      id: '1',
      workspaceId: 'workspace-1',
      name: 'Project 1',
      path: '/path/to/project1',
      description: 'First project',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should load a single project by id', async () => {
      mockApiClient.getProject.mockResolvedValue({
        success: true,
        data: mockProject,
      });

      function TestLoadComponent() {
        const context = useProjectContext();
        return (
          <div>
            <button
              data-testid="load-project"
              onClick={() => context.loadProject('1')}
            >
              Load Project
            </button>
            <div data-testid="current-project">
              {context.currentProject()?.id || 'none'}
            </div>
          </div>
        );
      }

      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestLoadComponent />
        </ProjectContextProvider>
      ), container);

      const loadButton = container.querySelector('[data-testid="load-project"]') as HTMLButtonElement;
      loadButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(container.querySelector('[data-testid="current-project"]')?.textContent).toBe('1');
    });

    it('should cache loaded project', async () => {
      mockApiClient.getProject.mockResolvedValue({
        success: true,
        data: mockProject,
      });

      function TestLoadComponent() {
        const context = useProjectContext();
        return (
          <div>
            <button
              data-testid="load-project"
              onClick={() => context.loadProject('1')}
            >
              Load Project
            </button>
          </div>
        );
      }

      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestLoadComponent />
        </ProjectContextProvider>
      ), container);

      const loadButton = container.querySelector('[data-testid="load-project"]') as HTMLButtonElement;

      // First call should hit API
      loadButton.click();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockApiClient.getProject.mock.calls.length).toBe(1);

      // Second call should use cache (no API call)
      loadButton.click();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockApiClient.getProject.mock.calls.length).toBe(1);
    });
  });

  describe('Create Project', () => {
    const newProjectData: CreateProject = {
      workspaceId: 'workspace-1',
      name: 'New Project',
      path: '/path/to/new-project',
      description: 'A new project',
    };

    const createdProject: Project = {
      id: '3',
      ...newProjectData,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    };

    it('should create a new project', async () => {
      mockApiClient.createProject.mockResolvedValue({
        success: true,
        data: createdProject,
      });

      function TestCreateComponent() {
        const context = useProjectContext();
        return (
          <div>
            <button
              data-testid="create-project"
              onClick={() => context.createProject(newProjectData)}
            >
              Create Project
            </button>
            <div data-testid="projects-count">{context.projects().length}</div>
          </div>
        );
      }

      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestCreateComponent />
        </ProjectContextProvider>
      ), container);

      const createButton = container.querySelector('[data-testid="create-project"]') as HTMLButtonElement;
      createButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(container.querySelector('[data-testid="projects-count"]')?.textContent).toBe('1');
    });
  });

  describe('Update Project', () => {
    const existingProject: Project = {
      id: '1',
      workspaceId: 'workspace-1',
      name: 'Original Name',
      path: '/path/to/project1',
      description: 'Original description',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const updateData: UpdateProject = {
      name: 'Updated Name',
      description: 'Updated description',
    };

    const updatedProject: Project = {
      ...existingProject,
      ...updateData,
      updatedAt: new Date('2024-01-02'),
    };

    it('should update an existing project', async () => {
      mockApiClient.updateProject.mockResolvedValue({
        success: true,
        data: updatedProject,
      });

      function TestUpdateComponent() {
        const context = useProjectContext();
        context.setProjects([existingProject]);
        context.setCurrentProject(existingProject);

        return (
          <div>
            <button
              data-testid="update-project"
              onClick={() => context.updateProject('1', updateData)}
            >
              Update Project
            </button>
            <div data-testid="project-name">{context.currentProject()?.name || 'none'}</div>
          </div>
        );
      }

      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestUpdateComponent />
        </ProjectContextProvider>
      ), container);

      const updateButton = container.querySelector('[data-testid="update-project"]') as HTMLButtonElement;
      updateButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(container.querySelector('[data-testid="project-name"]')?.textContent).toBe('Updated Name');
    });
  });

  describe('Delete Project', () => {
    const projectToDelete: Project = {
      id: '1',
      workspaceId: 'workspace-1',
      name: 'Project to Delete',
      path: '/path/to/project1',
      description: 'Will be deleted',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should delete a project', async () => {
      mockApiClient.deleteProject.mockResolvedValue({
        success: true,
        data: undefined,
      });

      function TestDeleteComponent() {
        const context = useProjectContext();
        context.setProjects([projectToDelete]);

        return (
          <div>
            <button
              data-testid="delete-project"
              onClick={() => context.deleteProject('1')}
            >
              Delete Project
            </button>
            <div data-testid="projects-count">{context.projects().length}</div>
          </div>
        );
      }

      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestDeleteComponent />
        </ProjectContextProvider>
      ), container);

      const deleteButton = container.querySelector('[data-testid="delete-project"]') as HTMLButtonElement;
      deleteButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(container.querySelector('[data-testid="projects-count"]')?.textContent).toBe('0');
    });

    it('should clear current project if deleted project was current', async () => {
      mockApiClient.deleteProject.mockResolvedValue({
        success: true,
        data: undefined,
      });

      function TestDeleteComponent() {
        const context = useProjectContext();
        context.setProjects([projectToDelete]);
        context.setCurrentProject(projectToDelete);

        return (
          <div>
            <button
              data-testid="delete-project"
              onClick={() => context.deleteProject('1')}
            >
              Delete Project
            </button>
            <div data-testid="current-project">
              {context.currentProject()?.id || 'none'}
            </div>
          </div>
        );
      }

      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestDeleteComponent />
        </ProjectContextProvider>
      ), container);

      const deleteButton = container.querySelector('[data-testid="delete-project"]') as HTMLButtonElement;
      deleteButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(container.querySelector('[data-testid="current-project"]')?.textContent).toBe('none');
    });
  });

  describe('Switch Project', () => {
    const project1: Project = {
      id: '1',
      workspaceId: 'workspace-1',
      name: 'Project 1',
      path: '/path/to/project1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const project2: Project = {
      id: '2',
      workspaceId: 'workspace-1',
      name: 'Project 2',
      path: '/path/to/project2',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    };

    it('should switch current project', () => {
      function TestSwitchComponent() {
        const context = useProjectContext();
        context.setProjects([project1, project2]);

        return (
          <div>
            <button
              data-testid="switch-to-project-1"
              onClick={() => context.setCurrentProject(project1)}
            >
              Switch to Project 1
            </button>
            <button
              data-testid="switch-to-project-2"
              onClick={() => context.setCurrentProject(project2)}
            >
              Switch to Project 2
            </button>
            <div data-testid="current-project">
              {context.currentProject()?.name || 'none'}
            </div>
          </div>
        );
      }

      render(() => (
        <ProjectContextProvider apiClient={mockApiClient as any}>
          <TestSwitchComponent />
        </ProjectContextProvider>
      ), container);

      const switchToProject2 = container.querySelector('[data-testid="switch-to-project-2"]') as HTMLButtonElement;
      switchToProject2.click();

      expect(container.querySelector('[data-testid="current-project"]')?.textContent).toBe('Project 2');

      const switchToProject1 = container.querySelector('[data-testid="switch-to-project-1"]') as HTMLButtonElement;
      switchToProject1.click();

      expect(container.querySelector('[data-testid="current-project"]')?.textContent).toBe('Project 1');
    });
  });
});
