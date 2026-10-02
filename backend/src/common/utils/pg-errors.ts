import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

// https://www.postgresql.org/docs/current/errcodes-appendix.html
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';
// Raised instead of 23503 when deleting a row an ON DELETE RESTRICT key
// still references.
export const PG_RESTRICT_VIOLATION = '23001';

export interface PgError {
  code?: string;
  constraint?: string;
}

/** The Postgres error behind a failed query, or undefined for any other error. */
export function pgErrorOf(error: unknown): PgError | undefined {
  return error instanceof QueryFailedError
    ? (error.driverError as PgError)
    : undefined;
}

/**
 * Rethrows a unique violation as a 409 with the message mapped to its
 * constraint name (or the fallback). Any other error is rethrown unchanged.
 */
export function rethrowUniqueViolation(
  error: unknown,
  messages: Record<string, string>,
  fallback: string,
): never {
  const pg = pgErrorOf(error);
  if (pg?.code === PG_UNIQUE_VIOLATION) {
    throw new ConflictException(messages[pg.constraint ?? ''] ?? fallback);
  }
  throw error;
}
