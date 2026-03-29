import { redirect } from "next/navigation";
import { requireAccountViewer } from "@/lib/auth";

export default async function AdminRootPage() {
  const viewer = await requireAccountViewer("/admin", [
    "platform_admin",
    "chapter_admin",
    "content_creator",
  ]);

  if (viewer.role === "platform_admin") {
    redirect("/admin/global");
  }

  redirect("/admin/chapter");
}
