/**
 * Unified API response envelope used by the NestJS global interceptor.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error?: string;
  details?: unknown;
  timestamp: string;
  path?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedData<T = unknown> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<PaginatedData<T>> {}

export function createMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}