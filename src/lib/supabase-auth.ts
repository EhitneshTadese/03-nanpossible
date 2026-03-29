import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type AuthClientOptions = {
  tenantSubdomain?: string | null;
};

function getSupabaseAuthEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

function getGlobalHeaders(tenantSubdomain?: string | null) {
  if (!tenantSubdomain) {
    return undefined;
  }

  return {
    "x-wial-tenant": tenantSubdomain,
  };
}

export function hasSupabaseAuthConfig() {
  return getSupabaseAuthEnv() !== null;
}

export function createBrowserSupabaseClient(
  options: AuthClientOptions = {},
) {
  const env = getSupabaseAuthEnv();

  if (!env) {
    return null;
  }

  return createBrowserClient(env.url, env.anonKey, {
    global: {
      headers: getGlobalHeaders(options.tenantSubdomain),
    },
  });
}

export async function createServerSupabaseAuthClient(
  options: AuthClientOptions = {},
) {
  const env = getSupabaseAuthEnv();

  if (!env) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    global: {
      headers: getGlobalHeaders(options.tenantSubdomain),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options: cookieOptions } of cookiesToSet) {
            cookieStore.set(name, value, cookieOptions);
          }
        } catch {
          // Server components can read cookies but may not be allowed to write them.
        }
      },
    },
  });
}
