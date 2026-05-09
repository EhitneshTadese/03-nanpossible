"use client";

import { useState } from "react";
import type { AdminUserRecord, AppRole, ChapterRecord } from "@/lib/types";

type UserRoleManagerProps = {
  action: (formData: FormData) => void | Promise<void>;
  chapters: Array<Pick<ChapterRecord, "id" | "name" | "status">>;
  currentUserId: string;
  users: AdminUserRecord[];
};

const roleOptions: Array<{ value: AppRole; label: string }> = [
  { value: "platform_admin", label: "Platform admin" },
  { value: "chapter_admin", label: "Chapter head" },
  { value: "content_creator", label: "Content creator" },
  { value: "coach", label: "Coach" },
  { value: "public_visitor", label: "Public visitor" },
];

function getRoleLabel(role: AppRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

function formatAccessSummary(options: {
  assignedChapters: string[];
  chapterId: string;
  chapters: UserRoleManagerProps["chapters"];
  role: AppRole;
}) {
  if (options.role === "content_creator") {
    const assignedNames = options.assignedChapters
      .map((chapterId) => options.chapters.find((chapter) => chapter.id === chapterId)?.name)
      .filter((value): value is string => Boolean(value));

    return assignedNames.length
      ? `Assigned chapters: ${assignedNames.join(", ")}`
      : "Assigned chapters: none";
  }

  if (options.chapterId) {
    const chapterName = options.chapters.find((chapter) => chapter.id === options.chapterId)?.name;

    if (chapterName) {
      return `Primary chapter: ${chapterName}`;
    }
  }

  return "Global access only";
}

export function UserRoleManager({
  action,
  chapters,
  currentUserId,
  users,
}: UserRoleManagerProps) {
  if (!users.length) {
    return (
      <section className="site-panel rounded-[2rem] px-6 py-12 text-center">
        <p className="text-lg font-semibold text-teal-deep">No users are available to manage yet.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {users.map((user) => (
        <UserRoleCard
          action={action}
          chapters={chapters}
          currentUserId={currentUserId}
          key={user.id}
          user={user}
        />
      ))}
    </div>
  );
}

function UserRoleCard({
  action,
  chapters,
  currentUserId,
  user,
}: {
  action: UserRoleManagerProps["action"];
  chapters: UserRoleManagerProps["chapters"];
  currentUserId: string;
  user: AdminUserRecord;
}) {
  const [role, setRole] = useState<AppRole>(user.role);
  const [chapterId, setChapterId] = useState(user.chapterId ?? "");
  const [assignedChapters, setAssignedChapters] = useState<string[]>(user.assignedChapters);
  const isSelf = user.id === currentUserId;
  const needsPrimaryChapter = role === "chapter_admin" || role === "coach";
  const needsAssignedChapters = role === "content_creator";

  return (
    <article className="feature-card rounded-[1.6rem]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-teal-deep">{user.name}</h2>
            <span className="inline-flex rounded-full border border-line/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/60">
              {getRoleLabel(role)}
            </span>
          </div>
          <p className="text-sm text-foreground/72">{user.email}</p>
          <p className="text-sm text-foreground/58">
            {formatAccessSummary({
              assignedChapters,
              chapterId,
              chapters,
              role,
            })}
          </p>
        </div>

        {isSelf ? (
          <span className="inline-flex rounded-full border border-line/70 bg-[rgba(255,250,242,0.9)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Your account
          </span>
        ) : null}
      </div>

      <form action={action} className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <input name="userId" type="hidden" value={user.id} />

        <label className="field-shell">
          <span className="field-label">Role</span>
          <select
            className="field-input"
            disabled={isSelf}
            name="role"
            onChange={(event) => setRole(event.target.value as AppRole)}
            value={role}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {needsPrimaryChapter ? (
          <label className="field-shell">
            <span className="field-label">Primary chapter</span>
            <select
              className="field-input"
              disabled={isSelf}
              name="chapterId"
              onChange={(event) => setChapterId(event.target.value)}
              required={role === "chapter_admin"}
              value={chapterId}
            >
              <option value="">No primary chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                  {chapter.status !== "active" ? ` (${chapter.status})` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {needsAssignedChapters ? (
          <label className="field-shell md:col-span-2">
            <span className="field-label">Assigned chapters</span>
            <select
              className="field-input min-h-44"
              disabled={isSelf}
              multiple
              name="assignedChapters"
              onChange={(event) =>
                setAssignedChapters(
                  Array.from(event.target.selectedOptions, (option) => option.value),
                )
              }
              required
              value={assignedChapters}
            >
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                  {chapter.status !== "active" ? ` (${chapter.status})` : ""}
                </option>
              ))}
            </select>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
              Hold command or control to choose multiple chapters.
            </span>
          </label>
        ) : null}

        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground/60">
            {isSelf
              ? "Platform-admin access cannot be removed from your current account here."
              : "Saving clears any chapter fields that do not apply to the selected role."}
          </p>
          <button className="button-link primary" disabled={isSelf} type="submit">
            Save role
          </button>
        </div>
      </form>
    </article>
  );
}
