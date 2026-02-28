import { AppError } from './AppError';
export class RateLimitError extends AppError { constructor(msg='Rate limit exceeded') { super(msg, 'RATE_LIMIT_EXCEEDED', 429); } }