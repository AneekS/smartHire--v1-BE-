export const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_RESUME_FILES_PER_REQUEST = 1;
export const PARSE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const ALLOWED_RESUME_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
export const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.docx'] as const;
