import Link from "next/link";

type WialLogoProps = {
  chapterLabel?: string | null;
};

export function WialLogo({ chapterLabel }: WialLogoProps) {
  return (
    <Link className="inline-flex items-center gap-3" href="/">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-teal),var(--color-teal-deep))] text-lg font-bold text-white shadow-[0_18px_38px_rgba(23,53,51,0.18)]">
        W
      </span>
      <span className="flex flex-col">
        <span className="font-display text-[1.35rem] leading-none tracking-[-0.05em] text-teal-deep">
          WIAL
        </span>
        <span className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-foreground/65">
          World Institute for Action Learning
        </span>
        {chapterLabel ? (
          <span className="mt-1 text-sm font-semibold text-accent">
            {chapterLabel}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
