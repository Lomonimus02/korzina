"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, X, Sparkles, Zap, Crown, Building2, Rocket, Gift, ShoppingBag } from "lucide-react";
import { useState } from "react";

interface PricingClientProps {
  currentPlan: "FREE" | "STARTER" | "CREATOR" | "PRO" | "STUDIO" | "AGENCY";
  isAuthenticated: boolean;
}

export function PricingClient({ currentPlan, isAuthenticated }: PricingClientProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();

  const handlePurchase = async (planId: string, purchaseType: 'SUBSCRIPTION' | 'LIFETIME_PACK' | 'TOPUP_PACK') => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/pricing");
      return;
    }
    setLoadingPlan(planId);
    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, purchaseType }),
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

  // Подписки
  const subscriptions = [
    {
      id: "FREE",
      name: "Бесплатный старт",
      price: "0",
      period: "",
      description: "Для демонстрации магии продукта",
      credits: "3 генерации в день, макс. 15 в месяц",
      features: [
        { text: "Предпросмотр в реальном времени", included: true },
        { text: "Загрузка собственных изображений", included: true },
        { text: "Стандартная скорость работы", included: true },
        { text: "Экспорт кода (ZIP)", included: false },
        { text: "Деплой на Vercel", included: true },
      ],
      isCurrent: currentPlan === "FREE",
      icon: Sparkles,
    },
    {
      id: "STARTER",
      name: "Старт",
      price: "390",
      period: "/мес",
      description: "Для сборки прототипа и быстрой проверки идей",
      credits: "40 кредитов",
      features: [
        { text: "Предпросмотр в реальном времени", included: true },
        { text: "Загрузка собственных изображений", included: true },
        { text: "Быстрая скорость работы", included: true },
        { text: "Экспорт кода (ZIP)", included: true },
        { text: "Деплой на Vercel", included: true },
      ],
      isCurrent: currentPlan === "STARTER",
      icon: Rocket,
    },
    {
      id: "CREATOR",
      name: "Создатель",
      price: "990",
      period: "/мес",
      description: "Для личных пет-проектов, портфолио и дашбордов",
      credits: "150 кредитов",
      features: [
        { text: "Предпросмотр в реальном времени", included: true },
        { text: "Загрузка собственных изображений", included: true },
        { text: "Быстрая скорость работы", included: true },
        { text: "Экспорт кода (ZIP)", included: true },
        { text: "Деплой на Vercel", included: true },
        { text: "Доступ к закрытому чату комьюнити", included: true },
      ],
      isCurrent: currentPlan === "CREATOR",
      badge: "хит продаж",
      popular: true,
      icon: Zap,
    },
    {
      id: "PRO",
      name: "Про",
      price: "1 490",
      period: "/мес",
      description: "Для фрилансеров. Самый сбалансированный тариф",
      credits: "300 кредитов",
      features: [
        { text: "Предпросмотр в реальном времени", included: true },
        { text: "Загрузка собственных изображений", included: true },
        { text: "Быстрая скорость работы", included: true },
        { text: "Экспорт кода (ZIP)", included: true },
        { text: "Деплой на Vercel", included: true },
        { text: "Доступ к закрытому чату комьюнити", included: true },
      ],
      isCurrent: currentPlan === "PRO",
      badge: "выгодно",
      icon: Crown,
    },
    {
      id: "STUDIO",
      name: "Студия",
      price: "2 490",
      period: "/мес",
      description: "Для потоковой разработки сайтов",
      credits: "600 кредитов",
      features: [
        { text: "Предпросмотр в реальном времени", included: true },
        { text: "Загрузка собственных изображений", included: true },
        { text: "Максимальный приоритет скорости", included: true },
        { text: "Экспорт кода (ZIP)", included: true },
        { text: "Деплой на Vercel", included: true },
        { text: "Доступ к закрытому чату комьюнити", included: true },
      ],
      isCurrent: currentPlan === "STUDIO",
      icon: Building2,
    },
    {
      id: "AGENCY",
      name: "Агентство",
      price: "5 990",
      period: "/мес",
      description: "Оптовый тариф для бизнеса",
      credits: "1500 кредитов",
      features: [
        { text: "Предпросмотр в реальном времени", included: true },
        { text: "Загрузка собственных изображений", included: true },
        { text: "Максимальный приоритет скорости", included: true },
        { text: "Экспорт кода (ZIP)", included: true },
        { text: "Деплой на Vercel", included: true },
        { text: "Доступ к закрытому чату комьюнити", included: true },
      ],
      isCurrent: currentPlan === "AGENCY",
      icon: Building2,
    },
  ];

  // Пакеты без обязательств
  const packs = [
    {
      id: "LIFETIME_PACK",
      name: "Копилка",
      price: "1 290",
      description: "Для тех, кто не любит подписки",
      credits: "100 кредитов",
      features: [
        "Кредиты не сгорают никогда!",
        "Доступ ко всем Pro-функциям",
        "Экспорт, Деплой пока есть кредиты",
      ],
      purchaseType: 'LIFETIME_PACK' as const,
      icon: Gift,
      highlight: "Пожизненный пакет",
      requiresSubscription: false,
    },
    {
      id: "TOPUP_PACK",
      name: "Докупка",
      price: "290",
      description: "Спасательный круг, если не хватило пары попыток",
      credits: "25 кредитов",
      features: [
        "Кредиты не сгорают никогда!",
        "Доступен с активной подпиской",
      ],
      purchaseType: 'TOPUP_PACK' as const,
      icon: ShoppingBag,
      highlight: "Для подписчиков",
      requiresSubscription: true,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center p-4 md:p-8 relative z-10">
      {/* Header */}
      <div className="text-center mb-12 mt-8 md:mt-16">
        <h1 
          className="text-4xl md:text-5xl font-bold tracking-tight mb-3"
          style={{
            background: 'linear-gradient(to bottom, #fff, #cbd5e1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          Простые и прозрачные тарифы
        </h1>
        <p className="text-slate-400 text-lg">Выберите план, который подходит именно вам</p>
        <p className="text-slate-500 text-sm mt-2">
          Все подписки действуют 30 дней. При продлении до окончания — остаток переносится
        </p>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-[1600px] w-full pb-8">
        {subscriptions.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`
                relative flex flex-col rounded-[20px] p-5
                transition-all duration-300 hover:translate-y-[-4px]
                ${plan.popular ? 'z-10 scale-[1.02]' : ''}
              `}
              style={{
                background: plan.popular 
                  ? 'linear-gradient(180deg, rgba(25, 15, 10, 0.95) 0%, rgba(15, 8, 5, 0.98) 100%)'
                  : 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                backdropFilter: 'blur(20px)',
                border: plan.popular 
                  ? '1px solid rgba(249, 115, 22, 0.4)' 
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: plan.popular
                  ? '0 0 50px -10px rgba(249, 115, 22, 0.25), 0 20px 40px -10px rgba(0,0,0,0.5)'
                  : '0 20px 40px -10px rgba(0,0,0,0.3)',
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap"
                  style={{
                    background: plan.badge === "хит продаж" 
                      ? 'linear-gradient(180deg, #fb923c 0%, #ea580c 100%)'
                      : 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${plan.popular ? 'bg-orange-500/20' : 'bg-white/5'}`}>
                  <Icon className={`w-5 h-5 ${plan.popular ? 'text-orange-400' : 'text-white/60'}`} />
                </div>
                <h3 className={`text-lg font-semibold ${plan.popular ? 'text-orange-400' : 'text-white'}`}>
                  {plan.name}
                </h3>
              </div>

              {/* Price */}
              <div className="flex items-baseline mb-2">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-400 ml-1">₽{plan.period}</span>
              </div>

              {/* Credits */}
              <div className="text-sm text-indigo-400 font-medium mb-3">
                {plan.credits}
              </div>

              {/* Description */}
              <p className="text-slate-400 text-sm mb-4">
                {plan.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-5 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-red-500/60 flex-shrink-0" />
                    )}
                    <span className={feature.included ? 'text-slate-300' : 'text-slate-500 line-through'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Button */}
              {plan.isCurrent && isAuthenticated ? (
                <button 
                  disabled
                  className="w-full py-2.5 rounded-full font-semibold text-sm cursor-not-allowed opacity-50 bg-white/5 text-white border border-white/10"
                >
                  Текущий план
                </button>
              ) : plan.id === "FREE" ? (
                isAuthenticated ? (
                  <button 
                    disabled
                    className="w-full py-2.5 rounded-full font-semibold text-sm cursor-not-allowed opacity-50 bg-white/5 text-white border border-white/10"
                  >
                    Бесплатно
                  </button>
                ) : (
                  <button 
                    onClick={() => router.push("/register")}
                    className="w-full py-2.5 rounded-full font-semibold text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    Начать бесплатно
                  </button>
                )
              ) : (
                <button 
                  disabled={loadingPlan !== null}
                  onClick={() => handlePurchase(plan.id, 'SUBSCRIPTION')}
                  className={`w-full py-2.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center disabled:opacity-70 ${
                    plan.popular 
                      ? 'bg-white text-black hover:bg-white/90' 
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {loadingPlan === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {plan.isCurrent ? 'Продлить' : 'Выбрать'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Packs Section */}
      <div className="w-full max-w-[1400px] mt-8 mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Пакеты без обязательств
          </h2>
          <p className="text-slate-400">
            Кредиты не сгорают никогда. Оплата один раз.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[700px] mx-auto">
          {packs.map((pack) => {
            const Icon = pack.icon;
            return (
              <div
                key={pack.id}
                className="relative flex flex-col rounded-[24px] p-6 transition-all duration-300 hover:translate-y-[-4px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
              >
                {/* Highlight */}
                <div className="absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {pack.highlight}
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4 mt-2">
                  <div className="p-2 rounded-xl bg-indigo-500/20">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{pack.name}</h3>
                </div>

                {/* Price */}
                <div className="flex items-baseline mb-2">
                  <span className="text-3xl font-bold text-white">{pack.price}</span>
                  <span className="text-slate-400 ml-1">₽</span>
                  <span className="text-slate-500 text-sm ml-2">единоразово</span>
                </div>

                {/* Credits */}
                <div className="text-sm text-indigo-400 font-medium mb-3">
                  {pack.credits}
                </div>

                {/* Description */}
                <p className="text-slate-400 text-sm mb-4">
                  {pack.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {pack.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <button 
                  disabled={loadingPlan !== null || !isAuthenticated || (pack.requiresSubscription && currentPlan === 'FREE')}
                  onClick={() => handlePurchase(pack.id, pack.purchaseType)}
                  className="w-full py-3 rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center disabled:opacity-70 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30"
                >
                  {loadingPlan === pack.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!isAuthenticated ? 'Войдите для покупки' : (pack.requiresSubscription && currentPlan === 'FREE') ? 'Нужна подписка' : 'Купить'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <Link 
          href="/" 
          className="text-slate-400 hover:text-white transition-colors duration-300"
        >
          ← Назад к чату
        </Link>
      </div>
    </div>
  );
}
