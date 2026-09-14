import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Infrastructure
import { AppDatabase } from '../infrastructure/db/Database';
import { SqliteUserRepository } from '../infrastructure/db/repositories/SqliteUserRepository';
import { SqliteDocumentRepository } from '../infrastructure/db/repositories/SqliteDocumentRepository';
import { SqliteAnalysisRepository } from '../infrastructure/db/repositories/SqliteAnalysisRepository';
import { SqliteComparisonRepository } from '../infrastructure/db/repositories/SqliteComparisonRepository';
import { SqliteChatRepository } from '../infrastructure/db/repositories/SqliteChatRepository';
import { SqliteBriefingRepository } from '../infrastructure/db/repositories/SqliteBriefingRepository';
import { DocumentParserFactory } from '../infrastructure/parsers/DocumentParserFactory';
import { EmbeddingService } from '../infrastructure/ai/EmbeddingService';
import { VectorStore } from '../infrastructure/ai/VectorStore';
import { PromptSecurityService } from '../infrastructure/ai/PromptSecurityService';
import { LLMProviderFactory } from '../infrastructure/ai/LLMProviderFactory';
import { BcryptPasswordHasher } from '../infrastructure/security/BcryptPasswordHasher';
import { JwtTokenService } from '../infrastructure/security/JwtTokenService';
import { FileValidator } from '../infrastructure/security/FileValidator';
import { InMemoryRateLimiter } from '../infrastructure/security/RateLimiter';
import { DEMO_DOCUMENTS } from '../infrastructure/demo/DemoDocuments';

// Use Cases
import {
  RegisterUserUseCase,
  LoginUserUseCase,
  GetUserProfileUseCase,
  DeleteAccountUseCase,
  UploadDocumentUseCase,
  GetDocumentUseCase,
  ListDocumentsUseCase,
  DeleteDocumentUseCase,
  SearchDocumentUseCase,
  AnalyzeDocumentUseCase,
  GetDocumentAnalysisUseCase,
  CompareDocumentsUseCase,
  GetComparisonUseCase,
  ListComparisonsUseCase,
  AskDocumentChatUseCase,
  GetChatHistoryUseCase,
  ClearChatHistoryUseCase,
  GenerateLegalBriefingUseCase,
  GetLegalBriefingUseCase,
  UpdateActionChecklistUseCase,
  GetDashboardStatsUseCase,
  LoadDemoDocumentUseCase,
} from '../core/use-cases';

// Controllers
import { AuthController } from './controllers/AuthController';
import { DocumentController } from './controllers/DocumentController';
import { AnalysisController } from './controllers/AnalysisController';
import { ChatController } from './controllers/ChatController';
import { ComparisonController } from './controllers/ComparisonController';
import { BriefingController } from './controllers/BriefingController';
import { DemoController } from './controllers/DemoController';
import { HealthController } from './controllers/HealthController';

// Middleware & Routes
import { createAuthMiddleware } from './middleware/authMiddleware';
import { createRateLimitMiddleware } from './middleware/rateLimitMiddleware';
import { errorHandlerMiddleware } from './middleware/errorHandlerMiddleware';
import { createAuthRoutes } from './routes/authRoutes';
import { createDocumentRoutes } from './routes/documentRoutes';
import { createAnalysisRoutes } from './routes/analysisRoutes';
import { createChatRoutes } from './routes/chatRoutes';
import { createComparisonRoutes } from './routes/comparisonRoutes';
import { createBriefingRoutes } from './routes/briefingRoutes';
import { createDemoRoutes } from './routes/demoRoutes';
import { createHealthRoutes } from './routes/healthRoutes';
import { ILLMProvider } from '../core/ports';

export interface AppOptions {
  database?: AppDatabase;
  llmProvider?: ILLMProvider;
  jwtSecret?: string;
  rateLimiter?: InMemoryRateLimiter;
  maxRequestsPerMinute?: number;
}

