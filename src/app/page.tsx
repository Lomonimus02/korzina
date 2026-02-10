import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LandingHero } from "@/components/landing-hero";
import { Footer } from "@/components/footer";
import { ShowcaseGrid } from "@/components/showcase-grid";
import { NewsGrid } from "@/components/news-grid";
import { Code2 } from "lucide-react";
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5 md:border-white/10 md:bg-black/40">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8 mx-auto">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white">
              <Code2 className="h-5 w-5" />
            </div>
            <span>Moonely</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <Link href="/pricing" className="hover:text-white transition-colors">Тарифы</Link>
          </nav>

          <div className="flex items-center gap-4">
            {session?.user ? (
              <Link href="/new">
                <Button variant="secondary" size="sm" className="bg-white text-black hover:bg-white/90">
                  Перейти в панель
                </Button>
              </Link>
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
        {/* Hero Section - Takes most of viewport, shows only templates title */}
        <section className="h-[calc(100vh-80px)] w-full flex flex-col pt-16">
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
