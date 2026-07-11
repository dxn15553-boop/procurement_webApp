import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/team");

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      <Sidebar role="MANAGER" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
