import { Component, Show, For, onMount, createSignal } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { createChatApi } from '../../services/api/chat-api';
import type { Session } from '@agistack/shared';

export default function SessionsList() {
  const navigate = useNavigate();
  const chatApi = createChatApi();

  const [sessions, setSessions] = createSignal<Session[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chatApi.getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadSessions();
  });

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setSessions((prev) => prev.filter((s) => s.id !== id));
      } else {
        throw new Error('Failed to delete session');
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Chat Sessions</h1>
            <p class="mt-2 text-sm text-gray-600">
              Your AI conversation history
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Home
          </button>
        </div>

        {/* Loading State */}
        <Show when={loading()}>
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </Show>

        {/* Error State */}
        <Show when={error()}>
          <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg
                  class="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Error</h3>
                <div class="mt-2 text-sm text-red-700">{error()}</div>
              </div>
            </div>
            <button
              onClick={loadSessions}
              class="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </Show>

        {/* Empty State */}
        <Show when={!loading() && !error() && sessions().length === 0}>
          <div class="text-center py-12">
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No sessions</h3>
            <p class="mt-1 text-sm text-gray-500">
              Get started by creating a new chat session.
            </p>
            <div class="mt-6">
              <button
                onClick={() => navigate('/projects')}
                class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create New Session
              </button>
            </div>
          </div>
        </Show>

        {/* Sessions List */}
        <Show when={!loading() && !error() && sessions().length > 0}>
          <div class="bg-white shadow overflow-hidden sm:rounded-md">
            <ul class="divide-y divide-gray-200">
              <For each={sessions()}>
                {(session) => (
                  <li class="block hover:bg-gray-50">
                    <div class="px-4 py-4 sm:px-6">
                      <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                          <A
                            href={`/chat/${session.id}`}
                            class="text-sm font-medium text-indigo-600 truncate hover:text-indigo-900"
                          >
                            {session.title || 'Untitled Session'}
                          </A>
                          <div class="mt-1 flex items-center text-sm text-gray-500">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mr-2">
                              {session.agentType}
                            </span>
                            <span>
                              Created:{' '}
                              {new Date(session.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div class="ml-5 flex-shrink-0 flex items-center space-x-2">
                          <A
                            href={`/chat/${session.id}`}
                            class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Open
                          </A>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>
      </div>
    </div>
  );
}
