# LegalLens | AI for Legal Assistance & Document Companion

> **Empowering individuals and teams to understand, analyze, compare, and query complex legal agreements in plain language before signing.**

[![CI Pipeline](https://github.com/legallens/legallens/actions/workflows/ci.yml/badge.svg)](https://github.com/legallens/legallens/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://vitest.dev/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

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

---

## 🏛️ System Architecture

LegalLens is engineered following **Clean Architecture** and **Domain-Driven Design (DDD)** principles. The codebase strictly separates business logic from delivery mechanisms and external dependencies:

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
│   │   └── Errors.ts
│   ├── ports/                # Abstract Interface Specifications (Dependency Inversion)
│   │   └── index.ts          # Repositories, LLM Providers, Parsers, Security, Vector Store
│   └── use-cases/            # Application Orchestration & Use Case Logic
│       ├── AuthUseCases.ts
│       ├── DocumentUseCases.ts
│       ├── AnalysisUseCases.ts
│       ├── ComparisonUseCases.ts
│       ├── ChatUseCases.ts
│       ├── BriefingUseCases.ts
│       └── DemoUseCases.ts
├── infrastructure/           # Concrete Infrastructure Implementations
│   ├── ai/                   # LLM & Embedding Integrations
│   │   ├── MockLLMProvider.ts    # Deterministic heuristic engine (no API key needed)
│   │   ├── GeminiLLMProvider.ts  # Google Gemini 1.5 Pro / Flash implementation
│   │   ├── OpenAILLMProvider.ts  # OpenAI GPT-4o implementation
│   │   ├── LLMProviderFactory.ts # Provider factory with auto-fallback
│   │   ├── EmbeddingService.ts   # Cosine-ready lexical/semantic vectorization
│   │   ├── PromptSecurityService.ts # Injection defense & delimiter isolation
│   │   └── VectorStore.ts        # SQLite-backed in-database vector index
│   ├── db/                   # Persistent Storage Layer
│   │   ├── Database.ts           # SQLite WAL-mode connection with foreign keys
│   │   └── repositories/         # Sqlite*Repository implementations for each domain entity
│   ├── parsers/              # File Ingestion Engines (PdfParse, Mammoth, Txt)
│   ├── security/             # Security Utilities
│   │   ├── BcryptPasswordHasher.ts # Salted BCrypt password hashing
│   │   ├── JwtTokenService.ts      # Stateless HS256 JWT tokens
│   │   ├── RateLimiter.ts          # Sliding-window IP rate limiter
│   │   └── FileValidator.ts        # Strict size, extension, and magic-byte checks
│   └── demo/                 # Seeded Fictional Legal Templates (Employment, SaaS, Lease)
├── presentation/             # HTTP & API Delivery Layer
│   ├── app.ts                # Express application bootstrap with Helmet & CORS
│   ├── server.ts             # Process lifecycle & graceful shutdown
│   ├── controllers/          # Request handlers delegating to use cases
│   ├── middleware/           # Auth, Validation (Zod), RateLimiter, ErrorHandler
│   └── routes/               # Modular REST endpoints
└── client/                   # Modern React Single-Page Application
    ├── App.tsx               # Root application coordinator
    ├── components/           # Accessible, responsive UI components
    │   ├── LegalDisclaimerBanner.tsx # Persistent top-level non-attorney advisory
    │   ├── Header.tsx                # Brand & navigation bar with light/dark toggle
    │   ├── LandingPage.tsx           # Educational hero & feature showcase
    │   ├── DashboardView.tsx         # User workspace & document management table
    │   ├── UploadZone.tsx            # Drag-and-drop secure upload zone
    │   ├── AnalysisView.tsx          # Plain language breakdown & clause explorer
    │   ├── DocumentComparison.tsx    # Version diffing & categorized changes
    │   ├── ChatInterface.tsx         # Grounded RAG conversational interface
    │   ├── ActionableBriefingView.tsx# Lawyer briefing & interactive checklist
    │   ├── DocumentSearch.tsx        # In-document snippet & keyword search
    │   ├── UserProfileView.tsx       # Account settings & GDPR-compliant purge
    │   └── AuthModal.tsx             # Login / registration modal dialog
    ├── services/             # Type-safe API client (api.ts)
    └── styles/               # Polished CSS design tokens, animations, themes
```

---

## 🔒 Security, Privacy & Compliance Posture

LegalLens is built for handling confidential and privileged contracts:

- **Complete Tenant Isolation**: Every document, chunk, vector embedding, chat message, and briefing is strictly tagged with `userId`. All repository queries enforce tenancy filters to completely eliminate Insecure Direct Object References (IDOR).
- **Prompt Injection Guardrails (`PromptSecurityService`)**: User questions and contract contents are sanitized against injection vectors (`IGNORE PREVIOUS INSTRUCTIONS`, `SYSTEM PROMPT:`, roleplay jailbreaks). Prompts are wrapped in isolated XML delimiter boundaries with strict system constraints.
- **Strict File Upload Validation (`FileValidator`)**:
  - Maximum upload size constrained (default 15MB).
  - Allowed file types strictly restricted to `.pdf`, `.docx`, and `.txt`.
  - Extension and MIME type verification.
  - Filename sanitization protecting against directory traversal (`../../`).
- **Sliding-Window Rate Limiting (`RateLimiter`)**: Prevents brute-force credential stuffing and API denial-of-service.
- **Stateless Authentication**: Passwords hashed using BCrypt (configurable salt rounds); session authorization via cryptographically signed JSON Web Tokens (JWT).
- **GDPR-Compliant Data Purge**: Users can permanently delete individual documents or trigger full account deletion, performing cascading purges across all relational tables and vector embeddings.

---

## 📊 Comprehensive Test Coverage (100.00%)

The LegalLens test suite enforces **100% test coverage** across all four metrics (**Lines**, **Statements**, **Branches**, and **Functions**) with **zero** `/* istanbul ignore */` or bypass flags.

```
=============================== Coverage summary ===============================
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |      100 |     100 |     100 |                   
 client            |     100 |      100 |     100 |     100 |                   
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

Total Automated Tests: **302 passing unit, security, and integration tests** across 13 test suites.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (Tested on Node 22.13.0)
- **npm**: `v10.x` or higher

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/legallens/legallens.git
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
| `DATABASE_PATH` | Path to SQLite database | `./data/legallens.sqlite` |
| `LLM_PROVIDER` | Active LLM backend (`mock`, `gemini`, `openai`) | `mock` |
| `GEMINI_API_KEY` | Google Gemini API Key *(Optional if using mock)* | `""` |
| `OPENAI_API_KEY` | OpenAI API Key *(Optional if using mock)* | `""` |

> 💡 **Instant Evaluation Mode**: By default, `LLM_PROVIDER=mock` uses the built-in deterministic heuristic analysis engine. You can immediately evaluate, upload documents, and run tests without configuring external API keys.

### 3. Build & Run Locally
```bash
# Verify type integrity and build both client & server
npm run lint
npm run build

# Start the application server
npm start
```
Open your browser at **`http://localhost:3000`**.

### 4. Running Tests
```bash
# Run unit & integration tests
npm test

# Run tests with 100% coverage report
npm run test:coverage
```

---

## 🐳 Docker Deployment

LegalLens includes a production-ready, multi-stage `Dockerfile` with non-root security isolation:

```bash
# Build the Docker image
docker build -t legallens:latest .

# Run the container with persistent data volume
docker run -d \
  --name legallens \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e JWT_SECRET="production-random-secret-key-at-least-32-chars" \
  legallens:latest
```

Check health status:
```bash
docker inspect --format='{{json .State.Health.Status}}' legallens
```

---

## 📡 API Specification Overview

All application API endpoints are prefixed with `/api` and return standardized JSON responses.

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Create a new user account `{ email, password, name }`
- `POST /api/auth/login`: Authenticate existing user `{ email, password }`
- `GET /api/auth/me`: Get current authenticated user profile
- `DELETE /api/auth/account`: Permanently delete account and all associated data

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
