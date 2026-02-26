import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { PricingClient } from "./pricing-client";
import { Footer } from "@/components/footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Тарифы — выберите подходящий план",
  description: "Бесплатный старт или PRO-возможности от 50₽/месяц. Создавайте профессиональные сайты без ограничений. Оплата российскими картами.",
  openGraph: {
    title: "Тарифы Moonely — от бесплатного до безлимита",
    description: "Выберите план: бесплатный для старта или PRO для серьёзных проектов. Оплата картами РФ.",
  },
};

export default async function PricingPage() {
  const session = await getAuthSession();

  let currentPlan: "FREE" | "STARTER" | "CREATOR" | "PRO" | "STUDIO" | "AGENCY" = "FREE";
  let isAuthenticated = false;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (user) {
      currentPlan = user.plan as "FREE" | "STARTER" | "CREATOR" | "PRO" | "STUDIO" | "AGENCY";
      isAuthenticated = true;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white relative">
      {/* Gradient Background - covers entire page including footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] bg-gradient-to-t from-orange-500/50 via-purple-500/35 to-transparent opacity-90 blur-[120px] rounded-full pointer-events-none z-0" />
      <PricingClient currentPlan={currentPlan} isAuthenticated={isAuthenticated} />
      <Footer className="relative z-10" />
    </div>
  );
}
