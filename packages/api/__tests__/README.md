# API Test Structure Reference

## Directory Layout

```
__tests__/
├── integration/              # Integration tests
│   ├── db/
│   ├── api/
│   └── repositories/
├── fixtures/                 # Test data
│   ├── db/                   # Database test data
│   │   └── testData.ts
│   ├── api/                  # API fixtures
│   │   ├── requestFixtures.ts
│   │   └── responseFixtures.ts
│   └── repositories/         # Repository fixtures
│       └── repositoryFixtures.ts
├── helpers/                  # Test utilities
│   ├── database.ts           # DB helpers
│   ├── api.ts                # API helpers
│   └── test-utils.ts         # General utilities
└── setup/                    # Test configuration
    ├── unit.ts               # Unit test setup
    ├── integration.ts        # Integration test setup
    └── e2e.ts                # E2E test setup
```

## Quick Reference

### Import Fixtures
```typescript
import {
  mockUsers,
  createMockUser,
  createMockWorkspace,
  createMockProject
} from '__tests__/fixtures';
```

### Import Helpers
```typescript
import {
  setupDatabaseTest,
  useTransaction,
  setupAPITest,
  createAuthHeaders,
  mockAuthenticatedUser
} from '__tests__/helpers';
```

## Running Tests

### Unit Tests (Co-located)
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Watch Mode
```bash
npm run test:watch
```

### All Tests
```bash
npm run test:all
```

## Test File Templates

### Unit Test Template
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository();
  });

  it('should create user', async () => {
    const user = await repository.create({
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
```

### Integration Test Template
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupDatabaseTest } from '__tests__/helpers/database';
import { WorkspaceRepository } from '../../src/repositories/workspace.repository';

setupDatabaseTest();

describe('Workspace Integration', () => {
  let workspaceRepo: WorkspaceRepository;

  beforeAll(() => {
    workspaceRepo = new WorkspaceRepository();
  });

  it('should create workspace and retrieve it', async () => {
    const workspace = await workspaceRepo.create({
      userId: 'user-1',
      name: 'Test Workspace',
    });

    const found = await workspaceRepo.findById(workspace.id);
    expect(found).toEqual(workspace);
  });
});
```
