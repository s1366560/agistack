/**
 * Mock Data Generators
 *
 * Utility functions to generate mock data for tests
 */

/**
 * Generate a random ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a random email
 */
export function generateEmail(): string {
  return `test${Math.random().toString(36).substr(2, 9)}@example.com`;
}

/**
 * Generate a random date
 */
export function generateDate(daysAgo: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Generate a random string
 */
export function generateString(length: number = 10): string {
  return Math.random().toString(36).substr(2, length);
}

/**
 * Generate an array of items
 */
export function generateArray<T>(
  generator: () => T,
  count: number
): T[] {
  return Array.from({ length: count }, generator);
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number = 1,
  limit: number = 10
) {
  return {
    success: true,
    data: items,
    meta: {
      total: items.length,
      page,
      limit,
    },
  };
}
