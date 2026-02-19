"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, User, ChevronUp } from "lucide-react";

interface UserProfileProps {
  email: string;
  plan: "FREE" | "STARTER" | "CREATOR" | "PRO" | "STUDIO" | "AGENCY";
  isCollapsed?: boolean;
  side?: "top" | "bottom" | "left" | "right";
}

export function UserProfile({ email, plan, isCollapsed, side = "top" }: UserProfileProps) {
  const displayName = email.split('@')[0];
  const initial = email[0].toUpperCase();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-white/5 transition-colors text-left outline-none ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center shrink-0 text-zinc-300 text-sm font-medium border border-white/10">
            {initial}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 truncate">{displayName}</div>
                <div className="text-xs text-zinc-500 truncate">{email}</div>
              </div>
              <ChevronUp size={16} className="text-zinc-500 shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={side} className="w-56 bg-zinc-950 border-white/10 mb-2">
        {plan !== "FREE" && (
          <div className="px-2 py-1.5 mb-1 border-b border-white/5">
            <span className="text-xs font-medium text-zinc-400">
              {plan === "STARTER" ? "Старт" : plan === "CREATOR" ? "Создатель" : plan === "PRO" ? "Про" : plan === "STUDIO" ? "Студия" : plan === "AGENCY" ? "Агентство" : plan}
            </span>
          </div>
        )}
        <DropdownMenuItem asChild className="text-zinc-300 focus:text-white focus:bg-white/5">
          <Link href="/account" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Мой аккаунт</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-400 cursor-pointer focus:text-red-400 focus:bg-red-500/10"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
