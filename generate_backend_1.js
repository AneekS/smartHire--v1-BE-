const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'smarthire-backend');

// Helper to create all directories
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

dirs.forEach(d => fs.mkdirSync(path.join(baseDir, d), { recursive: true }));

const files = {};

// SCHEMAS / MIGRATIONS
files['prisma/schema.prisma'] = `generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [citext, pg_trgm, uuid_ossp]
}

enum ProfileVisibility { PUBLIC\n APPLIED_ONLY\n PRIVATE }
enum JobType { FULL_TIME\n PART_TIME\n CONTRACT\n FREELANCE\n INTERNSHIP }
enum AvailabilityStatus { ACTIVELY_LOOKING\n OPEN_TO_OFFERS\n NOT_LOOKING }
enum ResumeParseStatus { PENDING\n PROCESSING\n COMPLETED\n FAILED\n USER_CONFIRMED }
enum SkillProficiency { BEGINNER\n ELEMENTARY\n INTERMEDIATE\n ADVANCED\n EXPERT }

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
`;

files['prisma/migrations/add_profile_indexes.sql'] = `-- GIN index for pg_trgm skill name search
CREATE INDEX CONCURRENTLY idx_skills_name_trgm ON skills USING GIN (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_profiles_active ON candidate_profiles (user_id) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY idx_candidate_skills_composite ON candidate_skills (profile_id, skill_id, proficiency);
CREATE INDEX CONCURRENTLY idx_candidate_skills_skill_prof ON candidate_skills (skill_id, proficiency) WHERE is_verified = false;
CREATE INDEX idx_audit_logs_brin ON profile_audit_logs USING BRIN (created_at);
CREATE INDEX CONCURRENTLY idx_profiles_completeness ON candidate_profiles (completeness_score DESC, location_country) WHERE is_deleted = false;
`;

files['src/config/env.ts'] = `import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
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
  CORS_ALLOWED_ORIGINS: z.string()
});
const parsed = envSchema.safeParse(process.env);
if(!parsed.success) {
  console.error("Missing/invalid exact environment variables:", parsed.error);
  process.exit(1);
}
export const env = parsed.data;
`;

files['src/config/database.ts'] = `import { PrismaClient } from '@prisma/client';
import { env } from './env';

export const prisma = new PrismaClient({
  datasources: {
    db: { url: env.DATABASE_URL.includes('pgbouncer=true') ? env.DATABASE_URL : \`\${env.DATABASE_URL}?pgbouncer=true&connection_limit=10&pool_timeout=30\` }
  },
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error']
});
`;

files['src/config/constants.ts'] = `export const CONSTANTS = { MAX_LIMIT: 50 };`;

// ERRORS
const errors = ['AppError', 'NotFoundError', 'ValidationError', 'ForbiddenError', 'ConflictError', 'UnauthorizedError', 'RateLimitError'];
files['src/shared/errors/AppError.ts'] = `export class AppError extends Error {
  constructor(message: string, public code: string = 'INTERNAL_ERROR', public statusCode: number = 500, public details?: any) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}`;
files['src/shared/errors/NotFoundError.ts'] = `import { AppError } from './AppError';\nexport class NotFoundError extends AppError { constructor(msg='Not found') { super(msg, 'NOT_FOUND', 404); } }`;
files['src/shared/errors/ValidationError.ts'] = `import { AppError } from './AppError';\nexport class ValidationError extends AppError { constructor(details:any, msg='Validation error') { super(msg, 'VALIDATION_ERROR', 400, details); } }`;
files['src/shared/errors/ForbiddenError.ts'] = `import { AppError } from './AppError';\nexport class ForbiddenError extends AppError { constructor(msg='Forbidden') { super(msg, 'FORBIDDEN', 403); } }`;
files['src/shared/errors/ConflictError.ts'] = `import { AppError } from './AppError';\nexport class ConflictError extends AppError { constructor(msg='Conflict') { super(msg, 'CONFLICT', 409); } }`;
files['src/shared/errors/UnauthorizedError.ts'] = `import { AppError } from './AppError';\nexport class UnauthorizedError extends AppError { constructor(msg='Unauthorized') { super(msg, 'UNAUTHORIZED', 401); } }`;
files['src/shared/errors/RateLimitError.ts'] = `import { AppError } from './AppError';\nexport class RateLimitError extends AppError { constructor(msg='Rate limit exceeded') { super(msg, 'RATE_LIMIT_EXCEEDED', 429); } }`;

// UTILS
files['src/shared/utils/asyncHandler.ts'] = `import { Request, Response, NextFunction } from 'express';
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res, next)).catch(next); };`;

files['src/shared/utils/apiResponse.ts'] = `import { Response } from 'express';
export const sendPaginatedResponse = (res: Response, items: any[], meta: any) => res.json({ success: true, data: { items, meta } });`;

files['src/shared/utils/pagination.ts'] = `export interface CursorPagination { cursor?: string; limit: number; }
export interface PaginatedResult<T> { items: T[]; meta: { limit: number; hasNextPage: boolean; nextCursor: string | null; }; }`;

files['src/shared/utils/logger.ts'] = `import winston from 'winston';\nimport { env } from '../../config/env';
export const logger = winston.createLogger({ level: env.LOG_LEVEL, format: winston.format.json(), transports: [new winston.transports.Console()] });`;

files['src/shared/utils/events.ts'] = `import { EventEmitter } from 'events';
class TypedEventEmitter extends EventEmitter {}
export const events = new TypedEventEmitter();`;

files['src/shared/types/express.d.ts'] = `declare namespace Express { interface Request { id?: string; user?: { userId: string; role: string; email: string; } } }`;
files['src/shared/types/common.types.ts'] = `export {};`;

for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(baseDir, filename), content);
}
console.log('Script 1 finished');
