import { Component } from 'solid-js';
import { A } from '@solidjs/router';

export default function ProjectList() {
  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="flex justify-between items-center">
          <h1 class="text-3xl font-bold text-gray-900">Projects</h1>
          <button
            onClick={() => {/* TODO: Implement create project */}}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Project
          </button>
        </div>

        <div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* TODO: Fetch and display projects */}
          <div class="p-6 bg-white rounded-lg shadow-md">
            <p class="text-gray-500">No projects yet. Create your first project!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
