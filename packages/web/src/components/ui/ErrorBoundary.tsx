/**
 * ErrorBoundary Component
 *
 * TDD: Implementation written after tests (GREEN phase)
 * Wraps SolidJS's built-in ErrorBoundary with enhanced features
 */

import { ErrorBoundary as SolidErrorBoundary, type JSX } from 'solid-js';

export interface ErrorBoundaryProps {
  /**
   * Fallback UI to render when an error occurs
   * Can be a component or a function that receives the error
   */
  fallback:
    | JSX.Element
    | ((error: Error, reset: () => void) => JSX.Element);

  /**
   * Optional callback called when an error is caught
   */
  onError?: (error: Error, errorInfo: unknown) => void;

  /**
   * Optional callback called when attempting to reset
   */
  onReset?: () => void;

  /**
   * Child components to render
   */
  children: JSX.Element;
}

/**
 * Error Boundary Component
 *
 * Wraps SolidJS's built-in ErrorBoundary with enhanced error handling
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={(error) => <div>Error: {error.message}</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundary(props: ErrorBoundaryProps): JSX.Element {
  return (
    <SolidErrorBoundary
      fallback={(error, reset) => {
        // Call error callback
        props.onError?.(error, {
          componentStack: '', // Stack not available in SolidJS
        });

        // Render fallback
        if (typeof props.fallback === 'function') {
          const handleReset = () => {
            reset();
            props.onReset?.();
          };
          return props.fallback(error, handleReset);
        }
        return props.fallback;
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}

/**
 * Default fallback component for common error types
 */
export function DefaultErrorFallback(props: {
  error: Error;
  reset: () => void;
}): JSX.Element {
  const errorMessage = props.error.message.toLowerCase();

  // Detect error type
  const isNetworkError = errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('cors');

  const isTimeoutError = errorMessage.includes('timeout');

  const isUnauthorizedError = errorMessage.includes('unauthorized') ||
    errorMessage.includes('401');

  const isNotFoundError = errorMessage.includes('not found') ||
    errorMessage.includes('404');

  // Render appropriate message
  if (isNetworkError) {
    return (
      <div role="alert" aria-live="assertive" class="error-boundary">
        <h2>Connection Error</h2>
        <p>Please check your internet connection and try again.</p>
        <div class="error-actions">
          <button onClick={props.reset}>Retry</button>
          <a href="/">Go Home</a>
        </div>
      </div>
    );
  }

  if (isTimeoutError) {
    return (
      <div role="alert" aria-live="assertive" class="error-boundary">
        <h2>Request Timeout</h2>
        <p>The request took too long. Please try again.</p>
        <div class="error-actions">
          <button onClick={props.reset}>Refresh</button>
          <a href="/">Go Home</a>
        </div>
      </div>
    );
  }

  if (isUnauthorizedError) {
    return (
      <div role="alert" aria-live="assertive" class="error-boundary">
        <h2>Authentication Required</h2>
        <p>Please login to access this resource.</p>
        <div class="error-actions">
          <a href="/login">Go to Login</a>
        </div>
      </div>
    );
  }

  if (isNotFoundError) {
    return (
      <div role="alert" aria-live="assertive" class="error-boundary">
        <h2>Page Not Found</h2>
        <p>The resource you are looking for does not exist.</p>
        <div class="error-actions">
          <a href="/">Go to Home</a>
        </div>
      </div>
    );
  }

  // Generic error
  return (
    <div role="alert" aria-live="assertive" class="error-boundary">
      <h2>Something went wrong</h2>
      <p>{props.error.message}</p>
      <div class="error-actions">
        <button onClick={props.reset}>Try Again</button>
        <a href="/">Go Home</a>
      </div>
    </div>
  );
}

/**
 * Hook to programmatically trigger error boundary
 */
export function useErrorBoundary(): {
  triggerError: (error: Error) => void;
  reset: () => void;
} {
  const triggerError = (error: Error) => {
    throw error;
  };

  const reset = () => {
    // This will be handled by the ErrorBoundary component
    window.location.reload();
  };

  return { triggerError, reset };
}
