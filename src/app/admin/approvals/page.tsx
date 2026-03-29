import { AccountPageShell } from "@/components/account-page-shell";
import { CoachApprovalQueue } from "@/components/coach-approval-queue";
import { requireAccountViewer } from "@/lib/auth";
import { listPendingCoaches } from "@/lib/coaches";
import {
  approveCoachAction,
  rejectCoachAction,
} from "@/app/dashboard/coaches/actions";

type AdminApprovalsPageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
};

function getNotice(notice?: string) {
  switch (notice) {
    case "approved":
      return "Coach approved, embedding regenerated, and public pages revalidated.";
    case "approved-no-embedding":
      return "Coach approved, but embedding regeneration failed. The profile is live without a fresh vector.";
    case "rejected":
      return "Coach changes rejected and notification sent.";
    default:
      return null;
  }
}

function getError(error?: string) {
  switch (error) {
    case "missing-config":
      return "The Supabase service-role configuration is missing.";
    case "coach-missing":
      return "Coach record could not be found.";
    case "scope-denied":
      return "This coach is outside your approval scope.";
    case "approve-failed":
      return "WIAL could not approve this coach.";
    case "reject-failed":
      return "WIAL could not save the rejection.";
    case "reason-required":
      return "Add a rejection reason before rejecting a profile.";
    case "resend-missing":
      return "Configure RESEND_API_KEY to send rejection emails.";
    case "email-failed":
      return "The rejection was saved, but WIAL could not send the email.";
    default:
      return null;
  }
}

export default async function AdminApprovalsPage({
  searchParams,
}: AdminApprovalsPageProps) {
  await requireAccountViewer("/admin/approvals", ["platform_admin"]);
  const [params, coaches] = await Promise.all([
    searchParams,
    listPendingCoaches({ limit: 100 }),
  ]);

  return (
    <AccountPageShell
      badge="Global review queue"
      description="Platform admins can review every pending coach profile across chapters, publish approved submissions, and trigger fresh embeddings for AI search."
      eyebrow="Admin workspace"
      title="Coach approvals"
    >
      {getNotice(params.notice) ? (
        <div className="account-flash is-success">{getNotice(params.notice)}</div>
      ) : null}
      {getError(params.error) ? (
        <div className="account-flash is-error">{getError(params.error)}</div>
      ) : null}

      {!process.env.RESEND_API_KEY ? (
        <div className="account-flash is-error">
          Rejection email is disabled until <code>RESEND_API_KEY</code> is configured.
        </div>
      ) : null}

      <CoachApprovalQueue
        approveAction={approveCoachAction}
        canReject={Boolean(process.env.RESEND_API_KEY)}
        coaches={coaches}
        emptyMessage="No pending coach submissions are waiting across the WIAL network."
        redirectTo="/admin/approvals"
        rejectAction={rejectCoachAction}
      />
    </AccountPageShell>
  );
}
