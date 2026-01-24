import { describe, it, expect, vi } from 'vitest';
import { render } from 'solid-js/web';
import { createContext, useContext } from 'solid-js';

const TestContext = createContext<string | undefined>(undefined);

function TestProvider(props: { children: any, value: string }) {
  return <TestContext.Provider value={props.value}>{props.children}</TestContext.Provider>;
}

function TestConsumer() {
  const value = useContext(TestContext);
  return <div data-testid="value">{value || 'no-value'}</div>;
}

describe('SolidJS Context - Minimal', () => {
  it('works with direct implementation', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(() => (
      <TestProvider value="test-value">
        <TestConsumer />
      </TestProvider>
    ), container);

    const el = container.querySelector('[data-testid="value"]');
    expect(el?.textContent).toBe('test-value');

    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });
});
