import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Router } from '@solidjs/router';
import { ProjectList } from './index';

describe('ProjectList Route', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/projects' },
      writable: true,
    });
  });

  it('should render projects page', () => {
    const { container } = render(() => (
      <Router>
        <ProjectList />
      </Router>
    ));

    expect(container).toBeInTheDocument();
  });

  it('should display page heading', async () => {
    const { findByText } = render(() => (
      <Router>
        <ProjectList />
      </Router>
    ));

    const heading = await findByText(/projects/i);
    expect(heading).toBeInTheDocument();
  });

  it('should have create project button', async () => {
    const { findByText } = render(() => (
      <Router>
        <ProjectList />
      </Router>
    ));

    const button = await findByText(/create project/i);
    expect(button).toBeInTheDocument();
  });
});
