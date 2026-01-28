import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

console.log('Testing database connection...');
console.log('DATABASE_URL:', DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

try {
  const sql = postgres(DATABASE_URL);

  // Test connection
  await sql`SELECT 1 as test`;
  console.log('✓ Database connection successful');

  // Test sessions query
  const sessions = await sql`
    SELECT id, title, agent_type
    FROM sessions
    LIMIT 5
  `;
  console.log('✓ Sessions query successful');
  console.log('Found sessions:', sessions.length);

  if (sessions.length > 0) {
    console.log('Session example:', sessions[0]);
  }

  // Test specific session
  const sessionId = 'b4d1ce4e-832b-49fc-a50b-1ed587ef2c64';
  const session = await sql`
    SELECT * FROM sessions
    WHERE id = ${sessionId}
  `;
  console.log('✓ Specific session query:', session.length > 0 ? 'Found' : 'Not found');

  if (session.length > 0) {
    console.log('Session data:', session[0]);
  }

  await sql.end();
  console.log('✓ Test completed successfully');
} catch (error) {
  console.error('✗ Database error:', error.message);
  console.error('Error details:', error);
  process.exit(1);
}
