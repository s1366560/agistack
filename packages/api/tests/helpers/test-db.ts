/**
 * Database test helpers
 * Provides utilities for setting up and tearing down test databases
 */

export function createMockDatabase() {
  const mockData = new Map<string, any[]>()

  return {
    reset() {
      mockData.clear()
    },

    addData(table: string, data: any[]) {
      mockData.set(table, data)
    },

    getData(table: string) {
      return mockData.get(table) || []
    },

    find(table: string, predicate: (item: any) => boolean) {
      const data = this.getData(table)
      return data.find(predicate)
    },

    filter(table: string, predicate: (item: any) => boolean) {
      const data = this.getData(table)
      return data.filter(predicate)
    },
  }
}

export type TestDatabase = ReturnType<typeof createMockDatabase>

export function setupTestDb() {
  const db = createMockDatabase()

  beforeEach(() => {
    db.reset()
  })

  return db
}
