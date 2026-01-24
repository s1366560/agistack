/**
 * AppContext Tests
 *
 * Test suite for the global application context provider
 * Following TDD methodology: tests written before implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'solid-js/web'
import { AppProvider, useAppContext } from './AppContext'

describe('AppContext', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    // Clear localStorage before each test
    vi.clearAllMocks()
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear()
    }

    // Create fresh container for each test
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  describe('Theme Management', () => {
    it('provides default theme as light', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              expect(context.theme()).toBe('light')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can toggle between light and dark', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              expect(context.theme()).toBe('light')

              context.toggleTheme()
              expect(context.theme()).toBe('dark')

              context.toggleTheme()
              expect(context.theme()).toBe('light')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can set theme explicitly', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.setTheme('dark')
              expect(context.theme()).toBe('dark')

              context.setTheme('light')
              expect(context.theme()).toBe('light')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('persists theme to localStorage', () => {
      // Use stub approach for localStorage
      const localStorageMock = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        clear: vi.fn(),
        removeItem: vi.fn(),
        length: 0,
        key: vi.fn(),
      }
      vi.stubGlobal('localStorage', localStorageMock)

      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.setTheme('dark')
            }}
          />
        </AppProvider>
      ), container)

      expect(localStorageMock.setItem).toHaveBeenCalledWith('agistack-theme', 'dark')

      vi.unstubAllGlobals()
    })

    it('reads theme from localStorage on initialization', () => {
      // Use stub approach for localStorage
      const localStorageMock = {
        setItem: vi.fn(),
        getItem: vi.fn().mockReturnValue('dark'),
        clear: vi.fn(),
        removeItem: vi.fn(),
        length: 0,
        key: vi.fn(),
      }
      vi.stubGlobal('localStorage', localStorageMock)

      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              expect(context.theme()).toBe('dark')
            }}
          />
        </AppProvider>
      ), container)

      expect(localStorageMock.getItem).toHaveBeenCalledWith('agistack-theme')

      vi.unstubAllGlobals()
    })

    it('defaults to light when localStorage has invalid value', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid' as unknown as string)

      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              expect(context.theme()).toBe('light')
            }}
          />
        </AppProvider>
      ), container)

      vi.restoreAllMocks()
    })
  })

  describe('Language Management', () => {
    it('provides default language as en', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              expect(context.language()).toBe('en')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can change language', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.setLanguage('zh')
              expect(context.language()).toBe('zh')

              context.setLanguage('es')
              expect(context.language()).toBe('es')

              context.setLanguage('en')
              expect(context.language()).toBe('en')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('persists language to localStorage', () => {
      // Use stub approach for localStorage
      const localStorageMock = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        clear: vi.fn(),
        removeItem: vi.fn(),
        length: 0,
        key: vi.fn(),
      }
      vi.stubGlobal('localStorage', localStorageMock)

      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.setLanguage('zh')
            }}
          />
        </AppProvider>
      ), container)

      expect(localStorageMock.setItem).toHaveBeenCalledWith('agistack-language', 'zh')

      vi.unstubAllGlobals()
    })

    it('reads language from localStorage on initialization', () => {
      // Use stub approach for localStorage
      const localStorageMock = {
        setItem: vi.fn(),
        getItem: vi.fn().mockReturnValue('zh'),
        clear: vi.fn(),
        removeItem: vi.fn(),
        length: 0,
        key: vi.fn(),
      }
      vi.stubGlobal('localStorage', localStorageMock)

      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              expect(context.language()).toBe('zh')
            }}
          />
        </AppProvider>
      ), container)

      expect(localStorageMock.getItem).toHaveBeenCalledWith('agistack-language')

      vi.unstubAllGlobals()
    })

    it('defaults to en when localStorage has invalid value', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid' as unknown as string)

      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              expect(context.language()).toBe('en')
            }}
          />
        </AppProvider>
      ), container)

      vi.restoreAllMocks()
    })
  })

  describe('Loading States', () => {
    it('provides default loading state as false', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              expect(context.loading()).toBe(false)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can set loading state to true', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.setLoading(true)
              expect(context.loading()).toBe(true)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can clear loading state', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.setLoading(true)
              expect(context.loading()).toBe(true)

              context.setLoading(false)
              expect(context.loading()).toBe(false)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('handles rapid loading state changes', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.setLoading(true)
              context.setLoading(false)
              context.setLoading(true)
              context.setLoading(false)

              expect(context.loading()).toBe(false)
            }}
          />
        </AppProvider>
      ), container)
    })
  })

  describe('Toast Notifications', () => {
    it('can show success toast', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.showSuccessToast('Operation successful')

              expect(context.toasts().length).toBe(1)
              expect(context.toasts()[0].type).toBe('success')
              expect(context.toasts()[0].message).toBe('Operation successful')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can show error toast', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.showErrorToast('Operation failed')

              expect(context.toasts().length).toBe(1)
              expect(context.toasts()[0].type).toBe('error')
              expect(context.toasts()[0].message).toBe('Operation failed')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can show info toast', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.showInfoToast('Information message')

              expect(context.toasts().length).toBe(1)
              expect(context.toasts()[0].type).toBe('info')
              expect(context.toasts()[0].message).toBe('Information message')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can show toast with custom type using showToast', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.showToast('warning', 'Warning message')

              expect(context.toasts().length).toBe(1)
              expect(context.toasts()[0].type).toBe('warning')
              expect(context.toasts()[0].message).toBe('Warning message')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('generates unique IDs for each toast', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.showSuccessToast('First toast')
              context.showErrorToast('Second toast')
              context.showInfoToast('Third toast')

              expect(context.toasts().length).toBe(3)
              const ids = context.toasts().map(t => t.id)
              expect(new Set(ids).size).toBe(3)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can manually dismiss toast by ID', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.showSuccessToast('First toast')
              const firstToastId = context.toasts()[0].id

              context.showSuccessToast('Second toast')

              context.dismissToast(firstToastId)

              expect(context.toasts().length).toBe(1)
              expect(context.toasts()[0].message).toBe('Second toast')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('handles dismissing non-existent toast gracefully', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.showSuccessToast('Test toast')

              expect(() => context.dismissToast('non-existent-id')).not.toThrow()
              expect(context.toasts().length).toBe(1)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('queues multiple toasts correctly', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.showSuccessToast('Toast 1')
              context.showErrorToast('Toast 2')
              context.showInfoToast('Toast 3')
              context.showToast('warning', 'Toast 4')

              expect(context.toasts().length).toBe(4)
              expect(context.toasts()[0].message).toBe('Toast 1')
              expect(context.toasts()[1].message).toBe('Toast 2')
              expect(context.toasts()[2].message).toBe('Toast 3')
              expect(context.toasts()[3].message).toBe('Toast 4')
            }}
          />
        </AppProvider>
      ), container)
    })
  })

  describe('Modal Management', () => {
    it('provides modal state as closed by default', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              expect(context.modal()).toBe(null)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can open modal with content', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              const modalContent = {
                title: 'Test Modal',
                content: <div>Modal Content</div>,
              }

              context.openModal(modalContent)

              expect(context.modal()).not.toBe(null)
              expect(context.modal()?.title).toBe('Test Modal')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('can close modal', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              const modalContent = {
                title: 'Test Modal',
                content: <div>Modal Content</div>,
              }

              context.openModal(modalContent)
              expect(context.modal()).not.toBe(null)

              context.closeModal()
              expect(context.modal()).toBe(null)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('only allows one modal active at a time', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              const firstModal = {
                title: 'First Modal',
                content: <div>First Content</div>,
              }

              const secondModal = {
                title: 'Second Modal',
                content: <div>Second Content</div>,
              }

              context.openModal(firstModal)
              expect(context.modal()?.title).toBe('First Modal')

              context.openModal(secondModal)
              expect(context.modal()?.title).toBe('Second Modal')
              expect(context.toasts().length).toBe(0)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('handles closing when no modal is open gracefully', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              expect(() => context.closeModal()).not.toThrow()
              expect(context.modal()).toBe(null)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('includes onClose callback in modal content', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              const onCloseCallback = vi.fn()

              const modalContent = {
                title: 'Test Modal',
                content: <div>Modal Content</div>,
                onClose: onCloseCallback,
              }

              context.openModal(modalContent)

              expect(context.modal()?.onClose).toBe(onCloseCallback)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('calls onClose callback when closing modal', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              const onCloseCallback = vi.fn()

              const modalContent = {
                title: 'Test Modal',
                content: <div>Modal Content</div>,
                onClose: onCloseCallback,
              }

              context.openModal(modalContent)
              context.closeModal()

              expect(onCloseCallback).toHaveBeenCalledTimes(1)
            }}
          />
        </AppProvider>
      ), container)
    })
  })

  describe('useAppContext Hook', () => {
    it('throws error when used outside AppProvider', () => {
      // Create a fresh environment without provider
      const testContainer = document.createElement('div')
      document.body.appendChild(testContainer)

      expect(() => {
        render(() => {
          const context = useAppContext()
          return <div>{context.theme()}</div>
        }, testContainer)
      }).toThrow('useAppContext must be used within an AppProvider')

      if (testContainer.parentNode) {
        testContainer.parentNode.removeChild(testContainer)
      }
    })

    it('provides all required context properties', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              // Check all state properties
              expect(context).toHaveProperty('theme')
              expect(context).toHaveProperty('language')
              expect(context).toHaveProperty('loading')
              expect(context).toHaveProperty('toasts')
              expect(context).toHaveProperty('modal')

              // Check all action methods
              expect(context).toHaveProperty('setTheme')
              expect(context).toHaveProperty('toggleTheme')
              expect(context).toHaveProperty('setLanguage')
              expect(context).toHaveProperty('setLoading')
              expect(context).toHaveProperty('showToast')
              expect(context).toHaveProperty('showSuccessToast')
              expect(context).toHaveProperty('showErrorToast')
              expect(context).toHaveProperty('showInfoToast')
              expect(context).toHaveProperty('dismissToast')
              expect(context).toHaveProperty('openModal')
              expect(context).toHaveProperty('closeModal')
            }}
          />
        </AppProvider>
      ), container)
    })
  })

  describe('Integration - Multiple Features', () => {
    it('handles theme change while loading', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.setLoading(true)
              context.toggleTheme()

              expect(context.loading()).toBe(true)
              expect(context.theme()).toBe('dark')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('handles toasts during modal state', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.openModal({
                title: 'Test Modal',
                content: <div>Content</div>,
              })

              context.showSuccessToast('Toast while modal is open')

              expect(context.modal()).not.toBe(null)
              expect(context.toasts().length).toBe(1)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('maintains state consistency across multiple operations', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              // Initial state
              expect(context.theme()).toBe('light')
              expect(context.language()).toBe('en')
              expect(context.loading()).toBe(false)
              expect(context.toasts().length).toBe(0)
              expect(context.modal()).toBe(null)

              // Multiple changes
              context.setTheme('dark')
              context.setLanguage('zh')
              context.setLoading(true)
              context.showSuccessToast('Test')
              context.openModal({
                title: 'Modal',
                content: <div>Content</div>,
              })

              expect(context.theme()).toBe('dark')
              expect(context.language()).toBe('zh')
              expect(context.loading()).toBe(true)
              expect(context.toasts().length).toBe(1)
              expect(context.modal()).not.toBe(null)

              // Reset operations
              context.closeModal()
              context.setLoading(false)

              expect(context.modal()).toBe(null)
              expect(context.loading()).toBe(false)
              // Theme and language should persist
              expect(context.theme()).toBe('dark')
              expect(context.language()).toBe('zh')
            }}
          />
        </AppProvider>
      ), container)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty toast message', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              context.showSuccessToast('')

              expect(context.toasts().length).toBe(1)
              expect(context.toasts()[0].message).toBe('')
            }}
          />
        </AppProvider>
      ), container)
    })

    it('handles very long toast message', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              const longMessage = 'A'.repeat(1000)
              context.showSuccessToast(longMessage)

              expect(context.toasts().length).toBe(1)
              expect(context.toasts()[0].message).toBe(longMessage)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('handles special characters in toast message', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              const specialMessage = 'Test with <script>alert("xss")</script> & special chars: <>\"\''
              context.showSuccessToast(specialMessage)

              expect(context.toasts().length).toBe(1)
              expect(context.toasts()[0].message).toBe(specialMessage)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('handles rapid toast creation and dismissal', () => {
      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              const ids: string[] = []

              for (let i = 0; i < 10; i++) {
                context.showSuccessToast(`Toast ${i}`)
                ids.push(context.toasts()[context.toasts().length - 1].id)
              }

              expect(context.toasts().length).toBe(10)

              // Dismiss all
              ids.forEach(id => context.dismissToast(id))

              expect(context.toasts().length).toBe(0)
            }}
          />
        </AppProvider>
      ), container)
    })

    it('handles localStorage errors gracefully', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage unavailable')
      })

      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              // Should not throw
              expect(() => {
                context.setTheme('dark')
                context.setLanguage('zh')
              }).not.toThrow()

              // Values should still be set in memory
              expect(context.theme()).toBe('dark')
              expect(context.language()).toBe('zh')
            }}
          />
        </AppProvider>
      ), container)

      vi.restoreAllMocks()
    })

    it('handles localStorage getItem errors gracefully', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage unavailable')
      })

      render(() => (
        <AppProvider>
          <TestComponent
            testFn={(context) => {
              // Should default to light/en
              expect(context.theme()).toBe('light')
              expect(context.language()).toBe('en')
            }}
          />
        </AppProvider>
      ), container)

      vi.restoreAllMocks()
    })
  })
})

/**
 * Test component that uses the AppContext
 */
function TestComponent(props: {
  testFn: (context: ReturnType<typeof useAppContext>) => void
}) {
  const context = useAppContext()

  // Run the test function with the context
  props.testFn(context)

  return (
    <div data-testid="test-context">
      <span data-testid="theme">{context.theme()}</span>
      <span data-testid="language">{context.language()}</span>
      <span data-testid="loading">{String(context.loading())}</span>
      <span data-testid="toast-count">{context.toasts().length}</span>
      <span data-testid="modal-open">{String(context.modal() !== null)}</span>
    </div>
  )
}
