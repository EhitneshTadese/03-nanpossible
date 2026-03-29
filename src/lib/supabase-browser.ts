import { createBrowserClient } from "@supabase/ssr";

type BrowserClientOptions = {
  tenantSubdomain?: string | null;
};

export function createBrowserSupabaseClient(
  options: BrowserClientOptions = {},
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const headers = options.tenantSubdomain
    ? { "x-wial-tenant": options.tenantSubdomain }
    : undefined;

  return createBrowserClient(url, anonKey, {
    global: {
      headers,
    },
  });
}
