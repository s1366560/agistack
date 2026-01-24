import { db } from './index';
import { users, workspaces, projects } from './schema';

/**
 * Seed database with test data
 */
export async function seed() {
  console.log('Seeding database...');

  // Create test user
  const [user] = await db
    .insert(users)
    .values({
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    })
    .returning();

  console.log('Created user:', user.id);

  // Create test workspace
  const [workspace] = await db
    .insert(workspaces)
    .values({
      userId: user.id,
      name: 'Test Workspace',
      settings: {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
        },
      },
    })
    .returning();

  console.log('Created workspace:', workspace.id);

  // Create test project
  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: workspace.id,
      name: 'Test Project',
      path: '/path/to/project',
      description: 'A test project',
      metadata: {
        language: 'TypeScript',
        framework: 'SolidJS',
      },
    })
    .returning();

  console.log('Created project:', project.id);
  console.log('Seeding complete!');
}

/**
 * Clear all test data
 */
export async function clearSeed() {
  console.log('Clearing seed data...');
  await db.delete(projects);
  await db.delete(workspaces);
  await db.delete(users);
  console.log('Seed data cleared!');
}

/**
 * CLI entrypoint
 */
async function main() {
  const command = process.argv[2];

  if (command === 'clear') {
    await clearSeed();
  } else {
    // Default to seed
    await seed();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}
