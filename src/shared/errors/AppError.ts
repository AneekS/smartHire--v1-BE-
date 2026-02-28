export class AppError extends Error {
  constructor(message: string, public code: string = 'INTERNAL_ERROR', public statusCode: number = 500, public details?: any) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}