import type { CoachRecord } from "@/lib/types";
import { formatCoachLocation, getCertificationBadgeTone } from "@/lib/coaches";

type CoachApprovalQueueProps = {
  coaches: CoachRecord[];
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
  redirectTo: string;
  canReject: boolean;
  emptyMessage: string;
};

function truncateBio(text: string | null, maxLength = 220) {
  if (!text) {
    return "No bio submitted yet.";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function CoachApprovalQueue({
  coaches,
  approveAction,
  rejectAction,
  redirectTo,
  canReject,
  emptyMessage,
}: CoachApprovalQueueProps) {
  if (!coaches.length) {
    return (
      <section className="site-panel rounded-[2rem] px-6 py-12 text-center">
        <h2 className="font-display text-3xl tracking-[-0.04em] text-teal-deep">
          Queue is clear
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-foreground/72">
          {emptyMessage}
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {coaches.map((coach) => (
        <article className="site-panel rounded-[2rem] p-6" key={coach.id}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
                  {coach.name}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${getCertificationBadgeTone(coach.certLevel)}`}
                >
                  {coach.certLevel ?? "Pending"}
                </span>
                <span className="coach-result-chip">
                  {formatCoachLocation(coach) || "Location pending"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {coach.specializations.map((specialization) => (
                  <span className="coach-pill" key={specialization}>
                    {specialization}
                  </span>
                ))}
              </div>

              <p className="max-w-4xl text-base leading-7 text-foreground/75">
                {truncateBio(coach.bio)}
              </p>

              <div className="grid gap-2 text-sm text-foreground/62 md:grid-cols-2">
                <p>
                  <span className="font-semibold text-teal-deep">Contact:</span>{" "}
                  {coach.email ?? "Email pending"}
                </p>
                <p>
                  <span className="font-semibold text-teal-deep">Updated:</span>{" "}
                  {new Date(coach.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="grid min-w-[290px] gap-3">
              <form action={approveAction}>
                <input name="coachId" type="hidden" value={coach.id} />
                <input name="redirectTo" type="hidden" value={redirectTo} />
                <button className="button-link primary w-full" type="submit">
                  Approve and publish
                </button>
              </form>

              <form action={rejectAction} className="grid gap-3">
                <input name="coachId" type="hidden" value={coach.id} />
                <input name="redirectTo" type="hidden" value={redirectTo} />
                <label className="field-shell">
                  <span className="field-label">Rejection reason</span>
                  <textarea
                    className="field-textarea"
                    disabled={!canReject}
                    name="reason"
                    placeholder={
                      canReject
                        ? "Explain what needs revision before this profile can go live."
                        : "Configure RESEND_API_KEY to enable rejection emails."
                    }
                    rows={4}
                  />
                </label>
                <button
                  className="button-link secondary w-full"
                  disabled={!canReject}
                  type="submit"
                >
                  Reject and notify
                </button>
              </form>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
