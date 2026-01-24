import { createContext, useContext, JSX } from 'solid-js';
import { createSignal, Accessor } from 'solid-js';
import type {
  Project,
  CreateProject,
  UpdateProject,
  ProjectSummary,
} from '@agistack/shared';

/**
 * API Response Types
 */
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Project API Client Interface
 */
export interface ProjectApiClient {
  getProjects(workspaceId?: string): Promise<ApiResponse<ProjectSummary[]>>;
  getProject(id: string): Promise<ApiResponse<Project>>;
  createProject(data: CreateProject): Promise<ApiResponse<Project>>;
  updateProject(id: string, data: UpdateProject): Promise<ApiResponse<Project>>;
  deleteProject(id: string): Promise<ApiResponse<void>>;
}

/**
 * Project Context State
 */
export interface ProjectContextState {
  projects: Accessor<Project[]>;
  currentProject: Accessor<Project | null>;
  isLoading: Accessor<boolean>;
  error: Accessor<string | null>;
  loadProjects: (workspaceId?: string) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (data: CreateProject) => Promise<void>;
  updateProject: (id: string, data: UpdateProject) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
}

/**
 * Project Context Props
 */
export interface ProjectContextProviderProps {
  apiClient: ProjectApiClient;
  children: JSX.Element;
}

/**
 * Project Context
 */
const ProjectContext = createContext<ProjectContextState | undefined>(undefined);

/**
 * Project Context Provider
 *
 * Manages project state and provides CRUD operations for projects.
 * Includes caching, loading states, and error handling.
 */
export function ProjectContextProvider(props: ProjectContextProviderProps) {
  // Reactive state
  const [projects, setProjects] = createSignal<Project[]>([]);
  const [currentProject, setCurrentProject] = createSignal<Project | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Project cache (non-reactive)
  const projectCache = new Map<string, Project>();

  /**
   * Helper: Convert ProjectSummary to Project
   */
  const summaryToProject = (summary: ProjectSummary): Project => ({
    id: summary.id,
    workspaceId: summary.workspaceId,
    name: summary.name,
    path: summary.path,
    description: undefined,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  });

  /**
   * Helper: Execute async operation with loading state
   */
  const withLoading = async (operation: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);
    try {
      await operation();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load projects for a workspace
   */
  const loadProjects = async (workspaceId?: string) => {
    await withLoading(async () => {
      const response = await props.apiClient.getProjects(workspaceId);

      if (response.success && response.data) {
        const projectList = response.data.map(summaryToProject);
        setProjects(projectList);
      } else {
        setError(response.error || 'Failed to load projects');
      }
    });
  };

  /**
   * Load a single project by ID
   */
  const loadProject = async (id: string) => {
    // Check cache first
    if (projectCache.has(id)) {
      setCurrentProject(projectCache.get(id)!);
      return;
    }

    await withLoading(async () => {
      const response = await props.apiClient.getProject(id);

      if (response.success && response.data) {
        setCurrentProject(response.data);
        projectCache.set(id, response.data);
      } else {
        setError(response.error || 'Failed to load project');
      }
    });
  };

  /**
   * Create a new project
   */
  const createProject = async (data: CreateProject) => {
    await withLoading(async () => {
      const response = await props.apiClient.createProject(data);

      if (response.success && response.data) {
        setProjects([...projects(), response.data]);
        projectCache.set(response.data.id, response.data);
        setCurrentProject(response.data);
      } else {
        setError(response.error || 'Failed to create project');
      }
    });
  };

  /**
   * Update an existing project
   */
  const updateProject = async (id: string, data: UpdateProject) => {
    await withLoading(async () => {
      const response = await props.apiClient.updateProject(id, data);

      if (response.success && response.data) {
        setProjects(
          projects().map((p) => (p.id === id ? response.data! : p))
        );
        projectCache.set(id, response.data);

        if (currentProject()?.id === id) {
          setCurrentProject(response.data);
        }
      } else {
        setError(response.error || 'Failed to update project');
      }
    });
  };

  /**
   * Delete a project
   */
  const deleteProject = async (id: string) => {
    await withLoading(async () => {
      const response = await props.apiClient.deleteProject(id);

      if (response.success) {
        setProjects(projects().filter((p) => p.id !== id));
        projectCache.delete(id);

        if (currentProject()?.id === id) {
          setCurrentProject(null);
        }
      } else {
        setError(response.error || 'Failed to delete project');
      }
    });
  };

  /**
   * Context value
   */
  const state: ProjectContextState = {
    projects,
    currentProject,
    isLoading,
    error,
    loadProjects,
    loadProject,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    setProjects,
  };

  return (
    <ProjectContext.Provider value={state}>
      {props.children}
    </ProjectContext.Provider>
  );
}

/**
 * Use Project Context Hook
 *
 * Provides access to project state and operations.
 * Must be used within a ProjectContextProvider.
 */
export function useProjectContext(): ProjectContextState {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectContextProvider');
  }

  return context;
}
