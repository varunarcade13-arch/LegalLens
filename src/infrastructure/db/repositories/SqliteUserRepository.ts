import { Database as SqliteDb } from 'better-sqlite3';
import { User } from '../../../core/domain/User';
import { IUserRepository } from '../../../core/ports';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export class SqliteUserRepository implements IUserRepository {
  constructor(private db: SqliteDb) {}

  public async create(user: User): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      user.id,
      user.email,
      user.passwordHash,
      user.name,
      user.createdAt.toISOString(),
      user.updatedAt.toISOString()
    );
  }

  public async findById(id: string): Promise<User | null> {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE id = ?`);
    const row = stmt.get(id) as UserRow | undefined;
    if (!row) return null;
    return this.mapToDomain(row);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare(`SELECT * FROM users WHERE email = ?`);
    const row = stmt.get(email.toLowerCase().trim()) as UserRow | undefined;
    if (!row) return null;
    return this.mapToDomain(row);
  }

  public async update(user: User): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE users SET name = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(user.name, user.updatedAt.toISOString(), user.id);
  }

  public async delete(id: string): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM users WHERE id = ?`);
    stmt.run(id);
  }

  private mapToDomain(row: UserRow): User {
    return new User({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
