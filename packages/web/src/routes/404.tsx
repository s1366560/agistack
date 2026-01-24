import { Component } from 'solid-js';
import { A } from '@solidjs/router';

export default function NotFound() {
  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-gray-900">404</h1>
        <p class="mt-4 text-xl text-gray-600">Page not found</p>
        <A
          href="/"
          class="mt-8 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Home
        </A>
      </div>
    </div>
  );
}
