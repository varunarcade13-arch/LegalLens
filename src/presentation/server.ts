import fs from 'fs';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import { createApp } from './app';
import { AppDatabase } from '../infrastructure/db/Database';

dotenv.config();

const port = process.env.PORT || 4000;
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../../data/legallens.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new AppDatabase(dbPath);
const { app } = createApp({ database: db });

// Serve static frontend in production
const clientDistPath = path.resolve(__dirname, '..');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('LegalLens API Server is operational.');
    }
  });
});

app.listen(port, () => {
  console.log(`LegalLens Server is running on port ${port}`);
});
