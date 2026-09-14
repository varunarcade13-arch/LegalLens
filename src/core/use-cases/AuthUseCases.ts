import { User, SanitizedUser } from '../domain/User';
import { ConflictError, ValidationError, AuthenticationError, NotFoundError } from '../domain/Errors';
import { IUserRepository, IPasswordHasher, ITokenService, IDocumentRepository, IComparisonRepository, IVectorStore } from '../ports';

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface AuthResult {
  user: SanitizedUser;
  token: string;
}

export class RegisterUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher,
    private tokenService: ITokenService
  ) {}

  public async execute(dto: RegisterDTO): Promise<AuthResult> {
    if (!dto.email || !dto.password || !dto.name) {
      throw new ValidationError('Email, password, and name are required');
    }
    if (dto.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    const user = new User({
      id,
      email: dto.email,
      passwordHash,
      name: dto.name,
      createdAt: now,
      updatedAt: now,
    });

    await this.userRepository.create(user);
    const token = this.tokenService.generateToken({ userId: user.id, email: user.email });

    return {
      user: user.toSanitized(),
      token,
    };
  }
}

export interface LoginDTO {
  email: string;
  password: string;
}

export class LoginUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher,
    private tokenService: ITokenService
  ) {}

  public async execute(dto: LoginDTO): Promise<AuthResult> {
    if (!dto.email || !dto.password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const valid = await this.passwordHasher.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new AuthenticationError('Invalid email or password');
    }

    const token = this.tokenService.generateToken({ userId: user.id, email: user.email });

    return {
      user: user.toSanitized(),
      token,
    };
  }
}

export class GetUserProfileUseCase {
  constructor(private userRepository: IUserRepository) {}

  public async execute(userId: string): Promise<SanitizedUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toSanitized();
  }
}

export class DeleteAccountUseCase {
  constructor(
    private userRepository: IUserRepository,
    private documentRepository: IDocumentRepository,
    private comparisonRepository: IComparisonRepository,
    private vectorStore: IVectorStore
  ) {}

  public async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const userDocs = await this.documentRepository.findByUserId(userId);
    for (const doc of userDocs) {
      await this.vectorStore.deleteByDocumentId(doc.id);
      await this.documentRepository.delete(doc.id);
    }

    const userComparisons = await this.comparisonRepository.findByUserId(userId);
    for (const comp of userComparisons) {
      await this.comparisonRepository.delete(comp.id);
    }

    await this.userRepository.delete(userId);
  }
}
