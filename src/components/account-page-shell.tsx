import type { ReactNode } from "react";

type AccountPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  children: ReactNode;
};

export function AccountPageShell({
  eyebrow,
  title,
  description,
  badge,
  children,
}: AccountPageShellProps) {
  return (
    <div className="space-y-5">
     <section className="site-panel rounded-[2rem] p-5 md:p-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-2">
            <span className="eyebrow">{eyebrow}</span>
            <div className="space-y-1">
             <h1 className="font-display text-3xl leading-none tracking-[-0.05em] text-teal-deep md:text-4xl">
                {title}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-foreground/78">
                {description}
              </p>
            </div>
          </div>
          <div className="account-status-card">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/45">
              Phase status
            </p>
            <p className="mt-2 text-base font-semibold text-teal-deep">{badge}</p>
          </div>
        </div>
      </section>

      {children}
    </div>
  );
}

type AccountPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  focusLabel: string;
  bullets: string[];
};

export function AccountPlaceholder({
  eyebrow,
  title,
  description,
  focusLabel,
  bullets,
}: AccountPlaceholderProps) {
  return (
    <AccountPageShell
      badge="Phase 1 placeholder"
      description={description}
      eyebrow={eyebrow}
      title={title}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_300px]">
  <section className="site-panel rounded-[1.75rem] p-5">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
      What this route will own
    </p>
    <ul className="mt-3 space-y-2">
      {bullets.map((bullet) => (
        <li key={bullet} className="flex items-start gap-2.5 text-sm leading-6 text-foreground/75">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          {bullet}
        </li>
      ))}
    </ul>
  </section>

  <aside className="site-panel rounded-[1.75rem] p-5">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
      Current state
    </p>
    <h2 className="mt-2 font-display text-2xl leading-none tracking-[-0.04em] text-teal-deep">
      {focusLabel}
    </h2>
    <p className="mt-3 text-sm leading-6 text-foreground/72">
      Live placeholder for role permissions and sidebar routing validation.
    </p>
  </aside>
</div>
    </AccountPageShell>
  );
}
