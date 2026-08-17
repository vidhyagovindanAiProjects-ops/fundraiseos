import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (!host.startsWith("localhost")) return NextResponse.next();

  const url = request.nextUrl;
  const port = host.split(":")[1];
  const target = `http://127.0.0.1${port ? `:${port}` : ""}${url.pathname}${url.search}`;
  return NextResponse.redirect(target);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
