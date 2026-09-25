import { createMeta, type PaginationMeta } from './api-response';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface SortableQuery {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function getPagination(query: PaginationQuery): { skip: number; take: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  return { skip: (page - 1) * limit, take: limit };
}

export function getSort(query: SortableQuery): Record<string, 'asc' | 'desc'> | undefined {
  const { sortBy, sortOrder } = query;
  if (!sortBy) return undefined;
  return { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };
}

export function formatPagination(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return createMeta(page, limit, total);
}