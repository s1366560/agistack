/**
 * Custom Render Wrapper
 *
 * Enhanced render function with SolidJS providers and context
 */

import { render } from 'solid-js/web';
import { Router } from '@solidjs/router';
import type { JSXElement } from 'solid-js';

export interface RenderOptions {
  route?: string;
  wrapper?: (component: JSXElement) => JSXElement;
}

/**
 * Custom render function with Router and providers
 */
export function renderWithRouter(
  ui: JSXElement,
  options: RenderOptions = {}
) {
  const { route = '/', wrapper } = options;

  const wrappedUi = wrapper ? wrapper(ui) : ui;

  return {
    container: document.createElement('div'),
    ...render(() => (
      <Router base={route}>
        {wrappedUi}
      </Router>
    ), document.body.appendChild(document.createElement('div'))),
  };
}

/**
 * Custom render function without Router
 */
export function renderWithProviders(
  ui: JSXElement,
  options: RenderOptions = {}
) {
  const { wrapper } = options;

  const wrappedUi = wrapper ? wrapper(ui) : ui;

  return render(wrappedUi, document.body.appendChild(document.createElement('div')));
}
