import Link from "next/link";
import Image from "next/image";

type WialLogoProps = {
  chapterLabel?: string | null;
};

export function WialLogo({ chapterLabel }: WialLogoProps) {
  return (
    <Link className="inline-flex items-center gap-4" href="/">
      <div className="relative h-10 w-24">
        <Image
          src="/assets/logo.webp"
          alt="WIAL logo"
          fill
          priority
          className="object-contain"
        />
      </div>
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
