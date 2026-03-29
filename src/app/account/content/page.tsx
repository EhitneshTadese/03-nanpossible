import { AccountPlaceholder } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";

export default async function ContentPage() {
  await requireAccountViewer("/account/content", ["chapter_admin"]);

  return (
    <AccountPlaceholder
      bullets={[
        "Edit chapter-owned public pages within the enforced WIAL shell",
        "Preview which sections override the global fallback content",
        "Prepare future publishing and approval controls for chapter staff",
      ]}
      description="This chapter-head route will become the primary editor for local website content."
      eyebrow="Chapter workspace"
      focusLabel="Tenant content ownership"
      title="Change website content"
    />
  );
}
