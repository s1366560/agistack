/**
 * API test helpers
 * Provides utilities for testing Hono API endpoints
 */

import { api } from '../../src/index'

export type ApiRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: string
}

export async function testApiRequest(
  path: string,
  options: ApiRequest = {}
): Promise<Response> {
  const { method = 'GET', headers = {}, body } = options

  return api.request(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  })
}

export function expectSuccess(response: Response) {
  expect(response.status).toBeGreaterThanOrEqual(200)
  expect(response.status).toBeLessThan(300)
}

export function expectError(response: Response, status: number = 400) {
  expect(response.status).toBe(status)
}

export async function expectJson(response: Response) {
  const contentType = response.headers.get('content-type')
  expect(contentType).toMatch(/application\/json/)
  return response.json()
}
