// src/lib/validation.ts

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface ValidationError {
  error: string;
  status: 400;
}

/**
 * Validates and parses pagination parameters
 * @param pageStr - page query param (stringified)
 * @param pageSizeStr - pageSize query param (stringified)
 * @returns {PaginationParams | ValidationError}
 */
export function validatePaginationParams(
  pageStr?: string,
  pageSizeStr?: string,
): PaginationParams | ValidationError {
  const DEFAULT_PAGE_SIZE = 24;
  const MAX_PAGE_SIZE = 60;

  // Validate page
  let page = 1;
  if (pageStr) {
    const parsed = parseInt(pageStr, 10);
    if (isNaN(parsed) || parsed < 1) {
      return {
        error: "Invalid page number. Must be an integer >= 1.",
        status: 400,
      };
    }
    page = parsed;
  }

  // Validate pageSize
  let pageSize = DEFAULT_PAGE_SIZE;
  if (pageSizeStr) {
    const parsed = parseInt(pageSizeStr, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > MAX_PAGE_SIZE) {
      return {
        error: `Invalid pageSize. Must be an integer between 1 and ${MAX_PAGE_SIZE}.`,
        status: 400,
      };
    }
    pageSize = parsed;
  }

  return { page, pageSize };
}

/**
 * Sanitizes a string query parameter (trim and optional max length)
 * @param value - query param value
 * @param maxLength - max allowed length (optional)
 * @returns sanitized string or undefined
 */
export function sanitizeStringParam(
  value?: string,
  maxLength?: number,
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (maxLength && trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
}
