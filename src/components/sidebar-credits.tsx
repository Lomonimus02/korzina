"use client";

import { useEffect, useState } from "react";
import { Zap, Infinity } from "lucide-react";
import Link from "next/link";
import { useAnalytics } from "@/hooks/use-analytics";

interface SidebarCreditsProps {
  initialCredits: number;
  initialLifetimeCredits?: number;
  initialPlan?: string;
  initialRemainingDaily?: number;
  initialRemainingMonthly?: number;
  freeDailyLimit?: number;
  freeMonthlyLimit?: number;
}

export function SidebarCredits({ 
  initialCredits, 
  initialLifetimeCredits = 0,
  initialPlan = 'FREE',
  initialRemainingDaily,
  initialRemainingMonthly,
  freeDailyLimit = 3,
  freeMonthlyLimit = 15,
}: SidebarCreditsProps) {
  const [regularCredits, setRegularCredits] = useState(initialCredits);
  const [lifetimeCredits, setLifetimeCredits] = useState(initialLifetimeCredits);
  const [plan, setPlan] = useState(initialPlan);
  const [remainingDaily, setRemainingDaily] = useState(initialRemainingDaily ?? freeDailyLimit);
  const [remainingMonthly, setRemainingMonthly] = useState(initialRemainingMonthly ?? freeMonthlyLimit);

  useEffect(() => {
    setRegularCredits(initialCredits);
    setLifetimeCredits(initialLifetimeCredits);
    setPlan(initialPlan);
    setRemainingDaily(initialRemainingDaily ?? freeDailyLimit);
    setRemainingMonthly(initialRemainingMonthly ?? freeMonthlyLimit);
  }, [initialCredits, initialLifetimeCredits, initialPlan, initialRemainingDaily, initialRemainingMonthly, freeDailyLimit, freeMonthlyLimit]);

  useEffect(() => {
    const handleRefresh = async () => {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setRegularCredits(data.regularCredits || 0);
          setLifetimeCredits(data.lifetimeCredits || 0);
          setPlan(data.plan || 'FREE');
          if (data.plan === 'FREE') {
            setRemainingDaily(data.remainingDaily ?? freeDailyLimit);
            setRemainingMonthly(data.remainingMonthly ?? freeMonthlyLimit);
          }
        }
      } catch (error) {
        console.error("Failed to refresh credits:", error);
      }
    };

    // Listen for both sidebar refresh (chat creation) and specific credit refresh events
    window.addEventListener("refresh-sidebar", handleRefresh);
    window.addEventListener("refresh-credits", handleRefresh);
    
    return () => {
      window.removeEventListener("refresh-sidebar", handleRefresh);
      window.removeEventListener("refresh-credits", handleRefresh);
    };
  }, []);

  const totalCredits = regularCredits + lifetimeCredits;
  const hasLifetimeCredits = lifetimeCredits > 0;
  const { trackClick } = useAnalytics();

  if (plan === 'FREE') {
    return (
      <Link 
        href="/pricing"
        onClick={() => trackClick("credits_topup")}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 transition-colors group"
      >
        <Zap size={16} className="text-indigo-400" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-indigo-200/90">
            {remainingMonthly} / {freeMonthlyLimit} ген.
          </span>
          <span className="text-xs text-indigo-400/60">
            Сегодня: {remainingDaily} из {freeDailyLimit}
          </span>
        </div>
        <span className="ml-auto text-xs text-indigo-400/60 group-hover:text-indigo-400/80 transition-colors">
          Upgrade
        </span>
      </Link>
    );
  }

  return (
    <Link 
      href="/pricing"
      onClick={() => trackClick("credits_topup")}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors group"
    >
      <Zap size={16} className="text-amber-500" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-amber-200/90">
          {totalCredits} кредитов
        </span>
        {hasLifetimeCredits && (
          <span className="text-xs text-amber-500/60 flex items-center gap-1">
            <Infinity size={10} />
            {lifetimeCredits} бессрочных
          </span>
        )}
      </div>
      <span className="ml-auto text-xs text-amber-500/60 group-hover:text-amber-500/80 transition-colors">
        Пополнить
      </span>
    </Link>
  );
}
