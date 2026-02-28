import { AppError } from './AppError';
export class ConflictError extends AppError { constructor(msg='Conflict') { super(msg, 'CONFLICT', 409); } }