import { NextRequest, NextResponse } from "next/server";
import { isValidPassword } from "./lib/isValidPassword";

// Middleware
export async function middleware(req: NextRequest) {
  if ((await isAuthenticated(req)) === false) {
    return new NextResponse("Unauthorised", {
      status: 401,
      headers: { "WWW-Authenticate": "Basic" },
    });
  }
}

// Check Authentication
export async function isAuthenticated(req: NextRequest) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");

  if (authHeader == null) return false;

  const [username, password] = Buffer.from(authHeader.split(" ")[1], "base64")
    .toString()
    .split(":");
  return (
    username === process.env.ADMIN_USERNAME &&
    isValidPassword(password, process.env.HASHED_ADMIN_PASSWORD as string)
  );
}

// Middleware config for route checking
export const config = {
  matcher: "/admin/:path*",
};
