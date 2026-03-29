import { NextResponse } from "next/server";
import { createServerSupabaseAuthClient } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseAuthClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login?notice=signed-out", request.url), {
    status: 303,
  });
}
