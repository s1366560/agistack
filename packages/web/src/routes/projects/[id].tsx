import { Component } from 'solid-js';
import { useParams, A } from '@solidjs/router';

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id;

  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="mb-6">
          <A href="/projects" class="text-blue-600 hover:text-blue-700">
            ← Back to Projects
          </A>
        </div>

        <h1 class="text-3xl font-bold text-gray-900">
          Project: {projectId}
        </h1>

        <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Sessions</h2>
            <p class="text-gray-500">No sessions yet. Start a conversation!</p>
            <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              New Session
            </button>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Files</h2>
            <p class="text-gray-500">No files in this project yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
