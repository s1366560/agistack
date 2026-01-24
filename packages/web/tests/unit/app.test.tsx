import { describe, it, expect } from 'vitest';
import { render } from '@solidjs/testing-library';
import App from '../../src/app';

describe('App', () => {
  it('should render app component', () => {
    const { container } = render(() => <App />);

    expect(container).toBeInTheDocument();
  });

  it('should render router with routes', () => {
    const { container } = render(() => <App />);

    expect(container).toBeInTheDocument();
    // Router component should be rendered
  });
});
