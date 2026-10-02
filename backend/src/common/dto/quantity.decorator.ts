import { applyDecorators } from '@nestjs/common';
import { IsNumber, IsPositive, Max, Min } from 'class-validator';

// Quantities are numeric(18,4) columns: up to 14 integer digits and 4 decimals.
// The cap keeps them well inside both that and the exact JS number range.
// Values are passed to SQL as strings and all arithmetic happens there.
export const MAX_QUANTITY = 1e13;

const NUMBER_OPTIONS = {
  allowNaN: false,
  allowInfinity: false,
  maxDecimalPlaces: 4,
};

/** A quantity greater than zero, at most 4 decimal places. */
export const IsQuantity = () =>
  applyDecorators(IsNumber(NUMBER_OPTIONS), IsPositive(), Max(MAX_QUANTITY));

/** A quantity of zero or more, at most 4 decimal places. */
export const IsNonNegativeQuantity = () =>
  applyDecorators(IsNumber(NUMBER_OPTIONS), Min(0), Max(MAX_QUANTITY));
