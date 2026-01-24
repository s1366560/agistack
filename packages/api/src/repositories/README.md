# Repository Layer

This directory contains the repository layer for database operations.

## Base Repository

The `BaseRepository` class provides common CRUD operations for all entities:

### Methods

#### Create
- `create(data)` - Create a single entity
- `createMany(data[])` - Create multiple entities

#### Read
- `findById(id)` - Find entity by ID
- `findAll(options?)` - Find all entities with optional filtering
- `findMany(...conditions)` - Find entities with custom filters
- `findOne(...conditions)` - Find one entity matching conditions
- `count(...conditions?)` - Count entities
- `exists(id)` - Check if entity exists

#### Update
- `update(id, data)` - Update entity by ID
- `updateMany(where, data)` - Update multiple entities

#### Delete
- `delete(id)` - Delete entity by ID
- `deleteMany(where)` - Delete multiple entities
- `truncate()` - Delete all records (use with caution)

#### Transaction
- `transaction(callback)` - Execute operations in a transaction

#### Pagination
- `paginate(options)` - Get paginated results

## Usage Example

```typescript
import { BaseRepository } from './base';
import { users } from '../db/schema';

class UserRepository extends BaseRepository<User> {
  constructor() {
    super(users);
  }

  async findByEmail(email: string) {
    return this.findOne(eq(users.email, email));
  }
}

const userRepo = new UserRepository();
const user = await userRepo.create({
  name: 'John Doe',
  email: 'john@example.com',
});
```

## Testing

Integration tests for repositories require a test database connection. See `/tests/integration/repositories` for full integration tests.

Unit tests verify the structure and interface of the BaseRepository class.
