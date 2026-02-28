import { AppError } from './AppError';
export class ForbiddenError extends AppError { constructor(msg='Forbidden') { super(msg, 'FORBIDDEN', 403); } }