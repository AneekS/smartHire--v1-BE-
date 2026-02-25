# SmartHire AI Backend

Modular Monolith backend: Fastify, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, OpenAI.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (for local Postgres + Redis)
- OpenAI API key, AWS/R2 credentials (see `.env.example`)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set values (min 32-char `JWT_SECRET`, `OPENAI_API_KEY`, S3/R2, etc.).

3. **Database & Redis**

   ```bash
   docker-compose up -d
   ```

   Wait for healthchecks, then:

   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Run API**

   ```bash
   npm run dev
   ```

   Or API + worker:

   ```bash
   npm run dev:all
   ```

## Scripts

- `npm run dev` — API with tsx watch
- `npm run dev:all` — API + resume parser worker (concurrently)
- `npm run dev:worker` — Resume parser worker only
- `npm run build` — Compile TypeScript to `dist/`
- `npm run start` — Run compiled API (`node dist/app.js` with path alias)
- `npm run worker:start` — Run compiled worker
- `npm run db:migrate` — Deploy migrations (production)
- `npm run db:seed` — Seed skill taxonomy
- `npm run typecheck` — `tsc --noEmit`

## API Base

- Health: `GET /health`
- Auth: `POST /api/v1/auth/signup`, `login`, `refresh`, `logout`
- Candidates: `GET/PUT /api/v1/candidates/me`, `GET /api/v1/candidates/me/dashboard`
- Resumes: `POST /api/v1/resumes/upload`, `GET /api/v1/resumes/:id`, etc.
- Jobs: `GET /api/v1/jobs/search`, `GET /api/v1/jobs/recommended`, `GET /api/v1/jobs/:id`, `POST /api/v1/jobs/:id/apply`
- Applications: `GET /api/v1/applications`

## Architecture

- **Modular monolith**: `src/modules/` (auth, candidate, resume, parser, jobs, applications), `src/infrastructure/` (db, redis, queue, storage, ai, http).
- **Resume flow**: Upload → S3, create Resume row, enqueue → worker runs parser pipeline (extract → preprocess → LLM → validate → score → save).
- **Auth**: JWT access token + refresh token (hashed in DB, rotation on refresh).
