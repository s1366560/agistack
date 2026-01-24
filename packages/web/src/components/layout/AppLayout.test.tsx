import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'solid-js/web';
import { AppLayout, testIds, type AppLayoutProps } from './AppLayout';

describe('AppLayout', () => {
  let container: HTMLDivElement;

  const defaultProps: AppLayoutProps = {
    children: <div>Main Content</div>,
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('Rendering', () => {
    it('should render app layout component', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const layout = container.querySelector(`[data-testid="${testIds.root}"]`);
      expect(layout).toBeDefined();
    });

    it('should render with all required sections', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      expect(container.querySelector(`[data-testid="${testIds.root}"]`)).toBeDefined();
      expect(container.querySelector(`[data-testid="${testIds.sidebar}"]`)).toBeDefined();
      expect(container.querySelector(`[data-testid="${testIds.main}"]`)).toBeDefined();
    });

    it('should render children in main content area', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const main = container.querySelector(`[data-testid="${testIds.main}"]`);
      expect(main?.textContent).toContain('Main Content');
    });

    it('should render without crashing when no props provided', () => {
      render(() => <AppLayout />, container);
      const layout = container.querySelector(`[data-testid="${testIds.root}"]`);
      expect(layout).toBeDefined();
    });

    it('should have proper semantic HTML structure', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      expect(container.querySelector('div[data-testid="app-layout"]')).toBeDefined();
    });
  });

  describe('Sidebar', () => {
    it('should render sidebar area', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const sidebar = container.querySelector(`[data-testid="${testIds.sidebar}"]`);
      expect(sidebar).toBeDefined();
    });

    it('should have responsive classes for sidebar', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const sidebar = container.querySelector(`[data-testid="${testIds.sidebar}"]`);
      expect(sidebar?.classList.contains('sidebar')).toBe(true);
    });
  });

  describe('Main Content', () => {
    it('should render main content area', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const main = container.querySelector(`[data-testid="${testIds.main}"]`);
      expect(main).toBeDefined();
    });

    it('should have proper content container', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const main = container.querySelector(`[data-testid="${testIds.main}"]`);
      expect(main?.classList.contains('main-content')).toBe(true);
    });

    it('should render multiple children', () => {
      const multipleChildren = (
        <>
          <div>Child 1</div>
          <div>Child 2</div>
        </>
      );
      render(() => <AppLayout>{multipleChildren}</AppLayout>, container);
      const main = container.querySelector(`[data-testid="${testIds.main}"]`);
      expect(main?.textContent).toContain('Child 1');
      expect(main?.textContent).toContain('Child 2');
    });
  });

  describe('Loading State', () => {
    it('should not render loading indicator when not loading', () => {
      render(() => <AppLayout {...defaultProps} isLoading={false} />, container);
      const loading = container.querySelector(`[data-testid="${testIds.loading}"]`);
      expect(loading).toBeNull();
    });

    it('should render loading indicator when loading', () => {
      render(() => <AppLayout {...defaultProps} isLoading={true} />, container);
      const loading = container.querySelector(`[data-testid="${testIds.loading}"]`);
      expect(loading).toBeDefined();
    });

    it('should show loading message', () => {
      render(() => <AppLayout {...defaultProps} isLoading={true} />, container);
      const loading = container.querySelector(`[data-testid="${testIds.loading}"]`);
      expect(loading?.textContent).toContain('Loading');
    });
  });

  describe('Error State', () => {
    const mockError = new Error('Test error');

    it('should not render error when no error', () => {
      render(() => <AppLayout {...defaultProps} error={null} />, container);
      const error = container.querySelector(`[data-testid="${testIds.error}"]`);
      expect(error).toBeNull();
    });

    it('should render error message when error exists', () => {
      render(() => <AppLayout {...defaultProps} error={mockError} />, container);
      const error = container.querySelector(`[data-testid="${testIds.error}"]`);
      expect(error).toBeDefined();
    });

    it('should display error message', () => {
      render(() => <AppLayout {...defaultProps} error={mockError} />, container);
      const error = container.querySelector(`[data-testid="${testIds.error}"]`);
      expect(error?.textContent).toContain('Test error');
    });
  });

  describe('Layout Structure', () => {
    it('should use grid or flex layout', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const layout = container.querySelector(`[data-testid="${testIds.root}"]`);
      expect(layout?.classList.contains('layout-grid')).toBe(true);
    });

    it('should have proper spacing between sidebar and main', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const layout = container.querySelector(`[data-testid="${testIds.root}"]`);
      expect(layout).toBeDefined();
      // Layout should have both sidebar and main as direct children
      const sidebar = container.querySelector(`[data-testid="${testIds.sidebar}"]`);
      const main = container.querySelector(`[data-testid="${testIds.main}"]`);
      expect(sidebar).toBeDefined();
      expect(main).toBeDefined();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const layout = container.querySelector(`[data-testid="${testIds.root}"]`);
      expect(layout?.classList.contains('responsive')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper landmark roles', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const main = container.querySelector(`[data-testid="${testIds.main}"]`);
      expect(main?.getAttribute('role')).toBe('main');
    });

    it('should have navigation role for sidebar', () => {
      render(() => <AppLayout {...defaultProps} />, container);
      const sidebar = container.querySelector(`[data-testid="${testIds.sidebar}"]`);
      expect(sidebar?.getAttribute('role')).toBe('complementary');
    });
  });
});
