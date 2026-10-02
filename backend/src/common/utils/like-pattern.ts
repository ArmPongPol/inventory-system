/**
 * A "contains" pattern for LIKE/ILIKE with the user's own %, _ and \ escaped,
 * so a search for "50%" matches that text instead of acting as a wildcard.
 */
export function containsPattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
