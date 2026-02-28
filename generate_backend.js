// This script generates the directory structure and files for smarthire-backend.
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'smarthire-backend');

const dirs = [
  'src/config',
  'src/modules/candidate-profile/sub-modules/skills',
  'src/modules/candidate-profile/sub-modules/education',
  'src/modules/candidate-profile/sub-modules/experience',
  'src/modules/candidate-profile/sub-modules/career-intent',
  'src/modules/candidate-profile/sub-modules/resume-sync',
  'src/modules/candidate-profile/sub-modules/privacy',
  'src/middleware',
  'src/shared/errors',
  'src/shared/utils',
  'src/shared/types',
  'src/jobs',
  'prisma/migrations',
  'tests/unit',
  'tests/integration'
];

dirs.forEach(d => {
  fs.mkdirSync(path.join(baseDir, d), { recursive: true });
});

const files = {
  // SCHEMA
  'prisma/schema.prisma': `generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [citext, pg_trgm, uuid_ossp]
}

// ── ENUMS ──────────────────────────────────────────────

enum ProfileVisibility {
  PUBLIC
  APPLIED_ONLY
  PRIVATE
}

enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  FREELANCE
  INTERNSHIP
}

enum AvailabilityStatus {
  ACTIVELY_LOOKING
  OPEN_TO_OFFERS
  NOT_LOOKING
}

enum ResumeParseStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  USER_CONFIRMED
}

enum SkillProficiency {
  BEGINNER
  ELEMENTARY
  INTERMEDIATE
  ADVANCED
  EXPERT
}

// ── CORE PROFILE ────────────────────────────────────────

model CandidateProfile {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                String    @unique @db.Uuid

  fullName              String    @db.VarChar(120)
  phoneCountryCode      String?   @db.VarChar(6)
  phoneNumber           String?   @db.VarChar(20)
  headline              String?   @db.VarChar(220)
  bio                   String?   @db.Text
  avatarUrl             String?   @db.Text

  locationCity          String?   @db.VarChar(100)
  locationState         String?   @db.VarChar(100)
  locationCountry       String?   @db.VarChar(100)  @default("IN")
  locationLatitude      Float?
  locationLongitude     Float?

  completenessScore     Int       @default(0)
  completenessBreakdown Json      @default("{}")

  isDeleted             Boolean   @default(false)
  deletedAt             DateTime?

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  version               Int       @default(0)

  education             Education[]
  experience            WorkExperience[]
  skills                CandidateSkill[]
  careerIntent          CareerIntent?
  resumeVersions        ResumeVersion[]
  privacySettings       PrivacySettings?
  auditLogs             ProfileAuditLog[]

  @@index([userId])
  @@index([completenessScore])
  @@index([locationCountry, locationCity])
  @@index([isDeleted])
  @@map("candidate_profiles")
}

// ── EDUCATION ────────────────────────────────────────────

model Education {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  profileId     String    @db.Uuid
  institution   String    @db.VarChar(200)
  degree        String    @db.VarChar(120)
  fieldOfStudy  String    @db.VarChar(120)
  startDate     DateTime  @db.Date
  endDate       DateTime? @db.Date
  isCurrent     Boolean   @default(false)
  grade         String?   @db.VarChar(20)
  description   String?   @db.Text
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  profile       CandidateProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
  @@map("candidate_education")
}

// ── WORK EXPERIENCE ──────────────────────────────────────

model WorkExperience {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  profileId       String    @db.Uuid
  company         String    @db.VarChar(200)
  role            String    @db.VarChar(150)
  employmentType  JobType   @default(FULL_TIME)
  startDate       DateTime  @db.Date
  endDate         DateTime? @db.Date
  isCurrent       Boolean   @default(false)
  location        String?   @db.VarChar(150)
  description     String?   @db.Text
  achievements    Json      @default("[]")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  profile         CandidateProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
  @@map("candidate_work_experience")
}

// ── SKILL MASTER CATALOG ─────────────────────────────────

model SkillCategory {
  id     String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name   String  @unique @db.VarChar(80)
  slug   String  @unique @db.VarChar(80)
  skills Skill[]
  @@map("skill_categories")
}

model Skill {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name            String         @unique @db.Citext
  slug            String         @unique @db.VarChar(100)
  categoryId      String         @db.Uuid
  aliases         String[]
  isVerifiable    Boolean        @default(false)
  category        SkillCategory  @relation(fields: [categoryId], references: [id])
  candidateSkills CandidateSkill[]

  @@index([categoryId])
  @@index([name])
  @@map("skills")
}

// ── CANDIDATE SKILL (JUNCTION) ───────────────────────────

model CandidateSkill {
  id                  String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  profileId           String           @db.Uuid
  skillId             String           @db.Uuid
  proficiency         SkillProficiency @default(INTERMEDIATE)
  yearsOfExp          Float            @default(0)
  isVerified          Boolean          @default(false)
  verifiedAt          DateTime?
  verificationSource  String?          @db.VarChar(100)
  endorsementCount    Int              @default(0)
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  profile             CandidateProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  skill               Skill            @relation(fields: [skillId], references: [id])

  @@unique([profileId, skillId])
  @@index([profileId])
  @@index([skillId])
  @@index([proficiency])
  @@index([isVerified])
  @@index([profileId, proficiency])
  @@map("candidate_skills")
}

// ── CAREER INTENT ────────────────────────────────────────

model CareerIntent {
  id                  String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  profileId           String             @unique @db.Uuid
  preferredRoles      String[]
  preferredLocations  String[]
  salaryMinMonthly    Int?
  salaryMaxMonthly    Int?
  salaryCurrency      String             @default("INR") @db.VarChar(5)
  jobTypes            JobType[]
  openToRelocation    Boolean            @default(false)
  availability        AvailabilityStatus @default(OPEN_TO_OFFERS)
  noticePeriodDays    Int?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  profile             CandidateProfile   @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([availability])
  @@index([openToRelocation])
  @@map("candidate_career_intent")
}

// ── RESUME VERSION ───────────────────────────────────────

model ResumeVersion {
  id               String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  profileId        String            @db.Uuid
  versionNumber    Int
  fileName         String            @db.VarChar(255)
  fileMimeType     String            @db.VarChar(80)
  fileSizeBytes    Int
  storageKey       String            @db.Text
  parseStatus      ResumeParseStatus @default(PENDING)
  parsedData       Json?
  isActive         Boolean           @default(true)
  userConfirmed    Boolean           @default(false)
  userConfirmedAt  DateTime?
  parseJobId       String?           @db.VarChar(100)
  parseFailReason  String?           @db.Text
  uploadedAt       DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  profile          CandidateProfile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, versionNumber])
  @@index([profileId, isActive])
  @@index([parseStatus])
  @@map("resume_versions")
}

// ── PRIVACY SETTINGS ─────────────────────────────────────

model PrivacySettings {
  id                        String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  profileId                 String            @unique @db.Uuid
  profileVisibility         ProfileVisibility @default(APPLIED_ONLY)
  allowRecruiterMessaging   Boolean           @default(true)
  hideFromCompanies         String[]
  gdprConsentGiven          Boolean           @default(false)
  gdprConsentAt             DateTime?
  marketingConsentGiven     Boolean           @default(false)
  dataRetentionOptOut       Boolean           @default(false)
  createdAt                 DateTime          @default(now())
  updatedAt                 DateTime          @updatedAt

  profile                   CandidateProfile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  @@map("candidate_privacy_settings")
}

// ── AUDIT LOG ────────────────────────────────────────────

model ProfileAuditLog {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  profileId   String    @db.Uuid
  actorId     String    @db.Uuid
  actorRole   String    @db.VarChar(50)
  action      String    @db.VarChar(100)
  entityType  String    @db.VarChar(80)
  entityId    String?   @db.Uuid
  diff        Json?
  ipAddress   String?   @db.VarChar(45)
  userAgent   String?   @db.Text
  createdAt   DateTime  @default(now())

  profile     CandidateProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId, createdAt])
  @@index([actorId])
  @@index([action])
  @@map("profile_audit_logs")
}
`,
  'prisma/migrations/add_profile_indexes.sql': `-- GIN index for pg_trgm skill name search
CREATE INDEX CONCURRENTLY idx_skills_name_trgm
  ON skills USING GIN (name gin_trgm_ops);

-- Partial index: only active profiles
CREATE INDEX CONCURRENTLY idx_profiles_active
  ON candidate_profiles (user_id)
  WHERE is_deleted = false;

-- Composite for skill-gap engine
CREATE INDEX CONCURRENTLY idx_candidate_skills_composite
  ON candidate_skills (profile_id, skill_id, proficiency);

-- Skill matching engine
CREATE INDEX CONCURRENTLY idx_candidate_skills_skill_prof
  ON candidate_skills (skill_id, proficiency)
  WHERE is_verified = false;

-- BRIN for append-only audit log (time-ordered, huge table)
CREATE INDEX idx_audit_logs_brin
  ON profile_audit_logs USING BRIN (created_at);

-- Covering index for recruiter completeness queries
CREATE INDEX CONCURRENTLY idx_profiles_completeness
  ON candidate_profiles (completeness_score DESC, location_country)
  WHERE is_deleted = false;
`,

  'src/config/env.ts': `import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string(),
  AWS_S3_BUCKET_NAME: z.string(),
  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  INTERNAL_API_SECRET: z.string().min(32),
  RESUME_PARSE_WEBHOOK_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ALLOWED_ORIGINS: z.string(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables', parsedEnv.error.format());
  process.exit(1);
}

export const env = {
  ...parsedEnv.data,
  CORS_ALLOWED_ORIGINS_ARRAY: parsedEnv.data.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim()),
};
`,
  'src/config/database.ts': `import { PrismaClient } from '@prisma/client';
import { env } from './env';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL.includes('pgbouncer=true') 
        ? env.DATABASE_URL 
        : \`\${env.DATABASE_URL}?pgbouncer=true&connection_limit=10&pool_timeout=30\`,
    },
  },
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});
`,
  'src/config/constants.ts': `export const CONSTANTS = {
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 50,
  }
};
`,
  'src/shared/errors/AppError.ts': `export class AppError extends Error {
  public code: string;
  public details?: any;
  public statusCode: number;

  constructor(message: string, code: string = 'INTERNAL_ERROR', statusCode: number = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
`,
  'src/shared/errors/NotFoundError.ts': `import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}
`,
  'src/shared/errors/ValidationError.ts': `import { AppError } from './AppError';

export class ValidationError extends AppError {
  constructor(details: any, message: string = 'Validation failed') {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}
`,
  'src/shared/errors/ForbiddenError.ts': `import { AppError } from './AppError';

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}
`,
  'src/shared/errors/ConflictError.ts': `import { AppError } from './AppError';

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 'CONFLICT', 409);
  }
}
`,
  'src/shared/errors/UnauthorizedError.ts': `import { AppError } from './AppError';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}
`,
  'src/shared/errors/RateLimitError.ts': `import { AppError } from './AppError';

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}
`,
  'src/shared/utils/asyncHandler.ts': `import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
`,
  'src/shared/utils/apiResponse.ts': `import { Response } from 'express';

export const sendResponse = (res: Response, statusCode: number, data: any) => {
  res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    data,
  });
};

export const sendPaginatedResponse = (res: Response, statusCode: number, items: any[], meta: { limit: number; hasNextPage: boolean; nextCursor: string | null }) => {
  res.status(statusCode).json({
    success: true,
    data: {
      items,
      meta,
    }
  });
};
`,
  'src/shared/utils/pagination.ts': `export interface CursorPagination {
  cursor?: string;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
}

export const encodeCursor = (id: string, createdAt: Date): string => {
  return Buffer.from(JSON.stringify({ id, createdAt })).toString('base64');
};

export const decodeCursor = (cursor: string): { id: string; createdAt: Date } | null => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    return { id: parsed.id, createdAt: new Date(parsed.createdAt) };
  } catch {
    return null;
  }
};
`,
  'src/shared/utils/logger.ts': `import winston from 'winston';
import { env } from '../../config/env';

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ],
});
`,
  'src/shared/utils/events.ts': `import { EventEmitter } from 'events';

/**
 * Replace EventEmitter with BullMQ producer for production scale
 */
class TypedEventEmitter extends EventEmitter {
  emitEvent(event: string, payload: any) {
    this.emit(event, payload);
  }
}

export const events = new TypedEventEmitter();
`,
  'src/shared/types/express.d.ts': `import { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    user?: {
      userId: string;
      role: string;
      email: string;
    };
  }
}
`,
  'src/shared/types/common.types.ts': `// Common types shared across modules
export {};
`,
  'src/middleware/auth.middleware.ts': `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/UnauthorizedError';
import Redis from 'ioredis';

const redisClient = new Redis(env.REDIS_URL);

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    
    // Check revocation (simplified)
    const isRevoked = await redisClient.get(\`revoked:\${token}\`);
    if (isRevoked) {
      throw new UnauthorizedError('Token is revoked');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    req.user = {
      userId: decoded.userId || decoded.id,
      role: decoded.role || 'CANDIDATE',
      email: decoded.email
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};
`,
  'src/middleware/rbac.middleware.ts': `import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors/ForbiddenError';

export const rbacMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
};
`,
  'src/middleware/rateLimit.middleware.ts': `import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { env } from '../config/env';
import { RateLimitError } from '../shared/errors/RateLimitError';

const redisClient = new Redis(env.REDIS_URL);

export const rateLimitMiddleware = (key: string, maxRequests: number, windowSeconds: number) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(...args),
      prefix: \`rl:\${key}:\`
    }),
    windowMs: windowSeconds * 1000,
    max: maxRequests,
    handler: (req, res, next) => {
      next(new RateLimitError());
    },
    keyGenerator: (req) => {
      // Use user ID if available, otherwise fallback to IP
      return (req.user && req.user.userId) ? req.user.userId : (req.ip || 'unknown');
    }
  });
};
`,
  'src/middleware/validate.middleware.ts': `import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../shared/errors/ValidationError';

export const validateMiddleware = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error.format()));
      } else {
        next(error);
      }
    }
  };
};
`,
  'src/middleware/error.middleware.ts': `import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError';
import { logger } from '../shared/utils/logger';

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    if (err.statusCode === 500) {
      logger.error('AppError (500)', { err });
    }
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId: req.id,
        timestamp: new Date().toISOString(),
        details: err.details || []
      }
    });
  }

  logger.error('Unhandled Exception', { err });
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      requestId: req.id,
      timestamp: new Date().toISOString(),
      details: []
    }
  });
};

export const notFoundMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      requestId: req.id,
      timestamp: new Date().toISOString(),
      details: []
    }
  });
};
`,
  'src/middleware/requestId.middleware.ts': `import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const id = uuidv4();
  req.id = id;
  res.setHeader('X-Request-ID', id);
  next();
};
`,
  'src/middleware/internalAuth.middleware.ts': `import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/UnauthorizedError';
import { logger } from '../shared/utils/logger';

export const internalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-internal-token'];
  if (!token || typeof token !== 'string') {
    logger.warn('Internal webhook attempt without token', { ip: req.ip });
    return next(new UnauthorizedError('Missing internal token'));
  }

  try {
    const expected = Buffer.from(env.INTERNAL_API_SECRET);
    const provided = Buffer.from(token);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      throw new Error('Mismatch');
    }
    next();
  } catch (err) {
    logger.warn('Invalid internal token attempt', { ip: req.ip });
    next(new UnauthorizedError('Invalid internal token'));
  }
};
`,
  'src/modules/candidate-profile/candidate-profile.events.ts': `export const PROFILE_EVENTS = {
  PROFILE_CREATED:       "profile.created",
  PROFILE_UPDATED:       "profile.updated",
  PROFILE_DELETED:       "profile.deleted",
  SKILLS_UPDATED:        "profile.skills.updated",
  CAREER_INTENT_UPDATED: "profile.career-intent.updated",
  RESUME_UPLOADED:       "profile.resume.uploaded",
  RESUME_PARSED:         "profile.resume.parsed",
  RESUME_CONFIRMED:      "profile.resume.confirmed",
  PRIVACY_CHANGED:       "profile.privacy.changed",
  COMPLETENESS_CHANGED:  "profile.completeness.changed",
  GDPR_DELETION_QUEUED:  "profile.gdpr-deletion.queued",
} as const;
`,
};

// ... Wait, this script generates static content but to avoid missing any requested files out of 50+, 
// I should use AI logic to write the files directly, or dynamically generate them.
// Let's create a robust script.
console.log('Using script approach to build up files.');
