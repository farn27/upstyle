/**
 * Pagination Utility
 * Standardized pagination for all list endpoints
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination parameters from request
 * @param {URL} url - Request URL
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePagination(url) {
	const page = Math.max(DEFAULT_PAGE, parseInt(url.searchParams.get('page') || DEFAULT_PAGE, 10));
	const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit') || DEFAULT_LIMIT, 10)));
	const offset = (page - 1) * limit;
	
	return { page, limit, offset };
}

/**
 * Build pagination response metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {{ total: number, page: number, limit: number, totalPages: number, hasNext: boolean, hasPrev: boolean }}
 */
export function buildPaginationMeta(total, page, limit) {
	const totalPages = Math.ceil(total / limit);
	const hasNext = page < totalPages;
	const hasPrev = page > 1;
	
	return {
		total,
		page,
		limit,
		totalPages,
		hasNext,
		hasPrev
	};
}

/**
 * Apply pagination to Drizzle query
 * @param {any} query - Drizzle query builder
 * @param {{ offset: number, limit: number }} pagination - Pagination params
 * @returns {any} Query with pagination applied
 */
export function applyPagination(query, { offset, limit }) {
	return query.limit(limit).offset(offset);
}

/**
 * Create paginated response
 * @param {any[]} data - Data array
 * @param {number} total - Total count
 * @param {{ page: number, limit: number }} pagination - Pagination params
 * @returns {{ success: boolean, data: any[], meta: object }}
 */
export function paginatedResponse(data, total, pagination) {
	const meta = buildPaginationMeta(total, pagination.page, pagination.limit);
	
	return {
		success: true,
		data,
		meta
	};
}

/**
 * Parse cursor-based pagination (for infinite scroll)
 * @param {URL} url - Request URL
 * @returns {{ cursor: string|null, limit: number }}
 */
export function parseCursorPagination(url) {
	const cursor = url.searchParams.get('cursor') || null;
	const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit') || DEFAULT_LIMIT, 10)));
	
	return { cursor, limit };
}

/**
 * Build cursor-based pagination response
 * @param {any[]} data - Data array
 * @param {number} limit - Items per page
 * @param {boolean} hasMore - Whether there are more items
 * @returns {{ success: boolean, data: any[], meta: { cursor: string|null, hasMore: boolean, limit: number } }}
 */
export function cursorPaginatedResponse(data, limit, hasMore) {
	const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;
	
	return {
		success: true,
		data,
		meta: {
			cursor: nextCursor,
			hasMore,
			limit
		}
	};
}
