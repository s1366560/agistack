import { createContext, useContext, JSX } from 'solid-js';
import { createSignal, Accessor } from 'solid-js';
import type {
  Workspace,
  CreateWorkspace,
  UpdateWorkspace,
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
 * Workspace API Client Interface
 */
export interface WorkspaceApiClient {
  getWorkspaces(): Promise<ApiResponse<Workspace[]>>;
  getWorkspace(id: string): Promise<ApiResponse<Workspace>>;
  createWorkspace(data: Omit<CreateWorkspace, 'userId'>): Promise<ApiResponse<Workspace>>;
  updateWorkspace(id: string, data: UpdateWorkspace): Promise<ApiResponse<Workspace>>;
  deleteWorkspace(id: string): Promise<ApiResponse<void>>;
}

/**
 * Workspace Context State
 */
export interface WorkspaceContextState {
  workspaces: Accessor<Workspace[]>;
  currentWorkspace: Accessor<Workspace | null>;
  isLoading: Accessor<boolean>;
  error: Accessor<string | null>;
  loadWorkspaces: () => Promise<void>;
  loadWorkspace: (id: string) => Promise<void>;
  createWorkspace: (data: Omit<CreateWorkspace, 'userId'>) => Promise<void>;
  updateWorkspace: (id: string, data: UpdateWorkspace) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
}

/**
 * Workspace Context Props
 */
export interface WorkspaceContextProviderProps {
  apiClient: WorkspaceApiClient;
  children: JSX.Element;
}

/**
 * Workspace Context
 */
const WorkspaceContext = createContext<WorkspaceContextState | undefined>(undefined);

/**
 * Workspace Context Provider
 *
 * Manages workspace state and provides CRUD operations for workspaces.
 * Includes caching, loading states, and error handling.
 */
export function WorkspaceContextProvider(props: WorkspaceContextProviderProps) {
  // Reactive state
  const [workspaces, setWorkspaces] = createSignal<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = createSignal<Workspace | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Workspace cache (non-reactive)
  const workspaceCache = new Map<string, Workspace>();

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
   * Load all workspaces for the current user
   */
  const loadWorkspaces = async () => {
    await withLoading(async () => {
      const response = await props.apiClient.getWorkspaces();

      if (response.success && response.data) {
        setWorkspaces(response.data);
        // Cache all workspaces
        response.data.forEach((workspace) => {
          workspaceCache.set(workspace.id, workspace);
        });
      } else {
        setError(response.error || 'Failed to load workspaces');
      }
    });
  };

  /**
   * Load a single workspace by ID
   */
  const loadWorkspace = async (id: string) => {
    // Check cache first
    if (workspaceCache.has(id)) {
      setCurrentWorkspace(workspaceCache.get(id)!);
      return;
    }

    await withLoading(async () => {
      const response = await props.apiClient.getWorkspace(id);

      if (response.success && response.data) {
        setCurrentWorkspace(response.data);
        workspaceCache.set(id, response.data);
      } else {
        setError(response.error || 'Failed to load workspace');
      }
    });
  };

  /**
   * Create a new workspace
   */
  const createWorkspace = async (data: Omit<CreateWorkspace, 'userId'>) => {
    await withLoading(async () => {
      const response = await props.apiClient.createWorkspace(data);

      if (response.success && response.data) {
        setWorkspaces([...workspaces(), response.data]);
        workspaceCache.set(response.data.id, response.data);
        setCurrentWorkspace(response.data);
      } else {
        setError(response.error || 'Failed to create workspace');
      }
    });
  };

  /**
   * Update an existing workspace
   */
  const updateWorkspace = async (id: string, data: UpdateWorkspace) => {
    await withLoading(async () => {
      const response = await props.apiClient.updateWorkspace(id, data);

      if (response.success && response.data) {
        setWorkspaces(
          workspaces().map((w) => (w.id === id ? response.data! : w))
        );
        workspaceCache.set(id, response.data);

        if (currentWorkspace()?.id === id) {
          setCurrentWorkspace(response.data);
        }
      } else {
        setError(response.error || 'Failed to update workspace');
      }
    });
  };

  /**
   * Delete a workspace
   */
  const deleteWorkspace = async (id: string) => {
    await withLoading(async () => {
      const response = await props.apiClient.deleteWorkspace(id);

      if (response.success) {
        setWorkspaces(workspaces().filter((w) => w.id !== id));
        workspaceCache.delete(id);

        if (currentWorkspace()?.id === id) {
          setCurrentWorkspace(null);
        }
      } else {
        setError(response.error || 'Failed to delete workspace');
      }
    });
  };

  /**
   * Context value
   */
  const state: WorkspaceContextState = {
    workspaces,
    currentWorkspace,
    isLoading,
    error,
    loadWorkspaces,
    loadWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setCurrentWorkspace,
    setWorkspaces,
  };

  return (
    <WorkspaceContext.Provider value={state}>
      {props.children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Use Workspace Context Hook
 *
 * Provides access to workspace state and operations.
 * Must be used within a WorkspaceContextProvider.
 */
export function useWorkspaceContext(): WorkspaceContextState {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceContextProvider');
  }

  return context;
}
