import { NextResponse, type NextRequest } from "next/server"

import {
  callBackend,
  errorResponse,
  loginWithPassword,
  relay,
  setAuthCookies,
} from "@/lib/server/backend"

// Creates the account, then signs the new user in with the same credentials.
export async function POST(req: NextRequest) {
  const text = await req.text()
  let body: { username?: unknown; password?: unknown }
  try {
    body = JSON.parse(text)
  } catch {
    return errorResponse(400, "Invalid request body")
  }

  const requestId = req.headers.get("X-Request-Id")
  const registerRes = await callBackend("/auth/register", {
    method: "POST",
    body: text,
    requestId,
  })
  if (!registerRes.ok) return relay(registerRes)

  if (typeof body.username !== "string" || typeof body.password !== "string") {
    return relay(registerRes)
  }

  const result = await loginWithPassword(body.username, body.password, requestId)
  if (!result.ok) return relay(result.response)

  const res = NextResponse.json(
    { status: 201, message: "Success", data: result.user },
    { status: 201 }
  )
  setAuthCookies(res, result.tokens)
  return res
}
