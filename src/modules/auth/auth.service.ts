import { createHash } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../infrastructure/db/prisma.client';
import { env } from '../../config/env';
import { UnauthorizedError, ConflictError } from '../../shared/errors';
import type { JWTPayload, AuthTokens } from './auth.types';
import type { SignupInput, LoginInput, RefreshInput } from './auth.schema';

const SALT_ROUNDS = 10;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function issueAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

function issueRefreshToken(candidateId: string): string {
  return jwt.sign(
    { sub: candidateId, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions
  );
}

function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const [, num, unit] = match;
  const n = parseInt(num!, 10);
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * (multipliers[unit!] ?? 60);
}

export async function signup(input: SignupInput): Promise<AuthTokens & { candidateId: string }> {
  const existing = await prisma.candidate.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const candidate = await prisma.candidate.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
    },
  });

  const refreshToken = issueRefreshToken(candidate.id);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      candidateId: candidate.id,
      tokenHash,
      expiresAt,
    },
  });

  const accessToken = issueAccessToken({
    sub: candidate.id,
    role: 'candidate',
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: parseExpiry(env.JWT_EXPIRES_IN),
    candidateId: candidate.id,
  };
}

export async function login(input: LoginInput): Promise<AuthTokens & { candidateId: string }> {
  const candidate = await prisma.candidate.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (!candidate || !candidate.passwordHash) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const valid = await bcrypt.compare(input.password, candidate.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const refreshToken = issueRefreshToken(candidate.id);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      candidateId: candidate.id,
      tokenHash,
      expiresAt,
    },
  });

  const accessToken = issueAccessToken({
    sub: candidate.id,
    role: 'candidate',
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: parseExpiry(env.JWT_EXPIRES_IN),
    candidateId: candidate.id,
  };
}

export async function refreshTokens(input: RefreshInput): Promise<AuthTokens> {
  const hash = hashToken(input.refreshToken);

  const storedToken = await prisma.refreshToken.findFirst({
    where: { tokenHash: hash, isRevoked: false },
    include: { candidate: true },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    if (storedToken) {
      await prisma.refreshToken.updateMany({
        where: { candidateId: storedToken.candidateId },
        data: { isRevoked: true },
      });
    }
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  });

  const newRefreshToken = issueRefreshToken(storedToken.candidateId);
  const newTokenHash = hashToken(newRefreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      candidateId: storedToken.candidateId,
      tokenHash: newTokenHash,
      expiresAt,
    },
  });

  const accessToken = issueAccessToken({
    sub: storedToken.candidateId,
    role: 'candidate',
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: parseExpiry(env.JWT_EXPIRES_IN),
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const hash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash },
    data: { isRevoked: true },
  });
}
