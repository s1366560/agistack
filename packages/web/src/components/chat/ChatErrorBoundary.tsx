/**
 * Chat Error Boundary Component
 *
 * Catches and handles errors in chat components
 * Provides user-friendly error display with recovery options
 */

import { ErrorBoundary as SolidErrorBoundary, type JSX } from 'solid-js';
import {
  SessionNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  StreamInterruptedError,
} from '../../services/api/errors';

export interface ChatErrorBoundaryProps {
  children: JSX.Element;
  fallback?: JSX.Element;
  onError?: (error: Error, errorInfo: unknown) => void;
}

/**
 * Chat Error Boundary
 *
 * Catches errors in child components and displays appropriate error messages
 * based on error type with recovery options
 */
export function ChatErrorBoundary(props: ChatErrorBoundaryProps): JSX.Element {
  return (
    <SolidErrorBoundary
      fallback={(error, reset) => {
        // Call error callback
        props.onError?.(error, {
          componentStack: '',
        });

        // Render error handler
        return (
          <ErrorHandler
            error={error}
            onReset={reset}
          />
        );
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}

interface ErrorHandlerProps {
  error: Error;
  onReset: () => void;
}

/**
 * Error Handler Component
 *
 * Displays appropriate error message and actions based on error type
 */
function ErrorHandler(props: ErrorHandlerProps) {
  const getErrorConfig = () => {
    const { error } = props;

    if (error instanceof SessionNotFoundError) {
      return {
        title: 'Session Not Found',
        message:
          'The chat session you are looking for does not exist or has been deleted.',
        icon: '🔍',
        actions: ['goToSessions', 'goBack'] as const,
      };
    }

    if (error instanceof UnauthorizedError) {
      return {
        title: 'Unauthorized',
        message: 'You need to login to access this chat session.',
        icon: '🔒',
        actions: ['goBack'] as const,
      };
    }

    if (error instanceof ForbiddenError) {
      return {
        title: 'Access Forbidden',
        message: 'You do not have permission to access this chat session.',
        icon: '🚫',
        actions: ['goBack'] as const,
      };
    }

    if (error instanceof RateLimitError) {
      return {
        title: 'Rate Limit Exceeded',
        message:
          'You have sent too many messages. Please wait a moment and try again.',
        icon: '⏱️',
        actions: ['retry', 'goBack'] as const,
      };
    }

    if (error instanceof TimeoutError) {
      return {
        title: 'Request Timeout',
        message:
          'The request took too long to respond. Please check your connection and try again.',
        icon: '⏰',
        actions: ['retry', 'goBack'] as const,
      };
    }

    if (error instanceof StreamInterruptedError) {
      return {
        title: 'Connection Interrupted',
        message:
          'The message stream was interrupted. Some content may not have loaded.',
        icon: '⚠️',
        actions: ['retry', 'goBack'] as const,
      };
    }

    if (error instanceof NetworkError) {
      return {
        title: 'Network Error',
        message:
          'Unable to connect to the server. Please check your internet connection.',
        icon: '📡',
        actions: ['retry', 'goBack'] as const,
      };
    }

    // Generic error
    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
      icon: '❌',
      actions: ['retry', 'goBack'] as const,
    };
  };

  const config = getErrorConfig();

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoToSessions = () => {
    window.location.href = '/chat';
  };

  return (
    <div class="flex min-h-[400px] items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {/* Error Icon */}
        <div class="text-center mb-4">
          <span class="text-6xl">{config.icon}</span>
        </div>

        {/* Error Title */}
        <h2 class="text-xl font-semibold text-gray-900 text-center mb-2">
          {config.title}
        </h2>

        {/* Error Message */}
        <p class="text-gray-600 text-center mb-6">{config.message}</p>

        {/* Error Details (dev only) */}
        {import.meta.env.DEV && (
          <details class="mb-6">
            <summary class="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Technical Details
            </summary>
            <pre class="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
              {props.error.stack || props.error.message}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          {config.actions.includes('retry') && (
            <button
              onClick={handleRetry}
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Again
            </button>
          )}

          {config.actions.includes('goToSessions') && (
            <button
              onClick={handleGoToSessions}
              class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Go to Sessions
            </button>
          )}

          {config.actions.includes('goBack') && (
            <button
              onClick={handleGoBack}
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatErrorBoundary;
