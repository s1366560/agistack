import { Component } from 'solid-js';
import { A } from '@solidjs/router';

export default function Home() {
  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-gray-900">
            Welcome to AgiStack
          </h1>
          <p class="mt-4 text-lg text-gray-600">
            Your AI-powered programming assistant
          </p>
        </div>

        <div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <A
            href="/projects"
            class="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 class="text-xl font-semibold text-gray-900">Projects</h2>
            <p class="mt-2 text-gray-600">
              View and manage your coding projects
            </p>
          </A>

          <A
            href="/sessions"
            class="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 class="text-xl font-semibold text-gray-900">Sessions</h2>
            <p class="mt-2 text-gray-600">
              Continue your AI conversations
            </p>
          </A>

          <A
            href="/settings"
            class="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 class="text-xl font-semibold text-gray-900">Settings</h2>
            <p class="mt-2 text-gray-600">
              Configure your workspace
            </p>
          </A>
        </div>
      </div>
    </div>
  );
}
