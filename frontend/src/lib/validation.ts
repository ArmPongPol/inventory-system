import { z } from "zod"

// Mirrors the backend DTO rules so most mistakes are caught before a request.

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character")

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(320)
  .regex(
    /^[a-z0-9._-]+$/,
    'Username may only contain letters, digits, ".", "_" and "-"'
  )

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email").max(320)

export const nameSchema = (label: string) =>
  z.string().trim().min(1, `${label} is required`).max(100)

const DECIMAL = /^\d{1,13}(\.\d{1,4})?$/

/**
 * Quantities are typed as strings in forms and converted with Number() on
 * submit. At most 4 decimals and 1e13, like the backend's numeric(18,4).
 */
export function quantitySchema({ allowZero = false } = {}) {
  return z
    .string()
    .trim()
    .min(1, "Required")
    .regex(DECIMAL, "Use a number with at most 4 decimals")
    .refine((v) => allowZero || Number(v) > 0, "Must be greater than 0")
}

export const optionalText = (max: number) =>
  z.string().trim().max(max, `At most ${max} characters`)

export const uuidSchema = (label: string) =>
  z.string().uuid(`Select a ${label.toLowerCase()}`)

/** Drops empty strings so optional fields are omitted from the request body. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined)
  ) as Partial<T>
}
