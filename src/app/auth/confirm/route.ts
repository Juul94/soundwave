import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Handles invite + password-recovery links (token_hash flow) and PKCE codes. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  // Email scanners open links in advance; only use the one-time token after a real click on /auth/accept.
  if (tokenHash && type && searchParams.get("go") !== "1") {
    return NextResponse.redirect(`${origin}/auth/accept${request.nextUrl.search}`);
  }
  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }
  if (!ok) return NextResponse.redirect(`${origin}/login?error=link`);

  if (type === "invite") return NextResponse.redirect(`${origin}/set-password?new=1`);
  const needsPassword = type === "recovery" || !!code;
  return NextResponse.redirect(`${origin}${needsPassword ? "/set-password" : "/"}`);
}
