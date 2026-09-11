import { app } from './app.js';
import { testConnection, closeDatabase } from '../db/index.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function startServer() {
  const isDbReady = await testConnection();
  if (!isDbReady) {
    console.error('Failed to connect to PostgreSQL database on startup.');
    process.exit(1);
  }

  const server = app.listen(PORT, '::', () => {
    console.log(`================================================================`);
    console.log(`  Ontario Economic Intelligence Server running on port ${PORT}`);
    console.log(`  Database Read Path: Persistent PostgreSQL (localhost:5432)`);
    console.log(`  Zero-External-Round-Trip Mode: ACTIVE`);
    console.log(`================================================================`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully closing server and database connections...`);
    server.close(async () => {
      await closeDatabase();
      console.log('Server and database pool cleanly closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
