import { describe, it, expect } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Router } from '@solidjs/router';
import ProjectDetail from './[id]';

describe('ProjectDetail Route', () => {
  it('should render project detail page', () => {
    const { container } = render(() => (
      <Router>
        <ProjectDetail />
      </Router>
    ));

    expect(container).toBeInTheDocument();
  });

  it('should display project ID', async () => {
    const { findByText } = render(() => (
      <Router route="/projects/test-id">
        <ProjectDetail />
      </Router>
    ));

    const heading = await findByText(/project: test-id/i);
    expect(heading).toBeInTheDocument();
  });

  it('should have back button', async () => {
    const { findByText } = render(() => (
      <Router>
        <ProjectDetail />
      </Router>
    ));

    const backButton = await findByText(/back to projects/i);
    expect(backButton).toBeInTheDocument();
  });
});
