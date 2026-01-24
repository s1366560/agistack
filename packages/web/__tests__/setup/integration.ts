/**
 * Integration Test Setup
 *
 * Global setup for integration tests
 */

import { vi } from 'vitest'
import { Component, JSX } from 'solid-js'

// Mock SolidJS router (lighter version for integration tests)
vi.mock('@solidjs/router', () => ({
  A: (props: JSX.HTMLAttributes<HTMLAnchorElement> & { href: string }) => {
    const a = document.createElement('a')
    a.setAttribute('href', props.href || '')
    a.setAttribute('data-testid', props['data-testid'] || '')
    if (props['data-active']) {
      a.setAttribute('data-active', String(props['data-active']))
    }
    if (props.children) {
      a.textContent = String(props.children)
    }
    return a as any
  },
  Router: (props: { children: JSX.Element }) => props.children,
  Routes: (props: { children: JSX.Element }) => props.children,
  Route: (props: { path?: string; component: Component }) => null,
  useParams: () => ({}),
  useSearchParams: () => [() => ({}), () => {}],
  useNavigate: () => () => {},
}))

// Setup MSW for integration tests
import { setupMockServer } from '../fixtures/mocks/server'

setupMockServer()

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks()
})
