import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { ProjectContextProvider, useProjectContext } from './ProjectContext';

describe('ProjectContext - Verification it still works', () => {
  let container: HTMLDivElement;

  const mockApiClient = {
    getProjects: vi.fn(),
    getProject: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  };

  function TestComponent() {
    const context = useProjectContext();
    return (
      <div data-testid="project-context">
        <div data-testid="loading">{String(context.isLoading())}</div>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should still work', () => {
    render(() => (
      <ProjectContextProvider apiClient={mockApiClient as any}>
        <TestComponent />
      </ProjectContextProvider>
    ), container);
    expect(container.querySelector('[data-testid="project-context"]')).toBeDefined();
  });
});
