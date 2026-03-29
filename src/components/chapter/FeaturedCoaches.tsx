import Link from "next/link";
import { CoachCard } from "@/app/(marketing)/coaches/CoachCard";
import type { CoachRecord } from "@/lib/types";

export function FeaturedCoaches({ coaches }: { coaches: CoachRecord[] }) {
  return (
    <section className="site-panel rounded-[2rem] p-6 md:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Featured coaches</p>
          <h2 className="mt-3 font-display text-3xl text-teal-deep">
            Chapter coach roster
          </h2>
        </div>
        <Link className="button-link secondary" href="/coaches">
          View directory
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {coaches.length ? (
          coaches.map((coach) => <CoachCard coach={coach} key={coach.id} />)
        ) : (
          <article className="feature-card rounded-[1.35rem]">
            <p className="text-base leading-7 text-foreground/72">
              Approved coaches for this chapter will appear here once their directory profiles are live.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
