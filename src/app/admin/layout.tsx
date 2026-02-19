import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import Link from "next/link";
import {
  BarChart3,
  LayoutDashboard,
  Users,
  MessageSquare,
  MousePointerClick,
  Clock,
  ChevronLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/prompts", label: "Prompts", icon: MessageSquare },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/clicks", label: "Clicks", icon: MousePointerClick },
  { href: "/admin/pages", label: "Page Time", icon: Clock },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#030303]">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% -30%, rgba(120,119,198,0.25) 0%, transparent 60%), #030303",
        }}
      />

      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-white/5 bg-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/5">
          <BarChart3 className="h-5 w-5 text-indigo-400" />
          <span className="font-semibold text-sm text-zinc-100 tracking-tight">
            Admin Panel
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-400 rounded-lg hover:text-zinc-100 hover:bg-white/5 transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/5">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 h-full overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-30">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <BarChart3 className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-semibold text-zinc-200">Admin</span>
        </div>
        {children}
      </main>
    </div>
  );
}
