/**
 * AppContext Types
 *
 * Type definitions for the global application context
 */

import type { Accessor } from 'solid-js'

/**
 * Supported theme modes
 */
export type ThemeMode = 'light' | 'dark'

/**
 * Supported languages
 */
export type Language = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja'

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning'

/**
 * Toast notification interface
 */
export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

/**
 * Modal content interface
 */
export interface ModalContent {
  title: string
  content: JSX.Element
  onClose?: () => void
}

/**
 * App context state interface (using SolidJS Accessor/signals)
 */
export interface AppState {
  theme: Accessor<ThemeMode>
  language: Accessor<Language>
  loading: Accessor<boolean>
  toasts: Accessor<Toast[]>
  modal: Accessor<ModalContent | null>
}

/**
 * App context actions interface
 */
export interface AppActions {
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLanguage: (language: Language) => void
  setLoading: (loading: boolean) => void
  showToast: (type: ToastType, message: string, duration?: number) => void
  showSuccessToast: (message: string, duration?: number) => void
  showErrorToast: (message: string, duration?: number) => void
  showInfoToast: (message: string, duration?: number) => void
  dismissToast: (id: string) => void
  openModal: (content: ModalContent) => void
  closeModal: () => void
}

/**
 * Combined app context value interface
 */
export interface AppContextValue extends AppState, AppActions {}

/**
 * App context provider props
 */
export interface AppProviderProps {
  children: JSX.Element
}
