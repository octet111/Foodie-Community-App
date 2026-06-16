import { NextResponse } from "next/server";
import { completeAuthFromUrl } from "@/lib/auth-callback";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type");

  const destination =
    type === "recovery" ? "/reset/update" : next;

  const { error } = await completeAuthFromUrl(request);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
