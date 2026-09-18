import { IDatabaseClient } from '../Database';
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
  constructor(private db: IDatabaseClient) {}

  public async create(user: User): Promise<void> {
    await this.db.run(
      `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.name,
        user.createdAt.toISOString(),
        user.updatedAt.toISOString(),
      ]
    );
  }

  public async findById(id: string): Promise<User | null> {
    const row = await this.db.get<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return null;
    return this.mapToDomain(row);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.get<UserRow>('SELECT * FROM users WHERE email = ?', [
      email.toLowerCase().trim(),
    ]);
    if (!row) return null;
    return this.mapToDomain(row);
  }

  public async update(user: User): Promise<void> {
    await this.db.run('UPDATE users SET name = ?, updated_at = ? WHERE id = ?', [
      user.name,
      user.updatedAt.toISOString(),
      user.id,
    ]);
  }

  public async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM users WHERE id = ?', [id]);
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
