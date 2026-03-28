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
      <section className="site-panel rounded-[2rem] p-7 md:p-9">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="eyebrow">{eyebrow}</span>
            <div className="space-y-3">
              <h1 className="font-display text-4xl leading-none tracking-[-0.05em] text-teal-deep md:text-6xl">
                {title}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-foreground/78">
                {description}
              </p>
            </div>
          </div>
          <div className="account-status-card">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/45">
              Phase status
            </p>
            <p className="mt-3 text-lg font-semibold text-teal-deep">{badge}</p>
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
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_320px]">
        <section className="site-panel rounded-[2rem] p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            What this route will own
          </p>
          <div className="mt-5 grid gap-3">
            {bullets.map((bullet) => (
              <article className="feature-card rounded-[1.35rem]" key={bullet}>
                <p className="text-base font-semibold text-teal-deep">{bullet}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="site-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
            Current state
          </p>
          <h2 className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
            {focusLabel}
          </h2>
          <p className="mt-4 text-base leading-7 text-foreground/75">
            This route is intentionally live as a navigable placeholder so role
            permissions, sidebar behavior, and tenant-aware account routing can
            be validated before the deeper business workflow lands.
          </p>
        </aside>
      </div>
    </AccountPageShell>
  );
}
