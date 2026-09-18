import { createApp } from '../src/presentation/app';
import { AppDatabase } from '../src/infrastructure/db/Database';
import path from 'path';
import os from 'os';

let cachedApp: any = null;

function getApp() {
  if (!cachedApp) {
    const dbPath = process.env.DATABASE_PATH || path.join(os.tmpdir(), 'legallens.sqlite');
    const db = new AppDatabase(dbPath);
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
