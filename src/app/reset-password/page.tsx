"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setReady(true);
        }
      },
    );

    // Check if already authenticated (callback route already exchanged the token)
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Auth is not configured.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="page-frame">
        <div className="site-shell">
          <div className="mx-auto max-w-md py-20">
            <section className="site-panel p-7 md:p-9">
              <h1 className="font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
                Password updated.
              </h1>
              <p className="mt-4 text-base leading-7 text-foreground/75">
                Your password has been changed. You can now sign in with your new
                credentials.
              </p>
              <Link className="button-link primary mt-6 block w-full text-center" href="/login">
                Sign in
              </Link>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-frame">
      <div className="site-shell">
        <div className="mx-auto max-w-md py-20">
          <section className="site-panel p-7 md:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
              Account recovery
            </p>
            <h1 className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
              Set a new password.
            </h1>
            <p className="mt-4 text-base leading-7 text-foreground/75">
              Choose a new password for your WIAL account.
            </p>

            {error && (
              <div className="account-flash is-error mt-5">{error}</div>
            )}

            {!ready && (
              <p className="mt-5 text-sm text-foreground/60">
                Verifying recovery link&hellip;
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="field-shell">
                <span className="field-label">New password</span>
                <input
                  autoComplete="new-password"
                  className="field-input"
                  disabled={!ready || loading}
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  type="password"
                  value={password}
                />
              </label>

              <label className="field-shell">
                <span className="field-label">Confirm password</span>
                <input
                  autoComplete="new-password"
                  className="field-input"
                  disabled={!ready || loading}
                  minLength={8}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  type="password"
                  value={confirmPassword}
                />
              </label>

              <button
                className="button-link primary w-full"
                disabled={!ready || loading}
                type="submit"
              >
                {loading ? "Updating\u2026" : "Update password"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
