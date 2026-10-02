import { NextResponse, type NextRequest } from "next/server"

import { REFRESH_COOKIE } from "@/lib/auth-cookies"
import { callBackend, clearAuthCookies } from "@/lib/server/backend"

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
  if (refreshToken) {
    // The backend always answers 200 here; a failure only means the session
    // could not be revoked server-side, so the cookies are cleared regardless.
    await callBackend("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    })
  }

  const res = NextResponse.json({ status: 200, message: "Success", data: null })
  clearAuthCookies(res)
  return res
}
