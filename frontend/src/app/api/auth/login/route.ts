import { NextResponse, type NextRequest } from "next/server"

import {
  errorResponse,
  loginWithPassword,
  relay,
  setAuthCookies,
} from "@/lib/server/backend"

export async function POST(req: NextRequest) {
  let body: { identifier?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse(400, "Invalid request body")
  }
  if (typeof body.identifier !== "string" || typeof body.password !== "string") {
    return errorResponse(400, "identifier and password are required")
  }

  const result = await loginWithPassword(
    body.identifier,
    body.password,
    req.headers.get("X-Request-Id")
  )
  if (!result.ok) return relay(result.response)

  const res = NextResponse.json({
    status: 200,
    message: "Success",
    data: result.user,
  })
  setAuthCookies(res, result.tokens)
  return res
}
