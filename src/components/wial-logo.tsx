import Link from "next/link";
import Image from "next/image";

type WialLogoProps = {
  chapterLabel?: string | null;
};

export function WialLogo({ chapterLabel }: WialLogoProps) {
  return (
    <Link className="inline-flex min-w-0 items-center gap-3 sm:gap-4" href="/">
      <div className="relative h-10 w-20 flex-shrink-0 sm:w-24">
        <Image
          src="/assets/logo.webp"
          alt="WIAL logo"
          fill
          priority
          className="object-contain"
        />
      </div>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-[1.2rem] leading-none tracking-[-0.05em] text-teal-deep sm:text-[1.35rem]">
          WIAL
        </span>
        <span className="mt-0.5 hidden max-w-[12rem] text-[0.68rem] font-semibold uppercase leading-[1.25] tracking-[0.16em] text-foreground/65 sm:block lg:max-w-[15rem] xl:max-w-none">
          World Institute for Action Learning
        </span>
        {chapterLabel ? (
          <span className="mt-1 truncate text-xs font-semibold text-accent sm:text-sm">
            {chapterLabel}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
