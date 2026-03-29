import { redirect } from "next/navigation";
import { requireAccountViewer } from "@/lib/auth";
import { getDefaultAccountHref } from "@/lib/account";

export default async function DashboardRootPage() {
  const viewer = await requireAccountViewer("/dashboard");
  redirect(getDefaultAccountHref(viewer.role));
}
