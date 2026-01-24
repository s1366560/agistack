import { Component, For, Show } from 'solid-js';
import { A } from '@solidjs/router';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface HeaderProps {
  breadcrumbs?: Breadcrumb[];
  userName?: string;
  userAvatarUrl?: string;
  onSearch?: (query: string) => void;
  onThemeToggle?: () => void;
  isDarkMode?: boolean;
}

export interface HeaderTestIds {
  root: string;
  breadcrumbs: string;
  search: string;
  themeToggle: string;
  userMenu: string;
}

export const testIds: HeaderTestIds = {
  root: 'header',
  breadcrumbs: 'header-breadcrumbs',
  search: 'header-search',
  themeToggle: 'header-theme-toggle',
  userMenu: 'header-user-menu',
};

/**
 * Header Component
 *
 * Application header with breadcrumbs, search, theme toggle, and user menu.
 */
export const Header: Component<HeaderProps> = (props) => {
  const breadcrumbs = () => props.breadcrumbs || [];
  const isDarkMode = () => props.isDarkMode || false;

  const handleSearchInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (props.onSearch) {
      props.onSearch(target.value);
    }
  };

  const handleThemeToggle = () => {
    if (props.onThemeToggle) {
      props.onThemeToggle();
    }
  };

  return (
    <header
      data-testid={testIds.root}
      role="banner"
      class="header"
    >
      {/* Breadcrumbs */}
      <nav
        data-testid={testIds.breadcrumbs}
        role="navigation"
        aria-label="Breadcrumb navigation"
        class="breadcrumbs"
      >
        <For each={breadcrumbs()}>
          {(breadcrumb, index) => (
            <span data-testid={`breadcrumb-${breadcrumb.label}`}>
              <Show
                when={breadcrumb.href}
                fallback={
                  <span class="breadcrumb-current">{breadcrumb.label}</span>
                }
              >
                <A href={breadcrumb.href!} class="breadcrumb-link">
                  {breadcrumb.label}
                </A>
              </Show>
              <Show when={index() < breadcrumbs().length - 1}>
                <span class="breadcrumb-separator">/</span>
              </Show>
            </span>
          )}
        </For>
      </nav>

      {/* Search */}
      <Show when={props.onSearch}>
        <input
          data-testid={testIds.search}
          type="search"
          placeholder="Search..."
          onInput={handleSearchInput}
          class="search-input"
          aria-label="Search"
        />
      </Show>

      {/* Actions */}
      <div class="header-actions">
        {/* Theme Toggle */}
        <Show when={props.onThemeToggle}>
          <button
            data-testid={testIds.themeToggle}
            onClick={handleThemeToggle}
            aria-label={`Switch to ${isDarkMode() ? 'light' : 'dark'} mode`}
            class="theme-toggle"
          >
            {isDarkMode() ? '☀️' : '🌙'}
          </button>
        </Show>

        {/* User Menu */}
        <Show when={props.userName}>
          <div
            data-testid={testIds.userMenu}
            class="user-menu"
          >
            <Show when={props.userAvatarUrl}>
              <img
                src={props.userAvatarUrl}
                alt={`${props.userName} avatar`}
                class="user-avatar"
              />
            </Show>
            <span class="user-name">{props.userName}</span>
          </div>
        </Show>
      </div>
    </header>
  );
};

export default Header;
