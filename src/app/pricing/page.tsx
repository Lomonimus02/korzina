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
      {/* Gradient Background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: "radial-gradient(ellipse 50% 42% at 100% 0%, #001a2e 0%, #01375a 20%, #0369a1 35%, transparent 55%), radial-gradient(ellipse 50% 42% at 0% 100%, #001a2e 0%, #01375a 20%, #0369a1 35%, transparent 55%), radial-gradient(ellipse 80% 70% at 50% 55%, #1a021a 0%, #350840 35%, #5a1040 60%, transparent 100%), radial-gradient(ellipse 60% 55% at 100% 100%, #000001 0%, transparent 55%), #00000a" }} />
      <PricingClient currentPlan={currentPlan} isAuthenticated={isAuthenticated} />
      <Footer className="relative z-10" />
    </div>
  );
}
