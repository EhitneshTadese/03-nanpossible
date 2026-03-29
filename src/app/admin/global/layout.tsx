import { requireAccountViewer } from "@/lib/auth";

export default async function GlobalAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAccountViewer("/admin/global", ["platform_admin"]);
  return children;
}
