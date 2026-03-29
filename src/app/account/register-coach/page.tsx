import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { promoteToCoachAction } from "./actions";

type RegisterCoachPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "migration-missing":
      return "The connected Supabase project is missing the public-visitor progression migration. Apply supabase/migrations/20260328233000_public_visitor_role_progression.sql, then try again.";
    case "missing-config":
      return "Supabase auth is not configured in this environment.";
    case "role-mismatch":
      return "This account is no longer eligible for coach registration from the public-visitor route.";
    case "upgrade-failed":
      return "WIAL could not upgrade this account to coach access. Try again.";
    default:
      return null;
  }
}

export default async function RegisterCoachPage({
  searchParams,
}: RegisterCoachPageProps) {
  const [viewer, params] = await Promise.all([
    requireAccountViewer("/account/register-coach", ["public_visitor"]),
    searchParams,
  ]);
  const error = getErrorMessage(params.error);

  return (
    <AccountPageShell
      badge="Immediate role upgrade"
      description="This account is currently a public visitor profile. Confirm the upgrade to unlock the coach workspace immediately."
      eyebrow="Public visitor workspace"
      title="Register as coach"
    >
      {error ? <div className="account-flash is-error">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_320px]">
        <section className="site-panel rounded-[2rem] p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            What happens next
          </p>
          <div className="mt-5 grid gap-3">
            {[
              "Your role changes from public visitor to coach immediately.",
              "Certification courses and payment dues routes become available right away.",
              "Your existing profile details stay attached to the same account.",
            ].map((item) => (
              <article className="feature-card rounded-[1.35rem]" key={item}>
                <p className="text-base font-semibold text-teal-deep">{item}</p>
              </article>
            ))}
          </div>

          <form action={promoteToCoachAction} className="mt-6">
            <button className="button-link primary" type="submit">
              Register as coach
            </button>
          </form>
        </section>

        <aside className="site-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
            Current access
          </p>
          <h2 className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
            {viewer.name || "Public visitor"}
          </h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
            Public Visitor
          </p>
          <p className="mt-4 text-sm leading-7 text-foreground/72">
            Public visitor accounts can manage their own profile details first,
            then opt into coach access from inside the WIAL account workspace.
          </p>
        </aside>
      </div>
    </AccountPageShell>
  );
}
