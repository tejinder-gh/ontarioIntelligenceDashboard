import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ontario_economic_intelligence';

export const sql = postgres(DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notice noise in console
});

export async function testConnection(): Promise<boolean> {
  try {
    const [result] = await sql`SELECT 1 as ok, current_database() as db`;
    return result.ok === 1;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  await sql.end();
}

export default sql;
