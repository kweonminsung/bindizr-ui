import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { getNextAuthSecret } from "./lib/db";

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Fetch setup status
  const setupStatusRes = await fetch(`${origin}/api/setup/status`);
  if (!setupStatusRes.ok) {
    return new Response("Failed to check application status.", { status: 500 });
  }
  const { setupComplete, accountEnabled } = await setupStatusRes.json();

  const isSetupPage = pathname.startsWith("/setup");
  const isLoginPage = pathname.startsWith("/login");

  // If setup is not complete, redirect to the setup page
  if (!setupComplete) {
    if (isSetupPage) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  // If setup is complete, prevent access to the setup page
  if (isSetupPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If accounts are not enabled, bypass authentication
  if (!accountEnabled) {
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Handle authentication for all other pages
  const secret = getNextAuthSecret();
  const token = await getToken({ req: request, secret: secret });

  if (isLoginPage) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/zones", "/records", "/settings", "/api/cron"],
  runtime: "nodejs",
};
