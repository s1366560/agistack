/**
 * ErrorBoundary Component Tests
 *
 * TDD: Tests written first (RED phase)
 * Run tests before implementation to verify they fail
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { ErrorBoundary } from './ErrorBoundary';

// Helper component that throws an error
const ThrowError = () => {
  throw new Error('Test error');
};

// Helper component that throws different error types
const ThrowSpecificError = (props: {
  errorType?: 'network' | 'timeout' | 'unauthorized' | 'notfound';
}) => {
  const errors = {
    network: new Error('Network request failed'),
    timeout: new Error('Request timeout'),
    unauthorized: new Error('Unauthorized access'),
    notfound: new Error('Resource not found'),
  };

  throw errors[props.errorType || 'network'];
};

describe('ErrorBoundary', () => {
  let testContainer: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    testContainer = document.createElement('div');
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    document.body.removeChild(testContainer);
  });

  describe('Basic Error Capture', () => {
    it('should render children when there is no error', () => {
      render(() => (
        <ErrorBoundary
          fallback={() => <div>Something went wrong</div>}
        >
          <div>Normal content</div>
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Normal content');
      expect(testContainer.textContent).not.toContain('Something went wrong');
    });

    it('should catch errors and render fallback UI', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={() => <div>Something went wrong</div>}
        >
          <ThrowError />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Something went wrong');

      consoleErrorSpy.mockRestore();
    });

    it('should render custom error message in fallback', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={(error: Error) => (
            <div>Error: {error.message}</div>
          )}
        >
          <ThrowError />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Error: Test error');

      consoleErrorSpy.mockRestore();
    });

    it('should call onError callback when error is caught', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const onError = vi.fn();

      render(() => (
        <ErrorBoundary
          fallback={() => <div>Error</div>}
          onError={onError}
        >
          <ThrowError />
        </ErrorBoundary>
      ), testContainer);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Type Detection', () => {
    it('should detect network errors', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={(error: Error) => (
            <div>
              <div>Type: Network</div>
              <div>Message: {error.message}</div>
            </div>
          )}
        >
          <ThrowSpecificError errorType="network" />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Network request failed');

      consoleErrorSpy.mockRestore();
    });

    it('should detect timeout errors', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={(error: Error) => (
            <div>
              <div>Type: Timeout</div>
              <div>Message: {error.message}</div>
            </div>
          )}
        >
          <ThrowSpecificError errorType="timeout" />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Request timeout');

      consoleErrorSpy.mockRestore();
    });

    it('should detect unauthorized errors', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={(error: Error) => (
            <div>
              <div>Type: Unauthorized</div>
              <div>Message: {error.message}</div>
            </div>
          )}
        >
          <ThrowSpecificError errorType="unauthorized" />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Unauthorized access');

      consoleErrorSpy.mockRestore();
    });

    it('should detect not found errors', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={(error: Error) => (
            <div>
              <div>Type: NotFound</div>
              <div>Message: {error.message}</div>
            </div>
          )}
        >
          <ThrowSpecificError errorType="notfound" />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Resource not found');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('User-Friendly Error Messages', () => {
    it('should display helpful message for network errors', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={(error: Error) => {
            const isNetworkError = error.message.includes('Network');

            return (
              <div>
                {isNetworkError ? (
                  <div>
                    <h2>Connection Error</h2>
                    <p>Please check your internet connection and try again.</p>
                  </div>
                ) : (
                  <div>Generic error</div>
                )}
              </div>
            );
          }}
        >
          <ThrowSpecificError errorType="network" />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Connection Error');
      expect(testContainer.textContent).toContain('check your internet connection');

      consoleErrorSpy.mockRestore();
    });

    it('should display helpful message for timeout errors', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={(error: Error) => {
            const isTimeoutError = error.message.includes('timeout');

            return (
              <div>
                {isTimeoutError ? (
                  <div>
                    <h2>Request Timeout</h2>
                    <p>The request took too long. Please try again.</p>
                  </div>
                ) : (
                  <div>Generic error</div>
                )}
              </div>
            );
          }}
        >
          <ThrowSpecificError errorType="timeout" />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Request Timeout');
      expect(testContainer.textContent).toContain('took too long');

      consoleErrorSpy.mockRestore();
    });

    it('should display helpful message for unauthorized errors', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={(error: Error) => {
            const isUnauthorizedError = error.message.includes('Unauthorized');

            return (
              <div>
                {isUnauthorizedError ? (
                  <div>
                    <h2>Authentication Required</h2>
                    <p>Please login to access this resource.</p>
                    <a href="/login">Go to Login</a>
                  </div>
                ) : (
                  <div>Generic error</div>
                )}
              </div>
            );
          }}
        >
          <ThrowSpecificError errorType="unauthorized" />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Authentication Required');
      expect(testContainer.textContent).toContain('login to access');
      expect(testContainer.textContent).toContain('Go to Login');

      consoleErrorSpy.mockRestore();
    });

    it('should display helpful message for not found errors', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={(error: Error) => {
            const isNotFoundError = error.message.includes('not found');

            return (
              <div>
                {isNotFoundError ? (
                  <div>
                    <h2>Page Not Found</h2>
                    <p>The resource you are looking for does not exist.</p>
                    <a href="/">Go to Home</a>
                  </div>
                ) : (
                  <div>Generic error</div>
                )}
              </div>
            );
          }}
        >
          <ThrowSpecificError errorType="notfound" />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Page Not Found');
      expect(testContainer.textContent).toContain('does not exist');
      expect(testContainer.textContent).toContain('Go to Home');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should render error messages with proper ARIA attributes', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(() => (
        <ErrorBoundary
          fallback={(error: Error) => (
            <div role="alert" aria-live="assertive">
              <h2>Error occurred</h2>
              <p>{error.message}</p>
            </div>
          )}
        >
          <ThrowError />
        </ErrorBoundary>
      ), testContainer);

      const alert = testContainer.querySelector('[role="alert"]');
      expect(alert).toBeTruthy();
      expect(alert?.getAttribute('aria-live')).toBe('assertive');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors in nested components', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const NestedComponent = () => (
        <div>
          <ThrowError />
        </div>
      );

      render(() => (
        <ErrorBoundary
          fallback={() => <div>Nested error caught</div>}
        >
          <NestedComponent />
        </ErrorBoundary>
      ), testContainer);

      expect(testContainer.textContent).toContain('Nested error caught');

      consoleErrorSpy.mockRestore();
    });
  });
});
