"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

interface PricingClientProps {
  currentPlan: "FREE" | "STARTER" | "ADVANCED" | "STUDIO";
  isAuthenticated: boolean;
}

export function PricingClient({ currentPlan, isAuthenticated }: PricingClientProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();

  const handleUpgrade = async (planId: string) => {
    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!isAuthenticated) {
      router.push("/login?redirect=/pricing");
      return;
    }
    setLoadingPlan(planId);
    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId.toUpperCase() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Не удалось получить ссылку на оплату");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Ошибка при создании платежа. Попробуйте снова.");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Что-то пошло не так. Попробуйте позже.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: "free",
      name: "Бесплатный",
      price: "0₽",
      period: "/месяц",
      description: "Идеально для знакомства с платформой.",
      features: ["10 генераций в месяц", "Стандартная скорость", "Поддержка сообщества"],
      isCurrent: currentPlan === "FREE",
    },
    {
      id: "starter",
      name: "Стартовый",
      price: "890₽",
      period: "/месяц",
      description: "Для начинающих разработчиков.",
      features: ["25 генераций в месяц", "Быстрая скорость", "Приоритетная поддержка"],
      isCurrent: currentPlan === "STARTER",
    },
    {
      id: "advanced",
      name: "Продвинутый",
      price: "2 990₽",
      period: "/месяц",
      description: "Для активных пользователей.",
      features: ["100 генераций в месяц", "Максимальная скорость", "Приоритетная поддержка", "Ранний доступ к новым функциям"],
      isCurrent: currentPlan === "ADVANCED",
      popular: true,
    },
    {
      id: "studio",
      name: "Студия",
      price: "По запросу",
      period: "",
      description: "Индивидуальные условия для команд.",
      features: ["Безлимитные генерации", "Персональный менеджер", "SLA поддержка", "Кастомные интеграции"],
      isCurrent: currentPlan === "STUDIO",
      isEnterprise: true,
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-background flex flex-col items-center p-4 md:p-8">
      <div className="text-center mb-12 mt-8 md:mt-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Простые и прозрачные тарифы</h1>
        <p className="text-muted-foreground text-lg">Выберите план, который подходит именно вам.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full pb-12">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-lg shadow-primary/20' : ''}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                ПОПУЛЯРНЫЙ
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-3xl font-bold mb-1">
                {plan.price}
              </div>
              {plan.period && (
                <p className="text-sm text-muted-foreground mb-4">{plan.period}</p>
              )}
              <ul className="space-y-3 mt-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {plan.isCurrent && isAuthenticated ? (
                <Button className="w-full" variant="outline" disabled>
                  Текущий план
                </Button>
              ) : plan.isEnterprise ? (
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => window.location.href = "mailto:selenium.studio.web@gmail.com?subject=Студия%20-%20Запрос"}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Связаться
                </Button>
              ) : plan.id === "free" ? (
                isAuthenticated ? (
                  <Button className="w-full" variant="outline" disabled>
                    Бесплатно
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => router.push("/login?redirect=/pricing")}
                  >
                    Попробовать сейчас
                  </Button>
                )
              ) : (
                <Button 
                  className="w-full" 
                  disabled={loadingPlan !== null}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {loadingPlan === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Купить
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="mt-12 text-center">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          ← Назад к чату
        </Link>
      </div>
    </div>
  );
}
