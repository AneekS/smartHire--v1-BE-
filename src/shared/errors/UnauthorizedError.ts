import { AppError } from './AppError';
export class UnauthorizedError extends AppError { constructor(msg='Unauthorized') { super(msg, 'UNAUTHORIZED', 401); } }