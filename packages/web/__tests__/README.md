# Test Structure Reference

## Directory Layout

```
__tests__/
├── integration/              # Integration tests
│   └── api/
│       └── *.integration.test.ts
├── e2e/                      # End-to-end tests
│   ├── auth/
│   ├── projects/
│   └── sessions/
├── fixtures/                 # Test data
│   ├── api/
│   │   ├── authFixtures.ts
│   │   ├── projectFixtures.ts
│   │   └── sessionFixtures.ts
│   ├── components/
│   │   └── layoutFixtures.ts
│   ├── mocks/
│   │   ├── handlers.ts       # MSW handlers
│   │   └── server.ts         # MSW server setup
│   └── index.ts
├── helpers/                  # Test utilities
│   ├── render.tsx            # Custom render functions
│   ├── test-utils.ts         # Utility functions
│   ├── mockData.ts           # Data generators
│   └── index.ts
└── setup/                    # Test configuration
    ├── unit.ts               # Unit test setup
    ├── integration.ts        # Integration test setup
    └── e2e.ts                # E2E test setup
```

## Quick Reference

### Import Fixtures
```typescript
import { mockUsers, mockProjects } from '__tests__/fixtures';
```

### Import Helpers
```typescript
import { renderWithRouter, waitFor } from '__tests__/helpers';
```

### Import Mock Server
```typescript
import { mockServer } from '__tests__/fixtures/mocks/server';
```

## Test File Templates

### Unit Test Template
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'solid-js/web';

describe('ComponentName', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should do something', () => {
    render(() => <Component />, container);
    expect(true).toBe(true);
  });
});
```

### Integration Test Template
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockServer } from '__tests__/fixtures/mocks/server';

describe('Feature Integration', () => {
  beforeEach(() => {
    mockServer.listen();
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  it('should integrate correctly', async () => {
    // Integration test code
  });
});
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test';

test('user flow description', async ({ page }) => {
  await page.goto('/route');
  await expect(page).toHaveTitle('Page Title');
});
```
