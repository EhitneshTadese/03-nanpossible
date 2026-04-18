import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentViewer, resolvePostAuthPath } from "@/lib/auth";
import { getDefaultAccountHref } from "@/lib/account";
import { hasSupabaseAuthConfig } from "@/lib/supabase-auth";
import { signInWithPasswordAction } from "./actions";
import { forgotPasswordAction } from "./forgot-password-action";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    notice?: string;
  }>;
};

function getNoticeMessage(notice?: string) {
  switch (notice) {
    case "signed-out":
      return "You have been signed out of the WIAL workspace.";
    case "registration-success":
      return "Registration completed. Sign in with the credentials you just created.";
    case "recovery-sent":
      return "If that email is registered, a password reset link has been sent.";
    default:
      return null;
  }
}

function getErrorMessage(error?: string) {
  switch (error) {
    case "username-required":
      return "Enter your username to sign in.";
    case "password-required":
      return "Enter your password to sign in.";
    case "invalid-credentials":
      return "The username or password was not accepted. Try again.";
    case "missing-config":
      return "Supabase auth is not configured in this environment yet.";
    default:
      return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [viewer, params] = await Promise.all([getCurrentViewer(), searchParams]);

  if (viewer) {
    redirect(getDefaultAccountHref(viewer.role));
  }

  const nextPath = resolvePostAuthPath(params.next);
  const notice = getNoticeMessage(params.notice);
  const error = getErrorMessage(params.error);
  const authReady = hasSupabaseAuthConfig();
  const registerHref = `/register?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="page-frame">
      <div className="site-shell">
        <div className="auth-grid">
          <section className="auth-panel-dark p-7 md:p-10">
            <div className="auth-panel-content">
              <span className="auth-kicker">Credential workspace</span>
              <div className="mt-6 max-w-3xl space-y-5">
                <h1 className="auth-title-dark">
                  Username and password access for every WIAL role.
                </h1>
                <p className="auth-copy-dark">
                  Admins, chapter heads, and coaches all enter through the same
                  sign-in route. Public visitors register separately, then
                  promote their own account inside the WIAL workspace before
                  coach and chapter-head tools unlock.
                </p>
              </div>

              <div className="auth-role-grid">
                {[
                  {
                    title: "Admin",
                    body: "Platform dashboard, chapter oversight, and cross-network controls.",
                  },
                  {
                    title: "Chapter Head",
                    body: "Website content, coach management, and chapter revenue routes.",
                  },
                  {
                    title: "Coach",
                    body: "Certification courses, dues, and self-service account updates.",
                  },
                ].map((card) => (
                  <article className="auth-role-card" key={card.title}>
                    <p className="auth-role-card-title">{card.title}</p>
                    <p className="auth-role-card-body">{card.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="site-panel auth-panel-light p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
              Admin and member sign in
            </p>
            <h2 className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
              Sign in with username and password.
            </h2>
            <p className="mt-4 text-base leading-7 text-foreground/75">
              Use the email tied to your WIAL account as the username. The
              sign-in form intentionally accepts only those two credentials.
            </p>

            {notice ? (
              <div className="account-flash is-success mt-5">{notice}</div>
            ) : null}
            {error ? (
              <div className="account-flash is-error mt-5">{error}</div>
            ) : null}

            <form action={signInWithPasswordAction} className="mt-6 space-y-5">
              <input name="next" type="hidden" value={nextPath} />

              <label className="field-shell">
                <span className="field-label">Username</span>
                <input
                  autoComplete="username"
                  className="field-input"
                  defaultValue=""
                  disabled={!authReady}
                  name="username"
                  placeholder="you@wial.org"
                  required
                  type="text"
                />
              </label>

              <label className="field-shell">
                <span className="field-label">Password</span>
                <input
                  autoComplete="current-password"
                  className="field-input"
                  defaultValue=""
                  disabled={!authReady}
                  name="password"
                  placeholder="Enter your password"
                  required
                  type="password"
                />
              </label>

              <button
                className="button-link primary w-full"
                disabled={!authReady}
                type="submit"
              >
                Sign in
              </button>
            </form>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-foreground/60 hover:text-foreground/90">
                Forgot your password?
              </summary>
              <form action={forgotPasswordAction} className="mt-3 space-y-3">
                <label className="field-shell">
                  <span className="field-label">Email address</span>
                  <input
                    className="field-input"
                    disabled={!authReady}
                    name="email"
                    placeholder="you@wial.org"
                    required
                    type="email"
                  />
                </label>
                <button
                  className="button-link secondary w-full"
                  disabled={!authReady}
                  type="submit"
                >
                  Send reset link
                </button>
              </form>
            </details>

            <div className="auth-register-card mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                Public visitor
              </p>
              <h3 className="mt-3 font-display text-2xl leading-none tracking-[-0.04em] text-teal-deep">
                Need an account?
              </h3>
              <p className="mt-3 text-sm leading-6 text-foreground/72">
                Register a public visitor account, then sign in normally.
                Public visitors can update their own profile immediately and
                register as coaches from inside the account area.
              </p>
              <Link className="button-link secondary mt-5 w-full" href={registerHref}>
                Register
              </Link>
            </div>

            {!authReady ? (
              <p className="mt-4 text-sm leading-6 text-accent">
                Add valid Supabase environment variables to enable live
                sign-in and registration from this environment.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
