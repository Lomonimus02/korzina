"use client";

import Link from "next/link";
import { Plus, Sparkles, ChevronLeft, ChevronRight, MessageSquare, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserProfile } from "./user-profile";
import { SidebarChatList } from "./sidebar-chat-list";
import { SidebarCredits } from "./sidebar-credits";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarClientProps {
  user: any;
}

export function SidebarClient({ user }: SidebarClientProps) {
  const { trackClick } = useAnalytics();
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div 
      className={cn(
        "hidden md:flex bg-zinc-950 flex-col h-full transition-[width] duration-300 ease-in-out relative group z-50",
        isCollapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Collapse Toggle - Visible on hover */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-3 z-50 h-6 w-6 rounded-full bg-zinc-800 border border-white/10 text-zinc-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:text-white hover:bg-zinc-700 shadow-lg",
          isCollapsed ? "top-10" : "top-6"
        )}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header - Minimal Logo */}
      <div className={cn("p-4 pb-2 flex items-center", isCollapsed ? "justify-center" : "")}>
        <Link href="/" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group/logo">
          <div className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover/logo:text-indigo-300 transition-colors shrink-0">
            <Sparkles size={14} />
          </div>
          {!isCollapsed && (
            <span className="text-sm font-semibold text-zinc-200 tracking-tight whitespace-nowrap overflow-hidden">
              Moonely
            </span>
          )}
        </Link>
      </div>

      {/* New Chat Button */}
      <div className={cn("px-4 mb-4 space-y-2", isCollapsed ? "px-2" : "")}>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                asChild 
                variant="ghost" 
                className={cn(
                  "w-full gap-2 h-9 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-all rounded-lg border border-dashed border-white/10 hover:border-white/20",
                  isCollapsed ? "justify-center px-0" : "justify-start px-2"
                )}
              >
                <Link href="/new" onClick={() => trackClick("new_project")}>
                  <Plus size={14} />
                  {!isCollapsed && <span className="text-sm whitespace-nowrap">Новый проект</span>}
                </Link>
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Новый проект</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
        
        {/* My Sites Link */}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                asChild 
                variant="ghost" 
                className={cn(
                  "w-full gap-2 h-9 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all rounded-lg",
                  isCollapsed ? "justify-center px-0" : "justify-start px-2"
                )}
              >
                <Link href="/deployments" onClick={() => trackClick("my_sites")}>
                  <Globe size={14} />
                  {!isCollapsed && <span className="text-sm whitespace-nowrap">Мои сайты</span>}
                </Link>
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Мои сайты</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Navigation / History */}
      <div className="flex-1 flex flex-col min-h-0">
        {!isCollapsed && (
          <div className="px-6 pb-2 pt-2 animate-in fade-in duration-300">
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Недавние</span>
          </div>
        )}
        <ScrollArea className="flex-1 px-3">
          {isCollapsed ? (
             <div className="flex flex-col gap-2 items-center pt-2">
                {user.chats.slice(0, 5).map((chat: any) => (
                  <TooltipProvider key={chat.id} delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link 
                          href={`/c/${chat.id}`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                        >
                          <MessageSquare size={14} />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {chat.title || "New Chat"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
             </div>
          ) : (
            <SidebarChatList initialChats={user.chats} />
          )}
        </ScrollArea>
      </div>
      
      {/* Footer - Minimal */}
      <div className={cn("p-3 mt-auto space-y-1", isCollapsed ? "items-center flex flex-col" : "")}>
        {!isCollapsed && (
          <SidebarCredits 
            initialCredits={user.credits} 
            initialLifetimeCredits={user.lifetimeCredits || 0}
            initialPlan={user.plan}
          />
        )}
        <UserProfile email={user.email} plan={user.plan} isCollapsed={isCollapsed} />
      </div>
      </div>
    </div>
  );
}
