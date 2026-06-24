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
  { value: "public_visitor", label: "Visitor" },
];

function getRoleLabel(role: AppRole) {
  return roleOptions.find((o) => o.value === role)?.label ?? role;
}

export function UserRoleManager({ action, chapters, currentUserId, users }: UserRoleManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!users.length) {
    return (
      <p className="py-8 text-center text-sm text-foreground/58">No users yet.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-line/60">
      {/* Header row */}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_auto] gap-3 border-b border-line/60 bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-foreground/45">
        <span>User</span>
        <span>Role</span>
        <span>Chapter scope</span>
        <span />
      </div>

      {users.map((user) =>
        editingId === user.id ? (
          <UserEditRow
            action={action}
            chapters={chapters}
            currentUserId={currentUserId}
            key={user.id}
            onDone={() => setEditingId(null)}
            user={user}
          />
        ) : (
          <UserDisplayRow
            currentUserId={currentUserId}
            key={user.id}
            onEdit={() => setEditingId(user.id)}
            user={user}
            chapters={chapters}
          />
        ),
      )}
    </div>
  );
}

function UserDisplayRow({
  chapters,
  currentUserId,
  onEdit,
  user,
}: {
  chapters: UserRoleManagerProps["chapters"];
  currentUserId: string;
  onEdit: () => void;
  user: AdminUserRecord;
}) {
  const isSelf = user.id === currentUserId;

  const chapterScope = (() => {
    if (user.role === "content_creator" && user.assignedChapters.length) {
      return user.assignedChapters
        .map((id) => chapters.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join(", ");
    }
    if (user.chapterId) {
      return chapters.find((c) => c.id === user.chapterId)?.name ?? "—";
    }
    return "Global";
  })();

  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_auto] items-center gap-3 border-b border-line/40 px-4 py-2.5 text-sm last:border-b-0 hover:bg-surface/60">
      <div className="min-w-0">
        <p className="truncate font-semibold text-teal-deep">
          {user.name}
          {isSelf && (
            <span className="ml-2 text-xs font-bold uppercase tracking-[0.12em] text-accent">
              You
            </span>
          )}
        </p>
        <p className="truncate text-xs text-foreground/55">{user.email}</p>
      </div>
      <span className="inline-flex w-fit rounded-full border border-line/70 bg-white/70 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/60">
        {getRoleLabel(user.role)}
      </span>
      <span className="truncate text-xs text-foreground/55">{chapterScope}</span>
      <button
        className="button-link secondary text-xs"
        onClick={onEdit}
        type="button"
      >
        Edit
      </button>
    </div>
  );
}

function UserEditRow({
  action,
  chapters,
  currentUserId,
  onDone,
  user,
}: {
  action: UserRoleManagerProps["action"];
  chapters: UserRoleManagerProps["chapters"];
  currentUserId: string;
  onDone: () => void;
  user: AdminUserRecord;
}) {
  const [role, setRole] = useState<AppRole>(user.role);
  const [chapterId, setChapterId] = useState(user.chapterId ?? "");
  const [assignedChapters, setAssignedChapters] = useState<string[]>(user.assignedChapters);
  const isSelf = user.id === currentUserId;
  const needsPrimaryChapter = role === "chapter_admin" || role === "coach";
  const needsAssignedChapters = role === "content_creator";

  return (
    <div className="border-b border-line/60 bg-accent-soft/30 px-4 py-3 last:border-b-0">
      <form
        action={async (fd) => {
          await action(fd);
          onDone();
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <input name="userId" type="hidden" value={user.id} />

        {/* Email (read-only display) */}
        <div className="lg:col-span-3 text-sm font-semibold text-teal-deep">
          {user.name} — <span className="font-normal text-foreground/60">{user.email}</span>
        </div>

        <label className="field-shell">
          <span className="field-label">Role</span>
          <select
            className="field-input"
            disabled={isSelf}
            name="role"
            onChange={(e) => setRole(e.target.value as AppRole)}
            value={role}
          >
            {roleOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        {needsPrimaryChapter && (
          <label className="field-shell">
            <span className="field-label">Primary chapter</span>
            <select
              className="field-input"
              disabled={isSelf}
              name="chapterId"
              onChange={(e) => setChapterId(e.target.value)}
              required={role === "chapter_admin"}
              value={chapterId}
            >
              <option value="">No primary chapter</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.status !== "active" ? ` (${c.status})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {needsAssignedChapters && (
          <label className="field-shell sm:col-span-2">
            <span className="field-label">Assigned chapters</span>
            <select
              className="field-input min-h-32"
              disabled={isSelf}
              multiple
              name="assignedChapters"
              onChange={(e) =>
                setAssignedChapters(Array.from(e.target.selectedOptions, (o) => o.value))
              }
              required
              value={assignedChapters}
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.status !== "active" ? ` (${c.status})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <button className="button-link primary" disabled={isSelf} type="submit">
            Save
          </button>
          <button className="button-link secondary" onClick={onDone} type="button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}