import { Component, onMount } from 'solid-js';
import { A } from '@solidjs/router';
import { useProjectContext } from '../../contexts/ProjectContext';

export default function ProjectList() {
  const {
    projects,
    isLoading,
    error,
    loadProjects,
    deleteProject,
  } = useProjectContext();

  // Load projects on mount
  onMount(() => {
    loadProjects();
  });

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteProject(id);
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="flex justify-between items-center">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-dark-text">
            Projects
          </h1>
          <A
            href="/projects/new"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Create Project
          </A>
        </div>

        {/* Error State */}
        {error() && (
          <div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-800">{error()}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading() && (
          <div class="mt-8 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p class="mt-2 text-gray-600">Loading projects...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading() && projects().length === 0 && (
          <div class="mt-8 p-12 bg-white dark:bg-dark-surface rounded-lg shadow-md text-center">
            <p class="text-gray-500 dark:text-gray-400 text-lg">
              No projects yet. Create your first project to get started!
            </p>
          </div>
        )}

        {/* Projects Grid */}
        {!isLoading() && projects().length > 0 && (
          <div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects().map((project) => (
              <div
                key={project.id}
                class="p-6 bg-white dark:bg-dark-surface rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <A
                      href={`/projects/${project.id}`}
                      class="text-xl font-semibold text-gray-900 dark:text-dark-text hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      {project.name}
                    </A>
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {project.path}
                    </p>
                    {project.description && (
                      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(project.id, project.name)}
                    class="ml-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete project"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div class="mt-4 flex items-center justify-between">
                  <span class="text-xs text-gray-400">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <A
                    href={`/projects/${project.id}`}
                    class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    View →
                  </A>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
