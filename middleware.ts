import { NextResponse, type NextRequest } from "next/server"

const AUTH_PAGES = new Set([
  "/signin",
])

const PROTECTED_PREFIXES = ["/dashboard"]
const REDIRECT_WHEN_AUTHENTICATED = "/dashboard/create-app/all-apps"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get("accessToken")?.value
  const isAuthPage = AUTH_PAGES.has(pathname)
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (isProtectedRoute && !accessToken) {
    const url = request.nextUrl.clone()
    url.pathname = "/signin"
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (!isAuthPage) {
    return NextResponse.next()
  }

  const isAuthenticated = Boolean(accessToken)

  if (!isAuthenticated) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = REDIRECT_WHEN_AUTHENTICATED
  url.search = ""
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/signin", "/dashboard/:path*"],
}

