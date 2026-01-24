import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'solid-js/web';
import { Home } from './index';

// Mock the @solidjs/router module
vi.mock('@solidjs/router', () => ({
  A: (props: any) => <a href={props.href}>{props.children}</a>,
  Router: (props: any) => props.children,
}));

describe('Home Route', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should render home page structure', () => {
    render(() => <Home />, container);
    expect(container.querySelector('h1')).toBeDefined();
  });

  it('should display welcome message', () => {
    render(() => <Home />, container);
    const heading = container.querySelector('h1');
    expect(heading?.textContent).toContain('Welcome to AgiStack');
  });

  it('should have navigation cards', () => {
    render(() => <Home />, container);
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(3);
  });

  it('should display page description', () => {
    render(() => <Home />, container);
    const description = container.querySelector('p');
    expect(description?.textContent).toContain('AI-powered programming assistant');
  });

  it('should have Projects link', () => {
    render(() => <Home />, container);
    const projectsLink = Array.from(container.querySelectorAll('a')).find(
      (link) => link.getAttribute('href') === '/projects'
    );
    expect(projectsLink).toBeDefined();
  });

  it('should have Sessions link', () => {
    render(() => <Home />, container);
    const sessionsLink = Array.from(container.querySelectorAll('a')).find(
      (link) => link.getAttribute('href') === '/sessions'
    );
    expect(sessionsLink).toBeDefined();
  });

  it('should have Settings link', () => {
    render(() => <Home />, container);
    const settingsLink = Array.from(container.querySelectorAll('a')).find(
      (link) => link.getAttribute('href') === '/settings'
    );
    expect(settingsLink).toBeDefined();
  });

  it('should display Projects card with correct text', () => {
    render(() => <Home />, container);
    const projectsLink = Array.from(container.querySelectorAll('a')).find(
      (link) => link.getAttribute('href') === '/projects'
    );
    expect(projectsLink?.textContent).toContain('Projects');
  });

  it('should display Sessions card with correct text', () => {
    render(() => <Home />, container);
    const sessionsLink = Array.from(container.querySelectorAll('a')).find(
      (link) => link.getAttribute('href') === '/sessions'
    );
    expect(sessionsLink?.textContent).toContain('Sessions');
  });

  it('should display Settings card with correct text', () => {
    render(() => <Home />, container);
    const settingsLink = Array.from(container.querySelectorAll('a')).find(
      (link) => link.getAttribute('href') === '/settings'
    );
    expect(settingsLink?.textContent).toContain('Settings');
  });
});
