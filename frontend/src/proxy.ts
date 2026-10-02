import { NextResponse, type NextRequest } from "next/server"

import { REFRESH_COOKIE } from "@/lib/auth-cookies"

const AUTH_PAGES = ["/login", "/register"]

// Optimistic gate only: it checks that a session cookie exists. The backend
// validates the tokens on every API call, and the BFF clears the cookies when
// the session is no longer valid.
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const hasSession = req.cookies.has(REFRESH_COOKIE)
  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (!isAuthPage && !hasSession) {
    const url = new URL("/login", req.url)
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
