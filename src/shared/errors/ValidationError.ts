import { AppError } from './AppError';
export class ValidationError extends AppError { constructor(details:any, msg='Validation error') { super(msg, 'VALIDATION_ERROR', 400, details); } }