import { createServerClient } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  const errorDescription = url.searchParams.get("error_description");
  const canonicalOrigin = url.hostname === "localhost" || url.hostname === "127.0.0.1" ? "http://127.0.0.1:3001" : url.origin;
  const redirectTo = new URL("/", canonicalOrigin);

  if (error || errorCode) {
    redirectTo.searchParams.set("auth_error", errorCode || error || "auth_failed");
    if (errorDescription) redirectTo.searchParams.set("auth_error_description", errorDescription);
    return NextResponse.redirect(redirectTo);
  }

  if (!code) {
    redirectTo.searchParams.set("auth_error", "missing_code");
    return NextResponse.redirect(redirectTo);
  }

  const response = NextResponse.redirect(redirectTo);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirectTo.searchParams.set("auth_error", "supabase_not_configured");
    return NextResponse.redirect(redirectTo);
  }

  const requestCookieNames = request.cookies.getAll().map((cookie) => cookie.name);
  console.info("[auth-callback] pkceVerifierCookiePresent", requestCookieNames.some((name) => name.includes("code-verifier")));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const exchange = await supabase.auth.exchangeCodeForSession(code);
  if (exchange.error) {
    redirectTo.searchParams.set("auth_error", "exchange_failed");
    redirectTo.searchParams.set("auth_error_description", exchange.error.message);
    return NextResponse.redirect(redirectTo);
  }

  const session = await supabase.auth.getSession();
  if (!session.data.session?.user) {
    redirectTo.searchParams.set("auth_error", "session_missing");
    return NextResponse.redirect(redirectTo);
  }

  return response;
}
