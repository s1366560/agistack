import { describe, it, expect } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Router } from '@solidjs/router';
import NotFound from './404';

describe('404 Page', () => {
  it('should render 404 page', () => {
    const { container } = render(() => (
      <Router>
        <NotFound />
      </Router>
    ));

    expect(container).toBeInTheDocument();
  });

  it('should display 404 heading', async () => {
    const { findByText } = render(() => (
      <Router>
        <NotFound />
      </Router>
    ));

    const heading = await findByText(/404/i);
    expect(heading).toBeInTheDocument();
  });

  it('should have link to home', async () => {
    const { findByText } = render(() => (
      <Router>
        <NotFound />
      </Router>
    ));

    const link = await findByText(/go home/i);
    expect(link).toBeInTheDocument();
  });
});