export function createApp(options?: AppOptions): { app: Express; database: AppDatabase } {
  const database = options?.database || new AppDatabase(':memory:');
  const db = database.connection;

  // Repositories
  const userRepo = new SqliteUserRepository(db);
  const docRepo = new SqliteDocumentRepository(db);
  const analysisRepo = new SqliteAnalysisRepository(db);
  const compRepo = new SqliteComparisonRepository(db);
  const chatRepo = new SqliteChatRepository(db);
  const briefingRepo = new SqliteBriefingRepository(db);

  // Services
  const parser = new DocumentParserFactory();
  const embeddingService = new EmbeddingService();
  const vectorStore = new VectorStore(db);
  const llmProvider = options?.llmProvider || LLMProviderFactory.create();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(options?.jwtSecret);
  const fileValidator = new FileValidator();
  const rateLimiter = options?.rateLimiter || new InMemoryRateLimiter();
  const promptSecurityService = new PromptSecurityService();

  // Use Cases
  const registerUserUseCase = new RegisterUserUseCase(userRepo, passwordHasher, tokenService);
  const loginUserUseCase = new LoginUserUseCase(userRepo, passwordHasher, tokenService);
  const getUserProfileUseCase = new GetUserProfileUseCase(userRepo);
  const deleteAccountUseCase = new DeleteAccountUseCase(userRepo, docRepo, compRepo, vectorStore);

  const uploadDocUseCase = new UploadDocumentUseCase(
    docRepo,
    parser,
    embeddingService,
    vectorStore,
    fileValidator
  );
  const getDocUseCase = new GetDocumentUseCase(docRepo);
  const listDocsUseCase = new ListDocumentsUseCase(docRepo);
  const deleteDocUseCase = new DeleteDocumentUseCase(docRepo, vectorStore, analysisRepo, chatRepo, briefingRepo);
  const searchDocUseCase = new SearchDocumentUseCase(docRepo, vectorStore);

  const analyzeDocUseCase = new AnalyzeDocumentUseCase(docRepo, analysisRepo, vectorStore, llmProvider);
  const getDocAnalysisUseCase = new GetDocumentAnalysisUseCase(docRepo, analysisRepo, analyzeDocUseCase);

  const compareDocsUseCase = new CompareDocumentsUseCase(docRepo, compRepo, vectorStore, llmProvider);
  const getComparisonUseCase = new GetComparisonUseCase(compRepo);
  const listComparisonsUseCase = new ListComparisonsUseCase(compRepo);

  const askChatUseCase = new AskDocumentChatUseCase(
    docRepo,
    chatRepo,
    vectorStore,
    embeddingService,
    llmProvider,
    promptSecurityService
  );
  const getChatHistoryUseCase = new GetChatHistoryUseCase(docRepo, chatRepo);
  const clearChatHistoryUseCase = new ClearChatHistoryUseCase(docRepo, chatRepo);

  const generateBriefingUseCase = new GenerateLegalBriefingUseCase(
    docRepo,
    briefingRepo,
    analysisRepo,
    analyzeDocUseCase,
    llmProvider
  );
  const getBriefingUseCase = new GetLegalBriefingUseCase(docRepo, briefingRepo, generateBriefingUseCase);
  const updateChecklistUseCase = new UpdateActionChecklistUseCase(docRepo, briefingRepo);

  const getDashboardStatsUseCase = new GetDashboardStatsUseCase(docRepo, analysisRepo, briefingRepo);
  const loadDemoUseCase = new LoadDemoDocumentUseCase(uploadDocUseCase, analyzeDocUseCase, DEMO_DOCUMENTS);

  // Controllers
  const authController = new AuthController(
    registerUserUseCase,
    loginUserUseCase,
    getUserProfileUseCase,
    deleteAccountUseCase
  );
  const documentController = new DocumentController(
    uploadDocUseCase,
    getDocUseCase,
    listDocsUseCase,
    deleteDocUseCase,
    searchDocUseCase
  );
  const analysisController = new AnalysisController(analyzeDocUseCase, getDocAnalysisUseCase);
  const chatController = new ChatController(askChatUseCase, getChatHistoryUseCase, clearChatHistoryUseCase);
  const comparisonController = new ComparisonController(
    compareDocsUseCase,
    getComparisonUseCase,
    listComparisonsUseCase
  );
  const briefingController = new BriefingController(getBriefingUseCase, updateChecklistUseCase);
  const demoController = new DemoController(loadDemoUseCase, getDashboardStatsUseCase, DEMO_DOCUMENTS);
  const healthController = new HealthController();

  // Middleware
  const authMiddleware = createAuthMiddleware(tokenService);
  const rateLimitMiddleware = createRateLimitMiddleware(
    rateLimiter,
    options?.maxRequestsPerMinute ?? 300,
    60 * 1000
  );

  // Express App
  const app = express();
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(rateLimitMiddleware);

  // Routes
  app.use('/api/auth', createAuthRoutes(authController, authMiddleware));
  app.use('/api/documents', createDocumentRoutes(documentController, authMiddleware));
  app.use('/api/documents', createAnalysisRoutes(analysisController, authMiddleware));
  app.use('/api/documents', createChatRoutes(chatController, authMiddleware));
  app.use('/api/documents', createBriefingRoutes(briefingController, authMiddleware));
  app.use('/api/comparisons', createComparisonRoutes(comparisonController, authMiddleware));
  app.use('/api/demo', createDemoRoutes(demoController, authMiddleware));
  app.use('/api', createHealthRoutes(healthController));

  // Error handling
  app.use(errorHandlerMiddleware);

  return { app, database };
}
