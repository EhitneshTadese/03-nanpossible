import { createClient } from "@supabase/supabase-js";

type ClientOptions = {
  tenantSubdomain?: string | null;
};

export function createSupabaseContentClient(options: ClientOptions = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const headers = options.tenantSubdomain
    ? { "x-wial-tenant": options.tenantSubdomain }
    : undefined;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers,
    },
  });
}
