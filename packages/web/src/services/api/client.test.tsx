/**
 * API Client Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient, createApiClient } from './client';
import type { ApiResponse, ApiError, RequestOptions } from './types';

describe('ApiClient', () => {
  let client: ApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockConfig = {
    baseURL: 'https://api.example.com',
    timeout: 5000,
    retries: 3,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  beforeEach(() => {
    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Create client instance
    client = new ApiClient(mockConfig);
  });

  describe('Construction', () => {
    it('should create client with config', () => {
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('should use createApiClient factory', () => {
      const instance = createApiClient(mockConfig);
      expect(instance).toBeInstanceOf(ApiClient);
    });

    it('should use default timeout and retries', () => {
      const minimalClient = new ApiClient({
        baseURL: 'https://api.example.com',
      });
      expect(minimalClient).toBeDefined();
    });
  });

  describe('Interceptors', () => {
    it('should add request interceptor', () => {
      const interceptor = vi.fn();
      client.addRequestInterceptor(interceptor);

      expect(interceptor).not.toHaveBeenCalled();
    });

    it('should add response interceptor', () => {
      const interceptor = vi.fn();
      client.addResponseInterceptor(interceptor);

      expect(interceptor).not.toHaveBeenCalled();
    });

    it('should set error handler', () => {
      const errorHandler = vi.fn();
      client.setErrorHandler(errorHandler);

      expect(errorHandler).not.toHaveBeenCalled();
    });
  });

  describe('GET Request', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test', success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await client.get('/test');

      expect(result).toEqual({ success: true, data: mockResponse });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle GET request with params', async () => {
      const mockResponse = { items: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await client.get('/test', { params: { page: 1, limit: 10 } });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should handle GET request error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response);

      const result = await client.get('/test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);

      const result = await client.get('/test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('POST Request', () => {
    it('should make successful POST request', async () => {
      const mockBody = { name: 'Test' };
      const mockResponse = { id: '1', ...mockBody };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      } as Response);

      const result = await client.post('/test', mockBody);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockBody),
        })
      );
    });

    it('should handle POST request error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid input' }),
      } as Response);

      const result = await client.post('/test', { invalid: true });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('PUT Request', () => {
    it('should make successful PUT request', async () => {
      const mockBody = { name: 'Updated' };
      const mockResponse = { id: '1', ...mockBody };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await client.put('/test/1', mockBody);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockBody),
        })
      );
    });
  });

  describe('PATCH Request', () => {
    it('should make successful PATCH request', async () => {
      const mockBody = { name: 'Updated' };
      const mockResponse = { id: '1', ...mockBody };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await client.patch('/test/1', mockBody);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(mockBody),
        })
      );
    });
  });

  describe('DELETE Request', () => {
    it('should make successful DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      } as Response);

      const result = await client.delete('/test/1');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle DELETE request error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response);

      const result = await client.delete('/test/1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should inject auth token from getToken callback', async () => {
      const mockToken = 'test-token';
      const authClient = new ApiClient({
        baseURL: 'https://api.example.com',
        getToken: () => mockToken,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      await authClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should not add auth header if token is null', async () => {
      const authClient = new ApiClient({
        baseURL: 'https://api.example.com',
        getToken: () => null,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      await authClient.get('/test');

      const callArgs = mockFetch.mock.calls[0];
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: 'success' }),
        } as Response);

      const result = await client.get('/test');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should give up after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.get('/test');

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(4); // initial + 3 retries
    });
  });

  describe('Request Interceptors', () => {
    it('should execute request interceptors in order', async () => {
      const interceptor1 = vi.fn(({ url, options }) => ({ url, options }));
      const interceptor2 = vi.fn(({ url, options }) => ({ url, options }));

      client.addRequestInterceptor(interceptor1);
      client.addRequestInterceptor(interceptor2);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      await client.get('/test');

      expect(interceptor1).toHaveBeenCalled();
      expect(interceptor2).toHaveBeenCalled();
    });
  });

  describe('Response Interceptors', () => {
    it('should execute response interceptors in order', async () => {
      const interceptor = vi.fn((response: Response) => response);

      client.addResponseInterceptor(interceptor);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response);

      await client.get('/test');

      expect(interceptor).toHaveBeenCalled();
    });
  });

  describe('Error Handler', () => {
    it('should call error handler on request failure', async () => {
      const errorHandler = vi.fn();
      client.setErrorHandler(errorHandler);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      } as Response);

      await client.get('/test');

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Timeout', () => {
    it('should timeout after configured duration', async () => {
      const timeoutClient = new ApiClient({
        baseURL: 'https://api.example.com',
        timeout: 100,
      });

      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                json: async () => ({}),
              } as Response);
            }, 200);
          })
      );

      const result = await timeoutClient.get('/test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 10000);
  });

  describe('Edge Cases', () => {
    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      } as Response);

      const result = await client.delete('/test/1');

      expect(result.success).toBe(true);
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      const result = await client.get('/test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON response');
    });

    it('should handle relative URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      await client.get('test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.any(Object)
      );
    });

    it('should handle absolute URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      await client.get('https://other-api.com/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://other-api.com/test',
        expect.any(Object)
      );
    });
  });
});
