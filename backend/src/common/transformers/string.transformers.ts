import { TransformFnParams } from 'class-transformer';

// For use with class-transformer's @Transform. Non-string values pass through
// untouched so the validators (@IsString, @IsEmail) still report them.

export const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Emails and usernames are stored lowercased so their unique constraints are
// effectively case-insensitive; every write and lookup must go through this.
export const normalizeEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const normalizeUsername = normalizeEmail;

// SKUs and warehouse codes are stored uppercased so their unique constraints
// are effectively case-insensitive.
export const normalizeCode = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

// Query-string booleans arrive as text; anything other than "true"/"false" is
// left for @IsBoolean to reject.
export const toBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};
