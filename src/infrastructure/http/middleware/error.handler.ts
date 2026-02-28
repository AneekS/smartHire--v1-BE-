import type { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { env } from '../../../config/env';
import { AppError, ValidationError as AppValidationError } from '../../../shared/errors';

export function errorHandler(
  error: Error & { statusCode?: number; validation?: unknown },
  request: FastifyRequest,
  reply: FastifyReply
) {
  const log = (request as any).log;

  if (error instanceof AppError) {
    log.warn({ err: error, statusCode: error.statusCode }, error.message);
    return (reply as any).status(error.statusCode ?? 500).send({
      status: 'error',
      message: error.message,
      ...(error instanceof AppValidationError && error.errors && { errors: error.errors }),
    });
  }

  if (error.validation) {
    return (reply as any).status(400).send({
      status: 'error',
      message: 'Validation failed',
      errors: error.validation,
    });
  }

  if (error instanceof ZodError) {
    return (reply as any).status(400).send({
      status: 'error',
      message: 'Validation failed',
      errors: error.flatten().fieldErrors,
    });
  }

  if (log) log.error({ err: error }, 'Unexpected error');

  const message =
    env.NODE_ENV === 'production' ? 'Internal server error' : (error.message ?? 'Unknown error');

  return (reply as any).status(error.statusCode ?? 500).send({
    status: 'error',
    message,
  });
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
