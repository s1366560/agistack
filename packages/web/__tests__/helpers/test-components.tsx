/**
 * Component test helpers for SolidJS
 * Provides utilities for testing SolidJS components
 */

import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library'
import { vi } from 'vitest'

export function createMockCallbacks() {
  return {
    onClick: vi.fn(),
    onChange: vi.fn(),
    onSubmit: vi.fn(),
  }
}

export async function fillInput(
  placeholder: string | RegExp,
  value: string
) {
  const input = screen.getByPlaceholderText(placeholder)
  fireEvent.input(input, { target: { value } })
  await waitFor(() => expect(input).toHaveValue(value))
}

export async function clickButton(text: string | RegExp) {
  const button = screen.getByRole('button', { name: text })
  fireEvent.click(button)
  await waitFor(() => expect(button).toBeEnabled())
}

export async function clickByText(text: string | RegExp) {
  const element = screen.getByText(text)
  fireEvent.click(element)
}

export function expectTextToBeInTheDocument(text: string | RegExp) {
  expect(screen.getByText(text)).toBeInTheDocument()
}

export function expectTextNotToBeInTheDocument(text: string | RegExp) {
  expect(screen.queryByText(text)).not.toBeInTheDocument()
}

export function expectElementByTestId(testId: string) {
  expect(screen.getByTestId(testId)).toBeInTheDocument()
}
