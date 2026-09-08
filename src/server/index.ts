import { app } from './app.js';
import { testConnection } from '../db/index.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function startServer() {
  const isDbReady = await testConnection();
  if (!isDbReady) {
    console.error('Failed to connect to PostgreSQL database on startup.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`  Ontario Economic Intelligence Server running on port ${PORT}`);
    console.log(`  Database Read Path: Persistent PostgreSQL (localhost:5432)`);
    console.log(`  Zero-External-Round-Trip Mode: ACTIVE`);
    console.log(`================================================================`);
  });
}

startServer();
