import { AccountPageShell } from "@/components/account-page-shell";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
import { requireAccountViewer } from "@/lib/auth";
import { listAdminUsers } from "@/lib/chapters-admin";
import { listChapters } from "@/lib/tenant";
import type { AdminUserRecord } from "@/lib/types";
import { saveUserRoleAction } from "./actions";

type GlobalUsersPageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
};

function getNotice(notice?: string) {
  switch (notice) {
    case "saved":
      return "User role assignment saved.";
    default:
      return null;
  }
}

function getError(error?: string) {
  switch (error) {
    case "missing-config":
      return "The Supabase service-role configuration is missing.";
    case "invalid-service-key":
      return "The Supabase service-role key in this environment is invalid. Update `SUPABASE_SERVICE_ROLE_KEY` and restart the dev server.";
    case "load-failed":
      return "WIAL could not load the current user access records.";
    case "missing-fields":
      return "Choose a user and a role before saving.";
    case "invalid-role":
      return "Select a valid WIAL role.";
    case "user-not-found":
      return "That user record could not be found.";
    case "chapter-required":
      return "Chapter heads must have a primary chapter.";
    case "assigned-chapters-required":
      return "Content creators must be assigned to at least one chapter.";
    case "invalid-chapter":
    case "invalid-chapters":
      return "One or more selected chapters are no longer valid.";
    case "self-demotion-forbidden":
      return "You cannot remove your own platform-admin access from this screen.";
    case "last-platform-admin":
      return "At least one platform admin must remain on the system.";
    case "save-failed":
      return "WIAL could not update that user role.";
    default:
      return null;
  }
}

export default async function GlobalUsersPage({
  searchParams,
}: GlobalUsersPageProps) {
  const viewer = await requireAccountViewer("/admin/global/users", ["platform_admin"]);
  const params = await searchParams;
  const chapters = await listChapters();

  let users: AdminUserRecord[] = [];
  let loadError: string | null = null;

  try {
    users = await listAdminUsers();
  } catch (error) {
    loadError =
      error instanceof Error &&
      (error.message === "missing-config" || error.message === "invalid-service-key")
        ? error.message
        : "load-failed";
  }

  const platformAdminCount = users.filter((user) => user.role === "platform_admin").length;
  const chapterAdminCount = users.filter((user) => user.role === "chapter_admin").length;
  const contentCreatorCount = users.filter((user) => user.role === "content_creator").length;

  return (
    <AccountPageShell
      badge="Users & roles"
      description="Review every account, set the single primary WIAL role, and control chapter scope for coaches, chapter heads, and content creators."
      eyebrow="Platform admin"
      title="Users & roles"
    >
      {getNotice(params.notice) ? (
        <div className="account-flash is-success">{getNotice(params.notice)}</div>
      ) : null}
      {getError(loadError ?? params.error) ? (
        <div className="account-flash is-error">{getError(loadError ?? params.error)}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_340px]">
        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Directory</p>
              <h2 className="mt-3 font-display text-3xl text-teal-deep">
                {users.length} user accounts
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-foreground/68">
              Each user keeps one primary role. Primary chapter access applies to chapter heads and coaches. Assigned chapters apply only to content creators.
            </p>
          </div>

          {loadError ? null : (
            <UserRoleManager
              action={saveUserRoleAction}
              chapters={chapters}
              currentUserId={viewer.id}
              users={users}
            />
          )}
        </section>

        <aside className="site-panel rounded-[2rem] p-6">
          <p className="eyebrow">Access summary</p>
          <div className="mt-4 grid gap-3">
            <article className="feature-card rounded-[1.35rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Platform admins
              </p>
              <p className="mt-3 font-display text-4xl text-teal-deep">{platformAdminCount}</p>
            </article>
            <article className="feature-card rounded-[1.35rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Chapter heads
              </p>
              <p className="mt-3 font-display text-4xl text-teal-deep">{chapterAdminCount}</p>
            </article>
            <article className="feature-card rounded-[1.35rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Content creators
              </p>
              <p className="mt-3 font-display text-4xl text-teal-deep">{contentCreatorCount}</p>
            </article>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-7 text-foreground/70">
            <p>Role changes clear chapter fields that no longer apply to the selected role.</p>
            <p>Content creators can span multiple chapters, but every user still has only one primary role.</p>
            <p>The final platform-admin account cannot be demoted from this interface.</p>
          </div>
        </aside>
      </div>
    </AccountPageShell>
  );
}
