"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import Link from "next/link";

interface SidebarCreditsProps {
  initialCredits: number;
}

export function SidebarCredits({ initialCredits }: SidebarCreditsProps) {
  const [credits, setCredits] = useState(initialCredits);

  useEffect(() => {
    setCredits(initialCredits);
  }, [initialCredits]);

  useEffect(() => {
    const handleRefresh = async () => {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits);
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

  return (
    <Link 
      href="/pricing"
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors group"
    >
      <Zap size={16} className="text-amber-500" />
      <span className="text-sm font-medium text-amber-200/90">
        {credits} кредитов
      </span>
      <span className="ml-auto text-xs text-amber-500/60 group-hover:text-amber-500/80 transition-colors">
        Пополнить
      </span>
    </Link>
  );
}
