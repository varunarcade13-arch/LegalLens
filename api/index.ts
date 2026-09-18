import { createApp } from '../src/presentation/app';
import { AppDatabase } from '../src/infrastructure/db/Database';
import path from 'path';
import os from 'os';

const dbPath = process.env.DATABASE_PATH || path.join(os.tmpdir(), 'legallens.db');
const db = new AppDatabase(dbPath);
const { app } = createApp({ database: db });

export default app;
