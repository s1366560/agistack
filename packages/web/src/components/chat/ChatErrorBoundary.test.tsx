/**
 * Chat Error Boundary Tests
 *
 * TDD: Tests written first (RED phase)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import {
  SessionNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  StreamInterruptedError,
} from '../../services/api/errors';

// Mock window.location
const mockLocation = {
  reload: vi.fn(),
  href: '',
  assign: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock window.history
const mockHistory = {
  back: vi.fn(),
};
Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
});

describe('ChatErrorBoundary', () => {
  let testContainer: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    testContainer = document.createElement('div');
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    document.body.removeChild(testContainer);
  });

  describe('Normal Rendering', () => {
    it('should render children when there is no error', () => {
      render(
        () => (
          <ChatErrorBoundary>
            <div data-testid="normal-content">Normal content</div>
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Normal content');
    });
  });

  describe('Error Display', () => {
    it('should display session not found error', () => {
      const ThrowError = () => {
        throw new SessionNotFoundError('session_123');
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Session Not Found');
      expect(testContainer.textContent).toContain('does not exist or has been deleted');
      expect(testContainer.textContent).toContain('🔍');
    });

    it('should display unauthorized error', () => {
      const ThrowError = () => {
        throw new UnauthorizedError();
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Unauthorized');
      expect(testContainer.textContent).toContain('need to login');
      expect(testContainer.textContent).toContain('🔒');
    });

    it('should display forbidden error', () => {
      const ThrowError = () => {
        throw new ForbiddenError();
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Access Forbidden');
      expect(testContainer.textContent).toContain('do not have permission');
      expect(testContainer.textContent).toContain('🚫');
    });

    it('should display rate limit error', () => {
      const ThrowError = () => {
        throw new RateLimitError();
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Rate Limit Exceeded');
      expect(testContainer.textContent).toContain('too many messages');
      expect(testContainer.textContent).toContain('⏱️');
    });

    it('should display network error', () => {
      const ThrowError = () => {
        throw new NetworkError();
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Network Error');
      expect(testContainer.textContent).toContain('check your internet connection');
      expect(testContainer.textContent).toContain('📡');
    });

    it('should display timeout error', () => {
      const ThrowError = () => {
        throw new TimeoutError(5000);
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Request Timeout');
      expect(testContainer.textContent).toContain('⏰');
    });

    it('should display stream interrupted error', () => {
      const ThrowError = () => {
        throw new StreamInterruptedError('Stream interrupted');
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Connection Interrupted');
      expect(testContainer.textContent).toContain('⚠️');
    });

    it('should display generic error for unknown errors', () => {
      const ThrowError = () => {
        throw new Error('Unknown error');
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Something Went Wrong');
      expect(testContainer.textContent).toContain('❌');
    });

    it('should show error stack trace when available', () => {
      const ThrowError = () => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at TestComponent';
        throw error;
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Something Went Wrong');
      expect(testContainer.textContent).toContain('Test error');
      expect(testContainer.textContent).toContain('Technical Details');
      expect(testContainer.textContent).toContain('TestComponent');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Actions', () => {
    it('should show retry button for retryable errors', () => {
      const ThrowError = () => {
        throw new NetworkError();
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      const retryButton = testContainer.querySelector('button');
      expect(retryButton).toBeTruthy();
      expect(retryButton?.textContent).toContain('Try Again');

      retryButton?.click();
      expect(mockLocation.reload).toHaveBeenCalledTimes(1);
    });

    it('should show go back button for unauthorized errors', () => {
      const ThrowError = () => {
        throw new UnauthorizedError();
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      const goBackButton = testContainer.querySelector('button');
      expect(goBackButton).toBeTruthy();
      expect(goBackButton?.textContent).toContain('Go Back');

      goBackButton?.click();
      expect(mockHistory.back).toHaveBeenCalledTimes(1);
    });

    it('should show go to sessions button for session not found', () => {
      const ThrowError = () => {
        throw new SessionNotFoundError('session_123');
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      const buttons = Array.from(testContainer.querySelectorAll('button'));
      const goToSessionsButton = buttons.find(btn => btn.textContent?.includes('Go to Sessions'));
      expect(goToSessionsButton).toBeTruthy();
    });

    it('should show both retry and go back for rate limit errors', () => {
      const ThrowError = () => {
        throw new RateLimitError();
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      const buttons = Array.from(testContainer.querySelectorAll('button'));
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      const hasRetry = buttons.some(btn => btn.textContent?.includes('Try Again'));
      const hasGoBack = buttons.some(btn => btn.textContent?.includes('Go Back'));

      expect(hasRetry).toBe(true);
      expect(hasGoBack).toBe(true);
    });
  });

  describe('Error Callback', () => {
    it('should call onError callback when error is caught', () => {
      const onError = vi.fn();
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        () => (
          <ChatErrorBoundary onError={onError}>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should pass error details to callback', () => {
      const onError = vi.fn();
      const testError = new SessionNotFoundError('test_id');
      const ThrowError = () => {
        throw testError;
      };

      render(
        () => (
          <ChatErrorBoundary onError={onError}>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(onError).toHaveBeenCalledWith(testError, expect.any(Object));
    });
  });

  describe('Error Recovery', () => {
    it('should reload page when retry is clicked', () => {
      const ThrowError = () => {
        throw new NetworkError();
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      const retryButton = Array.from(testContainer.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Try Again'));

      retryButton?.click();

      expect(mockLocation.reload).toHaveBeenCalled();
    });

    it('should go back when back button is clicked', () => {
      const ThrowError = () => {
        throw new UnauthorizedError();
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      const backButton = Array.from(testContainer.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Go Back'));

      backButton?.click();

      expect(mockHistory.back).toHaveBeenCalled();
    });

    it('should navigate to sessions when sessions button is clicked', () => {
      const ThrowError = () => {
        throw new SessionNotFoundError('session_123');
      };

      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      const sessionsButton = Array.from(testContainer.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Go to Sessions'));

      sessionsButton?.click();

      expect(mockLocation.href).toBe('/chat');
    });
  });

  describe('Multiple Errors', () => {
    it('should handle multiple errors correctly', () => {
      const ThrowError1 = () => {
        throw new NetworkError();
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // First error
      render(
        () => (
          <ChatErrorBoundary>
            <ThrowError1 />
          </ChatErrorBoundary>
        ),
        testContainer
      );

      expect(testContainer.textContent).toContain('Network Error');

      // Clear and render normal content
      while (testContainer.firstChild) {
        testContainer.removeChild(testContainer.firstChild);
      }

      render(
        () => (
          <ChatErrorBoundary>
            <div data-testid="normal">Normal after error</div>
          </ChatErrorBoundary>
        ),
        testContainer
      );

      // Should render normally
      expect(testContainer.textContent).toContain('Normal after error');

      consoleErrorSpy.mockRestore();
    });
  });
});
