import { redirect } from "next/navigation";
import { requireAccountViewer } from "@/lib/auth";
import { getDefaultAccountHref } from "@/lib/account";

export default async function AccountRootPage() {
  const viewer = await requireAccountViewer("/account");

  redirect(getDefaultAccountHref(viewer.role));
}
