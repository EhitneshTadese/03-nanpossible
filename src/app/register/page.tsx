import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentViewer, resolvePostAuthPath } from "@/lib/auth";
import { getDefaultAccountHref } from "@/lib/account";
import { hasSupabaseAuthConfig } from "@/lib/supabase-auth";
import { registerPublicVisitorAction } from "./actions";

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "name-required":
      return "Enter a display name for the new account.";
    case "username-required":
      return "Enter a username for the new account.";
    case "username-invalid":
      return "Use a valid email address as the username for registration.";
    case "password-required":
      return "Choose a password for the new account.";
    case "password-too-short":
      return "Passwords must be at least 8 characters long.";
    case "password-mismatch":
      return "The password confirmation did not match.";
    case "account-exists":
      return "An account with that username already exists. Sign in instead.";
    case "missing-config":
      return "Supabase auth is not configured in this environment yet.";
    case "register-failed":
      return "WIAL could not create the account. Try again.";
    default:
      return null;
  }
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const [viewer, params] = await Promise.all([getCurrentViewer(), searchParams]);

  if (viewer) {
    redirect(getDefaultAccountHref(viewer.role));
  }

  const nextPath = resolvePostAuthPath(params.next);
  const error = getErrorMessage(params.error);
  const authReady = hasSupabaseAuthConfig();
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="page-frame">
      <div className="site-shell">
        <div className="auth-grid">
          <section className="site-panel auth-panel-light p-7 md:p-9">
            <span className="eyebrow">Public registration</span>
            <div className="mt-6 max-w-3xl space-y-5">
              <h1 className="font-display text-4xl leading-none tracking-[-0.05em] text-teal-deep md:text-6xl">
                Create a public WIAL account.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-foreground/78">
                This registration path is for public visitors who need a WIAL
                account. New registrations start with coach access. Admin and
                chapter-head permissions are assigned later by WIAL.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                "Profile updates remain self-service.",
                "Certification and dues routes unlock immediately after sign-in.",
                "Higher roles remain admin-managed.",
              ].map((item) => (
                <article className="feature-card rounded-[1.35rem]" key={item}>
                  <p className="text-base font-semibold leading-7 text-teal-deep">
                    {item}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="auth-panel-dark p-6 md:p-7">
            <div className="auth-panel-content">
              <p className="auth-kicker">Register</p>
              <h2 className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-white">
                Start with coach access.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Use an email address as the username. That same username and
                password will be used on the sign-in page.
              </p>

              {error ? (
                <div className="account-flash is-error mt-5">{error}</div>
              ) : null}

              <form action={registerPublicVisitorAction} className="mt-6 space-y-5">
                <input name="next" type="hidden" value={nextPath} />

                <label className="field-shell">
                  <span className="field-label text-slate-300/72">Display name</span>
                  <input
                    className="field-input"
                    defaultValue=""
                    disabled={!authReady}
                    name="displayName"
                    placeholder="Your name"
                    required
                    type="text"
                  />
                </label>

                <label className="field-shell">
                  <span className="field-label text-slate-300/72">Username</span>
                  <input
                    autoComplete="username"
                    className="field-input"
                    defaultValue=""
                    disabled={!authReady}
                    name="username"
                    placeholder="you@example.com"
                    required
                    type="email"
                  />
                </label>

                <label className="field-shell">
                  <span className="field-label text-slate-300/72">Password</span>
                  <input
                    autoComplete="new-password"
                    className="field-input"
                    defaultValue=""
                    disabled={!authReady}
                    name="password"
                    placeholder="Create a password"
                    required
                    type="password"
                  />
                </label>

                <label className="field-shell">
                  <span className="field-label text-slate-300/72">
                    Confirm password
                  </span>
                  <input
                    autoComplete="new-password"
                    className="field-input"
                    defaultValue=""
                    disabled={!authReady}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    required
                    type="password"
                  />
                </label>

                <button
                  className="button-link primary w-full"
                  disabled={!authReady}
                  type="submit"
                >
                  Register account
                </button>
              </form>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Already registered?
                </p>
                <Link className="button-link secondary mt-4 w-full" href={loginHref}>
                  Return to sign in
                </Link>
              </div>

              {!authReady ? (
                <p className="mt-4 text-sm leading-6 text-amber-300">
                  Add valid Supabase environment variables to enable live
                  registration from this environment.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
