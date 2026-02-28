import { AppError } from './AppError';
export class NotFoundError extends AppError { constructor(msg='Not found') { super(msg, 'NOT_FOUND', 404); } }