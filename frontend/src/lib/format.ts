import { format, formatDistanceToNow } from "date-fns"

/**
 * Formats a numeric(18,4) string such as "12500.5000" as "12,500.5" without
 * going through a JS float, so large values keep every digit.
 */
export function formatQty(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const raw = String(value).trim()
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(raw)
  if (!match) return raw
  const [, sign, int, frac = ""] = match
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  const trimmed = frac.replace(/0+$/, "")
  return `${sign}${grouped}${trimmed ? `.${trimmed}` : ""}`
}

/** Like formatQty but always shows a sign, for ledger deltas. */
export function formatSignedQty(value: string): string {
  const formatted = formatQty(value)
  return value.startsWith("-") || formatted === "0" ? formatted : `+${formatted}`
}

export function isNegative(value: string | null | undefined): boolean {
  return !!value && value.trim().startsWith("-")
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—"
  return format(new Date(value), "d MMM yyyy")
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  return format(new Date(value), "d MMM yyyy, HH:mm")
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—"
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

export function initials(first?: string, last?: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?"
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
