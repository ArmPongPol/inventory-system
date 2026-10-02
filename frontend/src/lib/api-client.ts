import type { ApiEnvelope } from "@/types/api"

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue>

export function toSearch(params?: QueryParams): string {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

let redirecting = false

function redirectToLogin() {
  if (typeof window === "undefined" || redirecting) return
  redirecting = true
  const next = `${window.location.pathname}${window.location.search}`
  // A full page load (not router.push) drops every cached query of the
  // expired session. This runs outside React, so no router is available.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/login?next=${encodeURIComponent(next)}`
}

interface RequestOptions {
  params?: QueryParams
  body?: unknown
  /** Set false for endpoints where 401 means "wrong credentials". */
  redirectOnUnauthorized?: boolean
}

async function request<T>(
  method: string,
  path: string,
  { params, body, redirectOnUnauthorized = true }: RequestOptions = {}
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}${toSearch(params)}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    })
  } catch {
    throw new ApiError(0, "Network error. Check your connection and try again.")
  }

  let envelope: ApiEnvelope<T> | null = null
  try {
    envelope = (await res.json()) as ApiEnvelope<T>
  } catch {
    envelope = null
  }

  if (!res.ok) {
    if (res.status === 401 && redirectOnUnauthorized) redirectToLogin()
    throw new ApiError(
      res.status,
      envelope?.message ?? `Request failed (${res.status})`
    )
  }

  return (envelope?.data ?? null) as T
}

export const api = {
  get: <T>(path: string, params?: QueryParams) =>
    request<T>("GET", path, { params }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">) =>
    request<T>("POST", path, { ...opts, body: body ?? {} }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
  delete: <T = null>(path: string) => request<T>("DELETE", path),
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return "Something went wrong"
}
