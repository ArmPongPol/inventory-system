import "server-only"

import { NextResponse } from "next/server"

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth-cookies"

export const BACKEND_URL = (
  process.env.BACKEND_URL ?? "http://127.0.0.1:3001"
).replace(/\/+$/, "")

// Fallback lifetimes when a token's `exp` claim can't be read.
// They match the backend defaults (JWT_ACCESS_TTL=15m, JWT_REFRESH_TTL=7d).
const ACCESS_FALLBACK_SECONDS = 15 * 60
const REFRESH_FALLBACK_SECONDS = 7 * 24 * 60 * 60

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
}

interface BackendEnvelope<T> {
  status: number
  message: string
  data: T
}

interface CallOptions {
  method?: string
  body?: string
  accessToken?: string
  requestId?: string | null
}

/**
 * Calls the NestJS backend server-to-server. Network failures are turned into
 * a 502 response in the backend's own envelope shape, so callers can relay it.
 */
export async function callBackend(
  path: string,
  { method = "GET", body, accessToken, requestId }: CallOptions = {}
): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" })
  if (body !== undefined && body !== "") {
    headers.set("Content-Type", "application/json")
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
  if (requestId) headers.set("X-Request-Id", requestId)

  try {
    return await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      body: body === "" ? undefined : body,
      cache: "no-store",
    })
  } catch {
    return Response.json(
      {
        status: 502,
        message: "Cannot reach the inventory service. Please try again.",
        data: null,
      },
      { status: 502 }
    )
  }
}

export async function readEnvelope<T>(
  res: Response
): Promise<BackendEnvelope<T> | null> {
  try {
    return (await res.json()) as BackendEnvelope<T>
  } catch {
    return null
  }
}

/** Copies a backend response (status, JSON body, request id) into a NextResponse. */
export async function relay(res: Response): Promise<NextResponse> {
  const text = await res.text()
  const out = new NextResponse(text || null, { status: res.status })
  out.headers.set(
    "Content-Type",
    res.headers.get("Content-Type") ?? "application/json"
  )
  const requestId = res.headers.get("X-Request-Id")
  if (requestId) out.headers.set("X-Request-Id", requestId)
  return out
}

export function errorResponse(status: number, message: string): NextResponse {
  return NextResponse.json({ status, message, data: null }, { status })
}

/** Seconds until the JWT's `exp` claim, or null if it can't be decoded. */
function secondsUntilExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    ) as { exp?: number }
    if (typeof payload.exp !== "number") return null
    return Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
  } catch {
    return null
  }
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
}

export function setAuthCookies(res: NextResponse, tokens: AuthTokens) {
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieBase,
    maxAge: secondsUntilExpiry(tokens.accessToken) ?? ACCESS_FALLBACK_SECONDS,
  })
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieBase,
    maxAge:
      secondsUntilExpiry(tokens.refreshToken) ?? REFRESH_FALLBACK_SECONDS,
  })
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { ...cookieBase, maxAge: 0 })
  res.cookies.set(REFRESH_COOKIE, "", { ...cookieBase, maxAge: 0 })
}

/** Rotates the refresh token. Returns null when the session is no longer valid. */
export async function refreshTokens(
  refreshToken: string
): Promise<AuthTokens | null> {
  const res = await callBackend("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) return null
  const envelope = await readEnvelope<AuthTokens>(res)
  return envelope?.data ?? null
}

/**
 * Logs in against the backend. On success returns the tokens and the current
 * user; on failure returns the backend's error response to relay as is.
 */
export async function loginWithPassword(
  identifier: string,
  password: string,
  requestId?: string | null
): Promise<
  | { ok: true; tokens: AuthTokens; user: unknown }
  | { ok: false; response: Response }
> {
  const loginRes = await callBackend("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
    requestId,
  })
  if (!loginRes.ok) return { ok: false, response: loginRes }

  const tokens = (await readEnvelope<AuthTokens>(loginRes))?.data
  if (!tokens) {
    return {
      ok: false,
      response: Response.json(
        { status: 502, message: "Unexpected login response", data: null },
        { status: 502 }
      ),
    }
  }

  const meRes = await callBackend("/auth/me", {
    accessToken: tokens.accessToken,
    requestId,
  })
  if (!meRes.ok) return { ok: false, response: meRes }
  const user = (await readEnvelope<unknown>(meRes))?.data

  return { ok: true, tokens, user }
}
