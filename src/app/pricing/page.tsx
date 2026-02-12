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

  let currentPlan: "FREE" | "STARTER" | "ADVANCED" | "STUDIO" = "FREE";
  let isAuthenticated = false;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (user) {
      currentPlan = user.plan as "FREE" | "STARTER" | "ADVANCED" | "STUDIO";
      isAuthenticated = true;
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PricingClient currentPlan={currentPlan} isAuthenticated={isAuthenticated} />
      <Footer />
    </div>
  );
}
