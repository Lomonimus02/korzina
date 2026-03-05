import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LandingHero } from "@/components/landing-hero";
import { Footer } from "@/components/footer";
import { ShowcaseGrid } from "@/components/showcase-grid";
import { NewsGrid } from "@/components/news-grid";
import { Code2, User } from "lucide-react";
import prisma from "@/lib/db";

const ADMIN_EMAIL = "bvvbvdvdc@gmail.com";

export default async function LandingPage() {
  const session = await getAuthSession();

  // Check if user is admin
  let isAdmin = false;
  if (session?.user?.email) {
    // Check by specific admin email or by role
    if (session.user.email === ADMIN_EMAIL) {
      isAdmin = true;
    } else {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { role: true },
      });
      isAdmin = user?.role === "ADMIN";
    }
  }

  // Fetch latest 20 showcase items, ordered by manual order then by date
  const showcaseItems = await prisma.showcaseItem.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  // Fetch published news
  const newsItems = await prisma.news.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Transform for client component
  const showcaseItemsForClient = showcaseItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    thumbnail: item.thumbnail,
    filesSnapshot: item.filesSnapshot as Record<string, string>,
    chatId: item.chatId,
    createdAt: item.createdAt.toISOString(),
  }));

  // Transform news for client component
  const newsItemsForClient = newsItems.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.content,
    image: item.image,
    published: item.published,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen text-white flex flex-col overflow-x-hidden">
      {/* Fixed gradient background — stays pinned while content scrolls */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background: "linear-gradient(to bottom, rgba(9,4,20,0.75) 0%, transparent 25%), radial-gradient(ellipse 80% 70% at 0% 50%, #0284c7 0%, #0ea5e9 20%, #38bdf8 40%, transparent 70%), radial-gradient(ellipse 75% 65% at 100% 0%, #ff4500 0%, #ff6a00 15%, #ff9500 30%, transparent 55%), radial-gradient(ellipse 65% 60% at 92% 35%, #7dd3fc 0%, #38bdf8 25%, #0ea5e9 50%, transparent 70%), radial-gradient(ellipse 70% 60% at 0% 100%, #ff4500 0%, #ff6a00 15%, #ff9500 30%, transparent 55%), radial-gradient(ellipse 90% 80% at 60% 65%, #7c3aed 0%, #a21caf 35%, #db2777 60%, transparent 100%), radial-gradient(ellipse 80% 70% at 100% 100%, #000002 0%, #010005 30%, transparent 70%), #010007",
        }}
      />
      {/* Header */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl">
        <div className="flex h-14 items-center justify-between pl-0 pr-5 rounded-xl border border-white/[0.12] backdrop-blur-2xl" style={{ background: "rgba(8,8,14,0.70)" }}>
          <div className="flex items-center gap-0 font-bold text-xl -ml-2">
            <img src="/logo.svg" alt="Moonely" className="h-24 w-24" />
            <span className="-ml-4">Moonely</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <Link href="/pricing" className="hover:text-white transition-colors">Тарифы</Link>
          </nav>

          <div className="flex items-center gap-4">
            {session?.user ? (
              <>
                <Link href="/account" className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Аккаунт</span>
                </Link>
                <Link href="/new">
                  <Button variant="secondary" size="sm" className="bg-white text-black hover:bg-white/90">
                    Перейти в панель
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10">
                    Войти
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-white text-black hover:bg-white/90">
                    Начать бесплатно
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center">
        {/* Hero Section - full viewport, header floats on top */}
        <section className="h-screen w-full flex flex-col">
          <LandingHero user={session?.user} />
        </section>
        
        {/* Showcase Gallery - Peeks from bottom with card style */}
        <ShowcaseGrid 
          items={showcaseItemsForClient} 
          isLoggedIn={!!session?.user}
          isAdmin={isAdmin}
        />

        {/* News Section - Below showcase */}
        <NewsGrid 
          items={newsItemsForClient}
          isAdmin={isAdmin}
        />
      </main>
      
      <Footer />
    </div>
  );
}
