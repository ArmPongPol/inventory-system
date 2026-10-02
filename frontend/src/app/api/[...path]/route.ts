import type { NextRequest } from "next/server"

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth-cookies"
import {
  callBackend,
  clearAuthCookies,
  errorResponse,
  refreshTokens,
  relay,
  setAuthCookies,
  type AuthTokens,
} from "@/lib/server/backend"

// Token endpoints are handled by the dedicated routes under /api/auth so that
// tokens never travel to the browser.
const BLOCKED = new Set(["auth/login", "auth/refresh", "auth/logout", "auth/register"])

/**
 * Same-origin proxy to the backend. Adds the bearer token from the httpOnly
 * cookie and, when the access token is missing or rejected, rotates the
 * refresh token once and retries.
 */
async function proxy(req: NextRequest, ctx: RouteContext<"/api/[...path]">) {
  const { path } = await ctx.params
  const joined = path.join("/")
  if (BLOCKED.has(joined)) return errorResponse(404, "Not found")

  const target = `/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`
  const method = req.method
  const body = method === "GET" || method === "HEAD" ? undefined : await req.text()
  const requestId = req.headers.get("X-Request-Id")

  let accessToken = req.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
  let rotated: AuthTokens | null = null

  const unauthorized = () => {
    const res = errorResponse(401, "Your session has expired. Please sign in again.")
    clearAuthCookies(res)
    return res
  }

  if (!accessToken) {
    if (!refreshToken) return unauthorized()
    rotated = await refreshTokens(refreshToken)
    if (!rotated) return unauthorized()
    accessToken = rotated.accessToken
  }

  let res = await callBackend(target, { method, body, accessToken, requestId })

  if (res.status === 401 && refreshToken && !rotated) {
    rotated = await refreshTokens(refreshToken)
    if (!rotated) return unauthorized()
    res = await callBackend(target, {
      method,
      body,
      accessToken: rotated.accessToken,
      requestId,
    })
  }

  const out = await relay(res)
  if (res.status === 401) {
    // Still rejected with a fresh token: the account was deactivated or the
    // session revoked.
    clearAuthCookies(out)
  } else if (rotated) {
    setAuthCookies(out, rotated)
  }
  return out
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as PUT,
  proxy as DELETE,
}
