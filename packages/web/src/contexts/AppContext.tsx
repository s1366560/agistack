/**
 * AppContext Provider
 *
 * Global application context for managing:
 * - Theme (light/dark mode)
 * - Language preferences
 * - Global loading states
 * - Toast notifications
 * - Modal/dialog state
 */

import {
  createContext,
  useContext,
  JSX,
  createSignal,
  createEffect,
} from 'solid-js'
import type {
  AppContextValue,
  AppProviderProps,
  ThemeMode,
  Language,
  Toast,
  ToastType,
  ModalContent,
} from './AppContext.types'

// LocalStorage keys
const THEME_STORAGE_KEY = 'agistack-theme'
const LANGUAGE_STORAGE_KEY = 'agistack-language'

// Supported values for validation
const SUPPORTED_THEMES: ThemeMode[] = ['light', 'dark']
const SUPPORTED_LANGUAGES: Language[] = ['en', 'zh', 'es', 'fr', 'de', 'ja']

/**
 * Create the AppContext
 */
const AppContext = createContext<AppContextValue>()

/**
 * Helper to get initial theme from localStorage
 */
function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && SUPPORTED_THEMES.includes(stored as ThemeMode)) {
      return stored as ThemeMode
    }
  } catch {
    // Ignore localStorage errors
  }

  return 'light'
}

/**
 * Helper to get initial language from localStorage
 */
function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en'

  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language
    }
  } catch {
    // Ignore localStorage errors
  }

  return 'en'
}

/**
 * Helper to generate unique toast ID
 */
function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * AppContext Provider Component
 */
export function AppProvider(props: AppProviderProps): JSX.Element {
  // Theme state
  const [theme, setThemeState] = createSignal<ThemeMode>(getInitialTheme())

  // Language state
  const [language, setLanguageState] = createSignal<Language>(getInitialLanguage())

  // Loading state
  const [loading, setLoading] = createSignal<boolean>(false)

  // Toasts state
  const [toasts, setToasts] = createSignal<Toast[]>([])

  // Modal state
  const [modal, setModal] = createSignal<ModalContent | null>(null)

  /**
   * Set theme and persist to localStorage
   */
  const setTheme = (newTheme: ThemeMode): void => {
    setThemeState(newTheme)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme)
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  /**
   * Toggle between light and dark theme
   */
  const toggleTheme = (): void => {
    const currentTheme = theme()
    setTheme(currentTheme === 'light' ? 'dark' : 'light')
  }

  /**
   * Set language and persist to localStorage
   */
  const setLanguage = (newLanguage: Language): void => {
    setLanguageState(newLanguage)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage)
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  /**
   * Show a toast notification
   */
  const showToast = (type: ToastType, message: string, duration: number = 5000): void => {
    const newToast: Toast = {
      id: generateToastId(),
      type,
      message,
      duration,
    }

    // Add toast to the beginning of the array (immutable pattern)
    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(newToast.id)
      }, duration)
    }
  }

  /**
   * Show a success toast notification
   */
  const showSuccessToast = (message: string, duration?: number): void => {
    showToast('success', message, duration)
  }

  /**
   * Show an error toast notification
   */
  const showErrorToast = (message: string, duration?: number): void => {
    showToast('error', message, duration)
  }

  /**
   * Show an info toast notification
   */
  const showInfoToast = (message: string, duration?: number): void => {
    showToast('info', message, duration)
  }

  /**
   * Dismiss a toast notification by ID
   */
  const dismissToast = (id: string): void => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  /**
   * Open a modal with content
   */
  const openModal = (content: ModalContent): void => {
    setModal(content)
  }

  /**
   * Close the current modal
   */
  const closeModal = (): void => {
    const currentModal = modal()
    if (currentModal?.onClose) {
      currentModal.onClose()
    }
    setModal(null)
  }

  /**
   * Apply theme to document
   */
  createEffect(() => {
    const currentTheme = theme()

    if (typeof window !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', currentTheme)
    }
  })

  /**
   * Create the context value
   */
  const contextValue: AppContextValue = {
    // State
    theme,
    language,
    loading,
    toasts,
    modal,

    // Theme actions
    setTheme,
    toggleTheme,

    // Language actions
    setLanguage,

    // Loading actions
    setLoading,

    // Toast actions
    showToast,
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    dismissToast,

    // Modal actions
    openModal,
    closeModal,
  }

  return <AppContext.Provider value={contextValue}>{props.children}</AppContext.Provider>
}

/**
 * Hook to use the AppContext
 *
 * @throws {Error} If used outside of an AppProvider
 * @returns {AppContextValue} The app context value
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }

  return context
}
