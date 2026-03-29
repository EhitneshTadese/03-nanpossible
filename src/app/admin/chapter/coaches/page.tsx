import { AccountPageShell } from "@/components/account-page-shell";
import { CoachApprovalQueue } from "@/components/coach-approval-queue";
import { approveCoachAction, rejectCoachAction } from "@/app/dashboard/coaches/actions";
import { requireAccountViewer } from "@/lib/auth";
import { listPendingCoaches } from "@/lib/coaches";
import { resolveWorkspaceChapter } from "@/lib/chapter-workspace";

type ChapterCoachApprovalsPageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
};

export default async function ChapterCoachApprovalsPage({
  searchParams,
}: ChapterCoachApprovalsPageProps) {
  const viewer = await requireAccountViewer("/admin/chapter/coaches", [
    "platform_admin",
    "chapter_admin",
  ]);
  const chapter = await resolveWorkspaceChapter(viewer);
  const [params, coaches] = await Promise.all([
    searchParams,
    listPendingCoaches({
      chapterId: chapter?.id,
    }),
  ]);

  return (
    <AccountPageShell
      badge="Chapter approvals"
      description="Approve or reject coach directory changes for the active chapter workspace."
      eyebrow="Chapter workspace"
      title="Coach approvals"
    >
      {params.notice ? (
        <div className="account-flash is-success">{params.notice}</div>
      ) : null}
      {params.error ? <div className="account-flash is-error">{params.error}</div> : null}

      <CoachApprovalQueue
        approveAction={approveCoachAction}
        canReject={Boolean(process.env.RESEND_API_KEY)}
        coaches={coaches}
        emptyMessage="No coach submissions are waiting in this chapter."
        redirectTo="/admin/chapter/coaches"
        rejectAction={rejectCoachAction}
      />
    </AccountPageShell>
  );
}
