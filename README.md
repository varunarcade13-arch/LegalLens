# LegalLens | AI for Legal Assistance & Document Companion

> **Empowering individuals and teams to understand, analyze, compare, and query complex legal agreements in plain language before signing.**

[![CI Pipeline](https://github.com/varunarcade13-arch/LegalLens/actions/workflows/ci.yml/badge.svg)](https://github.com/varunarcade13-arch/LegalLens/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://vitest.dev/)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA-purple.svg)](https://www.w3.org/WAI/WCAG21/quickref/)
[![Database](https://img.shields.io/badge/Database-Turso%20%2F%20libSQL-teal.svg)](https://turso.tech/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## ⚠️ Mandatory Legal Information Notice & Ethical Guardrails

> **IMPORTANT LEGAL NOTICE**: LegalLens is an automated document analysis and informational companion powered by Generative AI. **LegalLens provides legal information, educational summaries, and preparation tools; it does NOT provide legal advice.** LegalLens is **not a law firm, does not employ attorneys to represent you, and is never a substitute for qualified legal counsel licensed in your jurisdiction.**
> 
> Legal documents have serious binding implications. Always review high-stakes contracts with a qualified lawyer before executing agreements or waiving legal rights.

---

## 🌟 Executive Summary & Key Capabilities

Legal agreements (employment contracts, commercial leases, SaaS Master Services Agreements, non-disclosure agreements, vendor terms) are notoriously difficult for non-lawyers to read. Unfavorable liability clauses, automatic renewals, unilateral modification rights, and indemnification traps are routinely overlooked.

**LegalLens** transforms complex legal text into transparent, structured, and actionable intelligence:

1. **Multi-Format Ingestion**: Upload PDF, DOCX, and TXT agreements with automated MIME validation, magic-byte inspection, malware sanitization, and structured section-aware chunking.
2. **Plain-Language Legal Translation**: Converts archaic "legalese" into accessible summaries broken down by:
   - *What this document is about*
   - *What you are agreeing to*
   - *What the other party is agreeing to*
   - *Your key responsibilities & rights*
   - *Crucial deadlines & financial obligations*
   - *Termination & exit conditions*
3. **Core Clause & Attention Classification**: Automatically categorizes clauses (termination, liability, IP, confidentiality, payment, non-compete, etc.) and tags them with risk levels:
   - `informational` (standard standard-practice terms)
   - `review_carefully` (asymmetric or non-standard provisions)
   - `high_attention` (punitive damages, unilateral terms, uncapped liability)
4. **Side-by-Side Contract Comparison (Diffing)**: Compare two versions of a contract (e.g., standard template vs. counterparty markup) with categorized diffs:
   - Added, removed, and modified clauses
   - Specific shifts in liability caps, termination notice periods, and dispute forums
   - Color-coded impact tags (`low`, `moderate`, `significant`)
5. **Grounded RAG AI Assistant**: Ask natural-language questions about uploaded agreements. Answers cite exact source paragraphs and page numbers, supply grounded confidence indicators, and suggest follow-up questions to discuss with an attorney.
6. **Actionable Lawyer Consultation Briefing**: Generates a lawyer-ready dossier including:
   - Concise executive overview
   - Targeted questions to ask counsel
   - Documentation to bring to the initial consultation
   - Key areas of concern & deadlines
   - Interactive, checkable verification checklist with instant state persistence
   - One-click Markdown export for meetings or consultations
7. **Accessibility (WCAG 2.1 AA Compliant)**: Full keyboard navigability (`Escape` dialog dismissals, `Enter`/`Space` triggers), ARIA landmark roles (`complementary`, `dialog`, `tablist`, `log`), and high-contrast color badges in both Dark and Light themes.

---

## 🏛️ System Architecture

LegalLens is engineered following **Clean Architecture** and **Domain-Driven Design (DDD)** principles. The codebase strictly separates business logic from delivery mechanisms and external persistence:

```
src/
├── core/
│   ├── domain/               # Enterprise Entities & Value Objects (Pure TS, zero framework deps)
│   │   ├── User.ts
│   │   ├── LegalDocument.ts
│   │   ├── DocumentChunk.ts
│   │   ├── ImportantClause.ts
│   │   ├── AttentionFinding.ts
│   │   ├── DocumentAnalysis.ts
│   │   ├── Comparison.ts
│   │   ├── ChatMessage.ts
│   │   ├── LegalBriefing.ts
│   │   └── Errors.ts         # Domain errors (AuthenticationError, ConflictError, etc.)
│   ├── ports/                # Abstract Interface Specifications (Dependency Inversion)
│   │   └── index.ts          # Zod Schemas, IEmbeddingProvider, ILLMProvider, IDatabaseClient, Repositories
│   └── use-cases/            # Application Orchestration & Use Case Logic
│       ├── AuthUseCases.ts   # Registration, Login, Profile, Account Deletion
│       ├── DocumentUseCases.ts # Upload, fetch, delete, and vector indexing
│       ├── AnalysisUseCases.ts
│       ├── ComparisonUseCases.ts
│       ├── ChatUseCases.ts   # Grounded RAG with chunk deduplication & top-k ranking
│       ├── BriefingUseCases.ts
│       └── DemoUseCases.ts
├── infrastructure/           # Concrete Infrastructure Implementations
│   ├── ai/                   # GenAI & Embedding Integrations
│   │   ├── GeminiLLMProvider.ts     # Google Gemini API provider with Zod structured output
│   │   ├── GeminiEmbeddingProvider.ts# Semantic vector embeddings via text-embedding-004
│   │   ├── OpenAILLMProvider.ts     # OpenAI GPT-4o provider with schema validation
│   │   ├── MockLLMProvider.ts       # Test harness provider (active ONLY when LLM_PROVIDER=mock)
│   │   ├── MockEmbeddingProvider.ts  # Deterministic test embedding harness
│   │   ├── LLMProviderFactory.ts    # Provider factory (defaults to Gemini; zero silent mock fallback)
│   │   ├── EmbeddingService.ts      # Vectorization service delegating to active embedding provider
│   │   ├── PromptSecurityService.ts # XML delimiter isolation & prompt injection defense
│   │   └── VectorStore.ts           # LibSQL/SQLite-backed vector index with cosine similarity search
│   ├── db/                   # Distributed Persistence Layer (Turso / libSQL)
│   │   ├── Database.ts              # IDatabaseClient abstraction & AppDatabase (@libsql/client)
│   │   └── repositories/            # Sqlite*Repository implementations for each domain entity
│   ├── parsers/              # File Ingestion Engines (PdfParse, Mammoth, Txt)
│   ├── security/             # Security Utilities
│   │   ├── BcryptPasswordHasher.ts  # Salted BCrypt password hashing
│   │   ├── JwtTokenService.ts       # Stateless HS256 JWT tokens
│   │   ├── RateLimiter.ts           # Sliding-window IP & AI endpoint rate limiter
│   │   └── FileValidator.ts         # Strict size, extension, and magic-byte checks
│   └── demo/                 # Seeded Fictional Legal Templates (Employment, SaaS, Lease)
├── presentation/             # HTTP & Serverless Delivery Layer
│   ├── app.ts                # Express application bootstrap with Helmet & CORS
│   ├── server.ts             # Process lifecycle & graceful shutdown
│   ├── controllers/          # Request handlers delegating to use cases
│   ├── middleware/           # Database-backed AuthMiddleware, Validation (Zod), RateLimiter
│   └── routes/               # Modular REST endpoints
├── client/                   # Modern React Single-Page Application (WCAG 2.1 AA)
│   ├── App.tsx               # Root application coordinator with self-healing 401 token refresh
│   ├── components/           # Accessible, responsive UI components
│   │   ├── LegalDisclaimerBanner.tsx # Persistent top-level non-attorney advisory (role="complementary")
│   │   ├── Header.tsx                # Brand & navigation bar with accessible light/dark toggle
│   │   ├── LandingPage.tsx           # Educational hero & feature showcase
│   │   ├── DashboardView.tsx         # User workspace & document management table
│   │   ├── UploadZone.tsx            # Drag-and-drop secure upload zone with file validation
│   │   ├── AnalysisView.tsx          # Plain language breakdown, clause explorer & AI badge
│   │   ├── DocumentComparison.tsx    # Version diffing & categorized changes with AI badge
│   │   ├── ChatInterface.tsx         # Grounded RAG conversational interface (role="log")
│   │   ├── ActionableBriefingView.tsx# Lawyer briefing & interactive checklist with Markdown export
│   │   ├── DocumentSearch.tsx        # In-document snippet & keyword search
│   │   ├── UserProfileView.tsx       # Account settings & GDPR-compliant purge
│   │   └── AuthModal.tsx             # Accessible modal dialog (role="dialog", aria-modal="true")
│   ├── services/             # Type-safe API client (api.ts)
│   └── styles/               # Polished CSS design tokens, animations, themes
└── api/                      # Vercel Serverless Function Handler
    ├── index.ts              # Serverless entry point connecting to Turso
    └── tsconfig.json         # Dedicated serverless TypeScript configuration
```

---

## 🔒 Security, Privacy & Reliability

- **Shared Turso / libSQL Persistence**: Production deploys use distributed libSQL databases (`@libsql/client`), preventing serverless multi-instance database isolation and ensuring consistent foreign keys across all requests.
- **Database-Verified Authentication**: `authMiddleware` verifies the cryptographic JWT signature AND validates that the `userId` exists in the database. Stale tokens are immediately rejected with `401 Unauthorized`, prompting clean client-side re-authentication.
- **Genuine GenAI with Zero Silent Fallback**: In production, LegalLens calls the Google Gemini API with structured JSON output and schema validation. If the external AI service is unreachable, LegalLens returns HTTP 503 (`AIServiceUnavailableError`) rather than silently masquerading deterministic mocks as real AI.
- **Complete Tenant Isolation**: Every document, chunk, vector embedding, chat message, and briefing is strictly tagged with `userId`. All repository queries enforce tenancy filters to eliminate Insecure Direct Object References (IDOR).
- **Prompt Injection Defense (`PromptSecurityService`)**: User questions and contract contents are sanitized against injection vectors (`IGNORE PREVIOUS INSTRUCTIONS`, `SYSTEM PROMPT:`, roleplay jailbreaks) with isolated instruction boundary delimiters.
- **Strict File Upload Validation (`FileValidator`)**: Maximum upload size constrained (default 15MB), allowed types restricted to `.pdf`, `.docx`, and `.txt` with filename sanitization.
- **GDPR-Compliant Data Purge**: Users can permanently delete individual documents or trigger full account deletion, performing cascading purges across all relational tables and vector embeddings.

---

## 📊 Comprehensive Test Coverage (100.00%)

The LegalLens test suite enforces **100% test coverage** across all four metrics (**Lines**, **Statements**, **Branches**, and **Functions**) with **zero** bypass flags.

```
=============================== Coverage summary ===============================
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |      100 |     100 |     100 |                   
 client            |     100 |      100 |     100 |     100 |                   
  App.tsx          |     100 |      100 |     100 |     100 |                   
 client/components |     100 |      100 |     100 |     100 |                   
 client/services   |     100 |      100 |     100 |     100 |                   
 core/domain       |     100 |      100 |     100 |     100 |                   
 core/use-cases    |     100 |      100 |     100 |     100 |                   
 infrastructure/ai |     100 |      100 |     100 |     100 |                   
 infrastructure/db |     100 |      100 |     100 |     100 |                   
 ...b/repositories |     100 |      100 |     100 |     100 |                   
 ...structure/demo |     100 |      100 |     100 |     100 |                   
 ...ucture/parsers |     100 |      100 |     100 |     100 |                   
 ...cture/security |     100 |      100 |     100 |     100 |                   
 presentation      |     100 |      100 |     100 |     100 |                   
 ...on/controllers |     100 |      100 |     100 |     100 |                   
 ...ion/middleware |     100 |      100 |     100 |     100 |                   
 ...ntation/routes |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
```

Total Automated Tests: **371 passing unit, accessibility, security, and integration tests** across 14 test suites.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x` or higher

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/varunarcade13-arch/LegalLens.git
cd LegalLens
npm ci
```

### 2. Configure Environment Variables
Copy the sample environment file:
```bash
cp .env.example .env
```

| Environment Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP Server port | `3000` |
| `NODE_ENV` | Environment mode (`development` / `production` / `test`) | `development` |
| `JWT_SECRET` | Secret key for signing JWT tokens | *(Required in prod)* |
| `TURSO_DATABASE_URL` | Turso / libSQL database URL (`libsql://...` or `https://...`) | *(Optional in local dev)* |
| `TURSO_AUTH_TOKEN` | Turso authentication token | *(Required if TURSO_DATABASE_URL is set)* |
| `DATABASE_PATH` | Local SQLite file path fallback | `./data/legallens.sqlite` |
| `LLM_PROVIDER` | Active LLM backend (`gemini`, `openai`, `mock`) | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API Key | *(Required for Real AI)* |
| `GEMINI_MODEL` | Gemini LLM model name | `gemini-1.5-flash` |
| `GEMINI_EMBEDDING_MODEL` | Gemini text embedding model | `text-embedding-004` |
| `OPENAI_API_KEY` | OpenAI API Key *(if LLM_PROVIDER=openai)* | `""` |

> 💡 **Automated Test / CI Mode**: For automated CI pipelines and offline unit testing, set `LLM_PROVIDER=mock` and leave `TURSO_DATABASE_URL` empty to run deterministic in-memory tests (`file::memory:`) without external dependencies.

### 3. Build & Run Locally
```bash
# Verify type integrity and build both client & server
npm run lint
npm run build

# Start the application server
npm start
```
Open your browser at **`http://localhost:3000`**.

### 4. Running Tests & Coverage
```bash
# Run all unit, accessibility, and integration tests
npm test

# Run full test suite with 100% coverage report
npm run test:coverage
```

---

## ☁️ Vercel Deployment

LegalLens is configured for serverless deployment on Vercel:

1. **Push your code to GitHub**.
2. **Import the repository into Vercel**.
3. **Set Environment Variables in Vercel Dashboard** under **Project Settings → Environment Variables**:
   * `TURSO_DATABASE_URL`: `libsql://<your-db-name>.turso.io`
   * `TURSO_AUTH_TOKEN`: `<your-turso-auth-token>`
   * `JWT_SECRET`: `<strong-random-secret-key>`
   * `GEMINI_API_KEY`: `<your-gemini-api-key>`
   * `LLM_PROVIDER`: `gemini`
   * `NODE_ENV`: `production`
4. **Deploy**: Vercel automatically builds the frontend via `vite build` and serves the API through `api/index.ts`.

---

## 🐳 Docker Deployment

LegalLens includes a production-ready multi-stage `Dockerfile`:

```bash
# Build the Docker image
docker build -t legallens:latest .

# Run the container
docker run -d \
  --name legallens \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e JWT_SECRET="production-random-secret-key-at-least-32-chars" \
  -e GEMINI_API_KEY="your-gemini-api-key" \
  legallens:latest
```

---

## 📡 API Specification Overview

All application API endpoints are prefixed with `/api` and return standardized JSON responses.

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Create a new user account `{ email, password, name }`
- `POST /api/auth/login`: Authenticate existing user `{ email, password }`
- `GET /api/auth/profile`: Get current authenticated user profile
- `DELETE /api/auth/account`: Permanently delete account and cascade purge all associated data

### Documents (`/api/documents`)
- `POST /api/documents`: Upload contract (`multipart/form-data`: `file`, `title?`)
- `GET /api/documents`: List user's uploaded documents
- `GET /api/documents/:id`: Retrieve document metadata
- `DELETE /api/documents/:id`: Permanently delete document and related analyses
- `GET /api/documents/:id/search?q=...`: Search clauses by keyword or phrase

### Analysis (`/api/documents/:id/analysis`)
- `POST /api/documents/:id/analyze`: Generate or force re-analysis
- `GET /api/documents/:id/analysis`: Retrieve structured plain-language analysis

### RAG Assistant & Chat (`/api/documents/:id/chat`)
- `POST /api/documents/:id/chat`: Ask a grounded question `{ message }`
- `GET /api/documents/:id/chat`: Retrieve chat history for this document
- `DELETE /api/documents/:id/chat`: Clear conversational history

### Contract Comparison (`/api/comparisons`)
- `POST /api/comparisons`: Compare two documents `{ documentAId, documentBId }`
- `GET /api/comparisons`: List prior document comparisons
- `GET /api/comparisons/:id`: Retrieve detailed diff analysis

### Lawyer Briefings (`/api/documents/:id/briefing`)
- `GET /api/documents/:id/briefing`: Generate or fetch actionable lawyer consultation dossier
- `PATCH /api/documents/:id/briefing/checklist`: Toggle action checklist item `{ itemId, completed }`
- `GET /api/documents/:id/briefing/export`: Export briefing dossier as formatted Markdown (`text/markdown`)

### Demo & Health (`/api/demo`, `/api/health`)
- `GET /api/demo/templates`: List built-in fictional contract templates
- `POST /api/demo/load`: Instantly load and auto-analyze a demo template `{ templateId }`
- `GET /api/demo/stats`: Retrieve workspace statistics
- `GET /api/health`: Liveness and readiness health probe

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
