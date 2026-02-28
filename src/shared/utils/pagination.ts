export interface CursorPagination { cursor?: string; limit: number; }
export interface PaginatedResult<T> { items: T[]; meta: { limit: number; hasNextPage: boolean; nextCursor: string | null; }; }