import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Router } from '@solidjs/router';
import { Home } from './index';

describe('Home Route', () => {
  beforeEach(() => {
    // Mock window.location for Router
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
      },
      writable: true,
    });
  });

  it('should render home page', () => {
    const { container } = render(() => (
      <Router>
        <Home />
      </Router>
    ));

    expect(container).toBeInTheDocument();
  });

  it('should display welcome message', async () => {
    const { findByText } = render(() => (
      <Router>
        <Home />
      </Router>
    ));

    const heading = await findByText(/welcome/i);
    expect(heading).toBeInTheDocument();
  });

  it('should have navigation links', async () => {
    const { findAllByText } = render(() => (
      <Router>
        <Home />
      </Router>
    ));

    const links = await findAllByText(/projects/i);
    expect(links.length).toBeGreaterThan(0);
  });
});
