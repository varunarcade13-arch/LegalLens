import { createApp } from '../src/presentation/app';
import { AppDatabase } from '../src/infrastructure/db/Database';
import path from 'path';
import os from 'os';

let cachedApp: any = null;

function getApp() {
  if (!cachedApp) {
    let db: AppDatabase;
    if (process.env.TURSO_DATABASE_URL) {
      if (!process.env.TURSO_AUTH_TOKEN) {
        throw new Error('TURSO_AUTH_TOKEN environment variable is required when TURSO_DATABASE_URL is configured.');
      }
      try {
        const parsed = new URL(process.env.TURSO_DATABASE_URL.replace(/^libsql:/, 'https:'));
        console.log(`[Database] Initializing Turso connection to host: ${parsed.host}`);
      } catch {
        console.log('[Database] Initializing Turso connection');
      }
      db = new AppDatabase({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    } else {
      const dbPath = process.env.DATABASE_PATH || path.join(os.tmpdir(), 'legallens.sqlite');
      console.log(`[Database] Initializing local fallback database at ${dbPath}`);
      db = new AppDatabase(dbPath);
    }

    const { app } = createApp({ database: db });
    cachedApp = app;
  }
  return cachedApp;
}

export default function handler(req: any, res: any) {
  try {
    const app = getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('Serverless Handler Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || String(err),
    });
  }
}
