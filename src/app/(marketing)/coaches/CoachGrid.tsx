import { CoachCard } from "./CoachCard";
import type { CoachRecord } from "@/lib/types";

type CoachGridProps = {
  coaches: CoachRecord[];
  emptyTitle?: string;
  emptyBody?: string;
};

export function CoachGrid({
  coaches,
  emptyTitle = "No coaches found.",
  emptyBody = "Try a broader search or remove filters.",
}: CoachGridProps) {
  if (!coaches.length) {
    return (
      <div className="site-panel rounded-[2rem] px-6 py-12 text-center">
        <h2 className="font-display text-3xl tracking-[-0.04em] text-teal-deep">
          {emptyTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-foreground/72">
          {emptyBody}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {coaches.map((coach) => (
        <CoachCard coach={coach} key={coach.id} />
      ))}
    </div>
  );
}
