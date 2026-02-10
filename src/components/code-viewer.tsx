"use client";

import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
  UnstyledOpenInCodeSandboxButton,
} from "@codesandbox/sandpack-react";
import { useState, useMemo, useEffect, useRef, useCallback, Component, ErrorInfo, ReactNode } from "react";
import { Eye, Code2, RotateCw, ArrowUpRight, LayoutTemplate, Sparkles, FileCode2, Wand2, Globe, Palette, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DownloadButton } from "./download-button";
import { DeployButton } from "./deploy-button";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { getMoonelyDbFiles } from "@/lib/sandpack-sdk";
import { 
  isNetworkError, 
  isDocumentNullError, 
  isReadOnlyPropertyError, 
  isSyntaxErrorFromIncompleteCode,
  shouldSuppressError 
} from "./code-viewer-utils";

// ============= GLOBAL DEDUPLICATION (outside component to persist across re-renders) =============
const GLOBAL_PROCESSED_REQUESTS = new Set<string>();
const GLOBAL_ADD_CACHE = new Map<string, { timestamp: number; response: any }>();
const DEDUP_TTL = 3000; // 3 seconds

function cleanupOldEntries() {
  const now = Date.now();
  GLOBAL_ADD_CACHE.forEach((value, key) => {
    if (now - value.timestamp > DEDUP_TTL) {
      GLOBAL_ADD_CACHE.delete(key);
    }
  });
}

// State machine for preview panel
type ViewState = 'EMPTY' | 'ANALYZING' | 'STREAMING' | 'APPLYING' | 'READY' | 'ERROR';

interface CodeViewerProps {
  files: Record<string, string>;
  isStreaming?: boolean;
  isAnalyzing?: boolean; // New: true when user sends message, before stream starts
  showPreviewOnly?: boolean;
  activeTab?: "preview" | "code";
  onTabChange?: (tab: "preview" | "code") => void;
  hideHeader?: boolean;
  chatId?: string;
  projectName?: string;
  isEmpty?: boolean;
  onStreamFinish?: () => void;
  onError?: (error: { message: string }) => void;
  onRequestFix?: (errorMessage: string) => void;
  hasError?: boolean;
}

const sharedProps = {
  template: "react-ts" as const,
  theme: "dark" as const,
  customSetup: {
    dependencies: {
      "react": "18.2.0",
      "react-dom": "18.2.0",
      "lucide-react": "0.344.0",
      "clsx": "2.1.0",
      "tailwind-merge": "2.2.1",
      "react-router-dom": "6.22.3",
      "framer-motion": "10.16.4",
      "recharts": "2.10.3",
      "date-fns": "2.30.0",
      "class-variance-authority": "0.7.0",
      "@radix-ui/react-slot": "1.0.2",
      "@radix-ui/react-accordion": "1.1.2",
      "@radix-ui/react-alert-dialog": "1.0.5",
      "@radix-ui/react-aspect-ratio": "1.0.3",
      "@radix-ui/react-avatar": "1.0.4",
      "@radix-ui/react-checkbox": "1.0.4",
      "@radix-ui/react-collapsible": "1.0.3",
      "@radix-ui/react-context-menu": "2.1.5",
      "@radix-ui/react-dialog": "1.0.5",
      "@radix-ui/react-dropdown-menu": "2.0.6",
      "@radix-ui/react-hover-card": "1.0.7",
      "@radix-ui/react-label": "2.0.2",
      "@radix-ui/react-menubar": "1.0.4",
      "@radix-ui/react-navigation-menu": "1.1.4",
      "@radix-ui/react-popover": "1.0.7",
      "@radix-ui/react-progress": "1.0.3",
      "@radix-ui/react-radio-group": "1.1.3",
      "@radix-ui/react-scroll-area": "1.0.5",
      "@radix-ui/react-select": "2.0.0",
      "@radix-ui/react-separator": "1.0.3",
      "@radix-ui/react-slider": "1.1.2",
      "@radix-ui/react-switch": "1.0.3",
      "@radix-ui/react-tabs": "1.0.4",
      "@radix-ui/react-toast": "1.1.5",
      "@radix-ui/react-toggle": "1.0.3",
      "@radix-ui/react-toggle-group": "1.0.4",
      "@radix-ui/react-tooltip": "1.0.7",
      "cmdk": "0.2.0",
      "zod": "3.22.4",
      "react-hook-form": "7.51.0",
      "@hookform/resolvers": "3.3.4",
      "vaul": "0.9.0",
      "sonner": "1.4.3",
      "axios": "1.6.7",
      "uuid": "9.0.1",
      "@tanstack/react-query": "5.28.4",
      "react-icons": "5.0.1",
      "embla-carousel-react": "8.0.0",
      "input-otp": "1.2.4",
      "@react-spring/web": "9.7.3",
      "react-day-picker": "8.10.0",
      "lodash": "4.17.21",
      "react-dropzone": "14.2.3",
      "react-hot-toast": "2.4.1",
      "zustand": "4.5.2",
      "immer": "10.0.4",
      "dayjs": "1.11.10",
      "nanoid": "5.0.6",
      "react-use": "17.5.0",
      "swr": "2.2.5",
      "@dnd-kit/core": "6.1.0",
      "@dnd-kit/sortable": "8.0.0",
      "@dnd-kit/utilities": "3.2.2",
      "react-beautiful-dnd": "13.1.1",
      "react-table": "7.8.0",
      "@tanstack/react-table": "8.15.0"
    }
  },
  options: {
    externalResources: [
      "https://cdn.tailwindcss.com"
    ],
    initMode: "immediate" as const,
  }
};

function PreviewHeader({ 
  activeTab, 
  onTabChange, 
  files,
  showPreviewOnly,
  chatId,
  projectName
}: { 
  activeTab: "preview" | "code", 
  onTabChange: (tab: "preview" | "code") => void,
  files: Record<string, string>,
  showPreviewOnly?: boolean,
  chatId?: string,
  projectName?: string
}) {
  const { dispatch } = useSandpack();
  const [url, setUrl] = useState("/");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    dispatch({ type: "refresh" });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="h-14 px-4 flex items-center justify-between shrink-0 gap-4">
       <div className="hidden sm:flex items-center gap-2 text-zinc-400 shrink-0">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-xs font-medium">Превью</span>
       </div>

       {/* Centered URL Bar */}
       <div className="flex justify-center flex-1">
          <div className={cn(
            "w-full h-8 bg-zinc-900 border border-white/5 rounded-full flex items-center px-2 gap-2 shadow-sm group focus-within:border-indigo-500/30 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all",
            !showPreviewOnly && "max-w-[240px]"
          )}>
             <LayoutTemplate size={12} className="text-zinc-500" />
             <input 
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-transparent border-none text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none font-mono truncate"
                placeholder="/"
             />
             <div className="flex items-center gap-0.5">
                <UnstyledOpenInCodeSandboxButton 
                  className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-full transition-colors flex items-center justify-center"
                  title="Открыть в CodeSandbox"
                >
                   <ArrowUpRight size={12} />
                </UnstyledOpenInCodeSandboxButton>
                <button 
                  onClick={handleRefresh}
                  className={cn(
                    "p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-full transition-colors",
                    isRefreshing && "animate-spin"
                  )}
                  title="Обновить"
                >
                   <RotateCw size={12} />
                </button>
             </div>
          </div>
       </div>

       <div className="flex items-center gap-3 shrink-0">
          {/* View Toggle - Hidden if showPreviewOnly is true */}
          {!showPreviewOnly && (
          <div className="flex items-center bg-zinc-900/50 rounded-full border border-white/5 p-1 relative">
             <button 
               onClick={() => onTabChange("preview")}
               className={cn(
                 "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-xs font-medium relative z-10",
                 activeTab === "preview" ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
               )}
             >
               {activeTab === "preview" && (
                 <motion.div
                   layoutId="active-tab-pill"
                   className="absolute inset-0 bg-zinc-800 rounded-full shadow-sm"
                   transition={{ type: "spring", stiffness: 300, damping: 30 }}
                 />
               )}
               <Eye size={13} className="relative z-10" />
               <span className="relative z-10">Превью</span>
             </button>
             <button 
               onClick={() => onTabChange("code")}
               className={cn(
                 "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-xs font-medium relative z-10",
                 activeTab === "code" ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
               )}
             >
               {activeTab === "code" && (
                 <motion.div
                   layoutId="active-tab-pill"
                   className="absolute inset-0 bg-zinc-800 rounded-full shadow-sm"
                   transition={{ type: "spring", stiffness: 300, damping: 30 }}
                 />
               )}
               <FileCode2 size={13} className="relative z-10" />
               <span className="relative z-10">Код</span>
             </button>
          </div>
          )}
          
          <div className="flex items-center gap-1">
            <DeployButton files={files} chatId={chatId} projectName={projectName} />
            <DownloadButton files={files} />
          </div>
       </div>
    </div>
  );
}

// Zero State Empty Preview Component with dynamic animations
function EmptyStatePreview() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Main centered content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-sm">
        {/* Animated icon with static glow */}
        <div className="relative mb-8">
          {/* Static glow rings */}
          <div className="absolute -inset-8 bg-gradient-to-r from-indigo-500/20 via-purple-500/25 to-cyan-500/20 rounded-full blur-2xl" />
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/15 via-indigo-500/20 to-purple-500/15 rounded-full blur-xl" />
          
          {/* Icon container with float animation */}
          <div 
            className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-cyan-500/20 flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-sm"
            style={{ animation: 'float-vertical 4s ease-in-out infinite' }}
          >
            <Wand2 
              className="w-12 h-12 text-indigo-400" 
              style={{ animation: 'icon-float 3s ease-in-out infinite' }}
            />
          </div>
        </div>
        
        {/* Text */}
        <h3 className="text-2xl font-semibold text-zinc-100 mb-3">
          Здесь будет отображаться ваш сайт
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Опишите идею, и я воплощу её в реальность
        </p>
        
        {/* Feature pills with stagger animation */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-white/5 text-zinc-400 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5"
            style={{ animation: 'fade-in-up 0.5s ease-out forwards', animationDelay: '0.1s', opacity: 0 }}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="text-xs">Сайты</span>
          </div>
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-white/5 text-zinc-400 transition-all hover:border-purple-500/30 hover:bg-purple-500/5"
            style={{ animation: 'fade-in-up 0.5s ease-out forwards', animationDelay: '0.2s', opacity: 0 }}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span className="text-xs">Лендинги</span>
          </div>
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-white/5 text-zinc-400 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/5"
            style={{ animation: 'fade-in-up 0.5s ease-out forwards', animationDelay: '0.3s', opacity: 0 }}
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="text-xs">Дашборды</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Analyzing State - Shows immediately after user sends message
function AnalyzingStatePreview() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Subtle pulsing background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
          animation: 'pulse 2.5s ease-in-out infinite'
        }}
      />
      
      {/* Main centered content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-sm">
        {/* Animated search/thinking icon */}
        <div className="relative mb-8">
          {/* Gentle glow rings */}
          <div 
            className="absolute -inset-8 bg-gradient-to-r from-purple-500/20 via-violet-500/25 to-purple-500/20 rounded-full blur-2xl"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          />
          <div 
            className="absolute -inset-4 bg-gradient-to-r from-violet-500/15 via-purple-500/20 to-violet-500/15 rounded-full blur-xl"
            style={{ animation: 'pulse 2.5s ease-in-out infinite' }}
          />
          
          {/* Icon container */}
          <div 
            className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 via-violet-500/15 to-purple-500/20 flex items-center justify-center border border-purple-500/30 shadow-2xl backdrop-blur-sm"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          >
            <Search 
              className="w-12 h-12 text-purple-400" 
              style={{ animation: 'icon-float 2s ease-in-out infinite' }}
            />
          </div>
        </div>
        
        {/* Text */}
        <h3 className="text-2xl font-semibold text-zinc-100 mb-3">
          Анализирую ваш запрос...
        </h3>
        
        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-8">
          <span 
            className="w-2 h-2 bg-purple-400 rounded-full" 
            style={{ animation: 'bounce 1s ease-in-out infinite', animationDelay: '0ms' }}
          />
          <span 
            className="w-2 h-2 bg-purple-400 rounded-full" 
            style={{ animation: 'bounce 1s ease-in-out infinite', animationDelay: '150ms' }}
          />
          <span 
            className="w-2 h-2 bg-purple-400 rounded-full" 
            style={{ animation: 'bounce 1s ease-in-out infinite', animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

// Streaming State - "Magic Loader" while AI is generating code
function StreamingStatePreview() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Animated background gradient */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}
      />
      
      {/* Main centered content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-sm">
        {/* Animated loader icon */}
        <div className="relative mb-8">
          {/* Rotating glow rings */}
          <div 
            className="absolute -inset-8 bg-gradient-to-r from-indigo-500/30 via-purple-500/40 to-cyan-500/30 rounded-full blur-2xl"
            style={{ animation: 'spin 8s linear infinite' }}
          />
          <div 
            className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 via-indigo-500/30 to-purple-500/20 rounded-full blur-xl"
            style={{ animation: 'spin 6s linear infinite reverse' }}
          />
          
          {/* Icon container with pulse */}
          <div 
            className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-cyan-500/20 flex items-center justify-center border border-indigo-500/30 shadow-2xl backdrop-blur-sm"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          >
            <FileCode2 
              className="w-12 h-12 text-indigo-400" 
              style={{ animation: 'icon-float 2s ease-in-out infinite' }}
            />
          </div>
        </div>
        
        {/* Text with typewriter-like effect */}
        <h3 className="text-2xl font-semibold text-zinc-100 mb-3">
          Генерирую код...
        </h3>
        
        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-8">
          <span 
            className="w-2 h-2 bg-indigo-400 rounded-full" 
            style={{ animation: 'bounce 1s ease-in-out infinite', animationDelay: '0ms' }}
          />
          <span 
            className="w-2 h-2 bg-indigo-400 rounded-full" 
            style={{ animation: 'bounce 1s ease-in-out infinite', animationDelay: '150ms' }}
          />
          <span 
            className="w-2 h-2 bg-indigo-400 rounded-full" 
            style={{ animation: 'bounce 1s ease-in-out infinite', animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

// Applying State - Short transition after stream finishes
function ApplyingStatePreview() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Subtle pulsing background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
          animation: 'pulse 2s ease-in-out infinite'
        }}
      />
      
      {/* Main centered content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-sm">
        {/* Icon with checkmark animation */}
        <div className="relative mb-8">
          <div 
            className="absolute -inset-8 bg-gradient-to-r from-emerald-500/20 via-green-500/25 to-teal-500/20 rounded-full blur-2xl"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          />
          <div 
            className="absolute -inset-4 bg-gradient-to-r from-green-500/15 via-emerald-500/20 to-green-500/15 rounded-full blur-xl"
            style={{ animation: 'pulse 2.5s ease-in-out infinite' }}
          />
          
          <div 
            className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-500/15 to-teal-500/20 flex items-center justify-center border border-emerald-500/30 shadow-2xl backdrop-blur-sm"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          >
            <Sparkles 
              className="w-12 h-12 text-emerald-400" 
              style={{ animation: 'icon-float 2s ease-in-out infinite' }}
            />
          </div>
        </div>
        
        {/* Text */}
        <h3 className="text-2xl font-semibold text-zinc-100 mb-3">
          Применяю изменения...
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Почти готово
        </p>
        
        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-8">
          <span 
            className="w-2 h-2 bg-emerald-400 rounded-full" 
            style={{ animation: 'bounce 1s ease-in-out infinite', animationDelay: '0ms' }}
          />
          <span 
            className="w-2 h-2 bg-emerald-400 rounded-full" 
            style={{ animation: 'bounce 1s ease-in-out infinite', animationDelay: '150ms' }}
          />
          <span 
            className="w-2 h-2 bg-emerald-400 rounded-full" 
            style={{ animation: 'bounce 1s ease-in-out infinite', animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

// Error State - Shows when Sandpack detects a compilation/runtime error
function ErrorStatePreview({ onRequestFix, errorMessage }: { onRequestFix?: (errorMessage: string) => void; errorMessage?: string }) {
  const [isFixing, setIsFixing] = useState(false);

  const handleFix = () => {
    setIsFixing(true);
    const message = errorMessage 
      ? `Исправь ошибку в коде: ${errorMessage}`
      : "Исправь ошибку в коде. Код не компилируется.";
    onRequestFix?.(message);
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Subtle static background */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.12) 0%, transparent 70%)'
        }}
      />
      
      {/* Main centered content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-sm">
        {/* Steady icon - no animations for stability */}
        <div className="relative mb-8">
          {/* Static glow rings */}
          <div className="absolute -inset-8 bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-amber-500/15 rounded-full blur-2xl" />
          <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/10 via-amber-500/15 to-orange-500/10 rounded-full blur-xl" />
          
          {/* Icon container - steady, no animation */}
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/15 flex items-center justify-center border border-amber-500/25 shadow-2xl backdrop-blur-sm">
            <AlertTriangle className="w-12 h-12 text-amber-400" />
          </div>
        </div>
        
        {/* Text */}
        <h3 className="text-2xl font-semibold text-zinc-100 mb-3">
          Что-то пошло не так
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-8">
          Нажмите кнопку ниже, чтобы исправить
        </p>
        
        {/* Fix Button */}
        <button
          onClick={handleFix}
          disabled={isFixing}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/25 text-amber-300 hover:text-amber-200 hover:border-amber-500/40 hover:from-amber-500/25 hover:to-orange-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFixing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Исправляю...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span className="text-sm font-medium">Попробовать исправить</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Error utility functions imported from code-viewer-utils.ts
// isNetworkError, isDocumentNullError, isReadOnlyPropertyError, shouldSuppressError

/**
 * Safe error message extraction - prevents "Cannot assign to read only property 'message'" errors
 * Error objects in modern JS have frozen properties, so we clone the message safely
 */
function safeGetErrorMessage(error: unknown): string {
  try {
    if (error instanceof Error) {
      // Clone the message to avoid read-only property issues
      return String(error.message || '');
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message || '');
    }
    return String(error);
  } catch {
    return 'Unknown error';
  }
}

/**
 * Create a safe error object for propagation - never mutate original Error
 */
function createSafeError(originalError: unknown): { message: string; stack?: string } {
  const message = safeGetErrorMessage(originalError);
  const stack = originalError instanceof Error ? originalError.stack : undefined;
  return { message, stack };
}

// Error Boundary for SandpackPreview - catches null document errors and read-only property errors
interface SandpackErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: { message: string }) => void;
}

interface SandpackErrorBoundaryState {
  hasError: boolean;
  error: { message: string } | null;
}

class SandpackErrorBoundary extends Component<SandpackErrorBoundaryProps, SandpackErrorBoundaryState> {
  constructor(props: SandpackErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): SandpackErrorBoundaryState {
    // Safely extract error message without mutating the Error object
    const safeError = createSafeError(error);
    
    // Check if this is an error we should suppress
    if (shouldSuppressError(safeError.message)) {
      console.warn('[SandpackErrorBoundary] Suppressed error:', safeError.message);
      return { hasError: false, error: null };
    }
    return { hasError: true, error: safeError };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    // Safely extract error message
    const safeError = createSafeError(error);
    
    // Log and suppress known errors
    if (shouldSuppressError(safeError.message)) {
      console.warn('[SandpackErrorBoundary] Caught and suppressed:', safeError.message);
      this.setState({ hasError: false, error: null });
      return;
    }
    
    console.error('[SandpackErrorBoundary] Uncaught error:', safeError.message, errorInfo);
    // Pass safe error object to parent - never the original Error
    this.props.onError?.(safeError);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Only show error UI for non-suppressed errors
      return (
        <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-white">
          <div className="text-center p-4">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
            <p className="text-sm text-zinc-400">Ошибка превью</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Sandpack Error Listener - Monitors bundler status for errors
function SandpackErrorListener({ onError }: { onError: (error: { message: string }) => void }) {
  const { listen } = useSandpack();

  useEffect(() => {
    const unsubscribe = listen((msg) => {
      // Check for bundler error status
      if (msg.type === 'action' && msg.action === 'show-error') {
        const errorMsg = String((msg as any).message || (msg as any).title || 'Unknown error');
        // Use comprehensive error suppression check
        if (shouldSuppressError(errorMsg)) {
          console.warn('[Sandpack] Suppressed error:', errorMsg);
          return;
        }
        onError({ message: errorMsg });
      }
      
      // Also check for console errors that indicate runtime errors
      if (msg.type === 'console' && msg.log) {
        const logs = Array.isArray(msg.log) ? msg.log : [msg.log];
        for (const log of logs) {
          if (log.method === 'error') {
            const errorData = log.data?.[0];
            if (typeof errorData === 'string') {
              // Use comprehensive error suppression check
              if (shouldSuppressError(errorData)) {
                console.warn('[Sandpack] Suppressed console error:', errorData);
                continue;
              }
              if (
                errorData.includes('SyntaxError') ||
                errorData.includes('TypeError') ||
                errorData.includes('ReferenceError') ||
                errorData.includes('Error:')
              ) {
                onError({ message: errorData.slice(0, 200) });
                break;
              }
            }
          }
        }
      }

      // Check for module transpilation errors
      if (msg.type === 'status' && (msg as any).status === 'transpiling-error') {
        const errorMsg = String((msg as any).message || '');
        if (!shouldSuppressError(errorMsg)) {
          onError({ message: 'Ошибка компиляции модуля' });
        }
      }
    });

    return () => unsubscribe();
  }, [listen, onError]);

  return null;
}

export default function CodeViewer({ 
  files, 
  isStreaming = false,
  isAnalyzing = false,
  showPreviewOnly = false,
  activeTab: controlledActiveTab,
  onTabChange,
  hideHeader = false,
  chatId,
  projectName,
  isEmpty = false,
  onStreamFinish,
  onError,
  onRequestFix,
  hasError = false
}: CodeViewerProps) {
  // DEBUG: Log files received
  useEffect(() => {
    const appContent = files['/App.tsx'] || '';
    console.log('[CodeViewer] Files received:', {
      fileCount: Object.keys(files).length,
      paths: Object.keys(files),
      appTsxLength: appContent.length,
      isEmpty,
      isStreaming,
      isAnalyzing
    });
  }, [files, isEmpty, isStreaming, isAnalyzing]);

  // SSR Guard - Sandpack requires browser APIs
  const [isMounted, setIsMounted] = useState(false);
  
  // API Key и URL для Virtual Backend SDK
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  
  // Генерируем стабильный временный ID для проектов без chatId
  // Используем useState с lazy initializer для стабильности
  const [tempChatId] = useState<string>(() => {
    return 'temp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
  });
  
  // Fallback chatId - если не передан, используем сгенерированный временный ID
  const effectiveChatId = chatId || tempChatId;
  
  useEffect(() => {
    if (chatId) {
      console.log('[CodeViewer] Using provided chatId:', chatId);
    } else {
      console.warn('[CodeViewer] No chatId provided, using temporary ID:', effectiveChatId);
    }
  }, [chatId, effectiveChatId]);

  useEffect(() => {
    setIsMounted(true);
    
    // Очистка старого sessionStorage ключа от предыдущей версии
    // Это предотвращает утечку данных между проектами
    if (typeof window !== 'undefined') {
      const oldKey = 'moonely_temp_chat_id';
      if (sessionStorage.getItem(oldKey)) {
        console.log('[CodeViewer] Removing deprecated sessionStorage key:', oldKey);
        sessionStorage.removeItem(oldKey);
      }
    }
  }, []);

  // Загружаем API Key и API URL для текущего проекта
  useEffect(() => {
    if (!effectiveChatId || !isMounted) return;
    
    const fetchApiConfig = async () => {
      try {
        const response = await fetch(`/api/db/key?projectId=${effectiveChatId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            if (data.key) {
              setApiKey(data.key);
              console.log('[CodeViewer] Loaded API key for project:', effectiveChatId);
            }
            if (data.apiUrl) {
              setApiUrl(data.apiUrl);
              console.log('[CodeViewer] Loaded API URL:', data.apiUrl);
            }
          }
        }
      } catch (error) {
        console.warn('[CodeViewer] Failed to fetch API config:', error);
      }
    };
    
    fetchApiConfig();
  }, [effectiveChatId, isMounted]);

  // PostMessage proxy для Sandpack - слушаем запросы из SDK и делаем реальные запросы к API
  useEffect(() => {
    if (!isMounted || !effectiveChatId) return;

    console.log('[CodeViewer] Setting up postMessage handler for chatId:', effectiveChatId);

    const handleMessage = async (event: MessageEvent) => {
      // Проверяем что это запрос от MoonelyDB SDK
      if (event.data?.type !== 'MOONELY_DB_REQUEST') return;
      
      const { requestId, action, payload } = event.data;
      
      // CRITICAL: Use GLOBAL deduplication to prevent duplicate processing
      // This persists across React re-renders and Strict Mode double-invocations
      const globalRequestKey = `${effectiveChatId}:${requestId}`;
      if (GLOBAL_PROCESSED_REQUESTS.has(globalRequestKey)) {
        console.log('[CodeViewer] GLOBAL: RequestId already processed, skipping:', requestId);
        return;
      }
      GLOBAL_PROCESSED_REQUESTS.add(globalRequestKey);
      // Cleanup after TTL
      setTimeout(() => GLOBAL_PROCESSED_REQUESTS.delete(globalRequestKey), DEDUP_TTL);
      
      console.log('[CodeViewer] Received MOONELY_DB_REQUEST:', event.data);
      
      const projectId = payload.projectId || effectiveChatId;
      
      console.log('[CodeViewer] Processing action:', action, 'for projectId:', projectId);

      // Generate dedup key for write operations (by content, not just requestId)
      const dedupKey = action === 'add' 
        ? `${projectId}:${action}:${payload.collection}:${JSON.stringify(payload.data)}`
        : null;

      // Check for duplicate add requests (same data within TTL)
      if (dedupKey) {
        cleanupOldEntries(); // Clean old cache entries
        const cached = GLOBAL_ADD_CACHE.get(dedupKey);
        if (cached && Date.now() - cached.timestamp < DEDUP_TTL) {
          console.log('[CodeViewer] GLOBAL CACHE HIT - returning cached response for:', dedupKey);
          event.source?.postMessage({
            type: 'MOONELY_DB_RESPONSE',
            requestId,
            response: cached.response,
          }, { targetOrigin: '*' });
          return;
        }
      }
      
      try {
        let response;
        const baseUrl = '/api/db';
        
        switch (action) {
          case 'getAll': {
            const res = await fetch(`${baseUrl}?collection=${payload.collection}&projectId=${projectId}`);
            response = await res.json();
            break;
          }
          case 'getById': {
            const res = await fetch(`${baseUrl}?id=${payload.id}&projectId=${projectId}`);
            response = await res.json();
            break;
          }
          case 'add': {
            const res = await fetch(baseUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                collection: payload.collection,
                projectId,
                data: payload.data,
              }),
            });
            response = await res.json();
            break;
          }
          case 'update': {
            const res = await fetch(baseUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: payload.id,
                projectId,
                data: payload.data,
              }),
            });
            response = await res.json();
            break;
          }
          case 'remove': {
            const res = await fetch(`${baseUrl}?id=${payload.id}&projectId=${projectId}`, {
              method: 'DELETE',
            });
            response = await res.json();
            break;
          }
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        // Cache the response for deduplication (only for add operations) - GLOBAL CACHE
        if (dedupKey && response) {
          GLOBAL_ADD_CACHE.set(dedupKey, {
            timestamp: Date.now(),
            response,
          });
        }
        
        // Отправляем ответ обратно в Sandpack iframe
        event.source?.postMessage({
          type: 'MOONELY_DB_RESPONSE',
          requestId,
          response,
        }, { targetOrigin: '*' });
        
      } catch (error) {
        // Отправляем ошибку обратно
        event.source?.postMessage({
          type: 'MOONELY_DB_RESPONSE',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { targetOrigin: '*' });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isMounted, effectiveChatId]);

  // Global error suppression for Sandpack network errors (failed to fetch, etc.)
  useEffect(() => {
    if (!isMounted) return;

    // Store original console.error
    const originalConsoleError = console.error;
    
    // Override console.error to suppress network errors
    console.error = (...args) => {
      const message = args[0]?.toString?.() || '';
      if (isNetworkError(message)) {
        console.warn('[Sandpack] Suppressed network error:', message);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    // Handle unhandled promise rejections (often from Sandpack bundler)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || event.reason?.toString?.() || '';
      if (isNetworkError(message)) {
        event.preventDefault();
        console.warn('[Sandpack] Suppressed unhandled rejection:', message);
      }
    };

    // Handle global errors
    const handleGlobalError = (event: ErrorEvent) => {
      const message = event.message || '';
      if (isNetworkError(message)) {
        event.preventDefault();
        console.warn('[Sandpack] Suppressed global error:', message);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, [isMounted]);

  const [internalActiveTab, setInternalActiveTab] = useState<"preview" | "code">("preview");
  const [direction, setDirection] = useState(0);
  
  // Strict State Machine for preview panel
  const [viewState, setViewState] = useState<ViewState>('EMPTY');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const prevIsStreaming = useRef(isStreaming);
  const prevIsAnalyzing = useRef(isAnalyzing);
  const prevHasError = useRef(hasError);
  const prevChatIdForState = useRef(chatId);
  const applyingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset viewState when chatId changes to prevent showing old content
  useEffect(() => {
    if (chatId !== prevChatIdForState.current) {
      setViewState('EMPTY');
      setErrorMessage('');
      prevChatIdForState.current = chatId;
    }
  }, [chatId]);
  
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = (tab: "preview" | "code") => {
    if (tab === activeTab) return;
    setDirection(tab === "code" ? 1 : -1);
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  const effectiveTab = showPreviewOnly ? "preview" : activeTab;
  const containerRef = useRef<HTMLDivElement>(null);

  // State machine logic
  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (applyingTimeoutRef.current) {
        clearTimeout(applyingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Clear any pending timeout when state changes
    if (applyingTimeoutRef.current && viewState !== 'APPLYING') {
      clearTimeout(applyingTimeoutRef.current);
      applyingTimeoutRef.current = null;
    }
    
    // Handle external error state from parent (hasError prop)
    if (hasError && !prevHasError.current && viewState === 'READY') {
      setViewState('ERROR');
    } else if (!hasError && prevHasError.current && viewState === 'ERROR') {
      // Error was cleared (e.g., user started a fix)
      setViewState('ANALYZING');
    }
    
    // CRITICAL: Log state for debugging
    console.log('[CodeViewer State]', { viewState, isAnalyzing, isStreaming, isEmpty, prevStreaming: prevIsStreaming.current, prevAnalyzing: prevIsAnalyzing.current });
    
    // Determine state transitions with PRIORITY ORDER (most specific first)
    
    // 1. Stream just started - always transition to STREAMING
    if (isStreaming && !prevIsStreaming.current) {
      console.log('[CodeViewer] Transition: -> STREAMING (stream started)');
      setViewState('STREAMING');
      filesReadyRef.current = false;
    }
    // 2. Stream just finished - transition through APPLYING then READY
    else if (!isStreaming && prevIsStreaming.current) {
      console.log('[CodeViewer] Transition: -> APPLYING (stream finished)');
      setViewState('APPLYING');
      
      // Short delay then go to READY
      applyingTimeoutRef.current = setTimeout(() => {
        console.log('[CodeViewer] Transition: -> READY (after applying)');
        setViewState('READY');
        onStreamFinish?.();
      }, 300);
    }
    // 3. Analyzing started (user sent message)
    else if (isAnalyzing && !isStreaming && !prevIsAnalyzing.current) {
      console.log('[CodeViewer] Transition: -> ANALYZING (message sent)');
      setViewState('ANALYZING');
      setErrorMessage('');
    }
    // 4. Analyzing finished but stream didn't start yet - stay in current state if we have code
    else if (!isAnalyzing && prevIsAnalyzing.current && !isStreaming && !isEmpty && viewState === 'ANALYZING') {
      // Edge case: analyzing finished, waiting for stream
      // Keep ANALYZING state - stream will start soon
      console.log('[CodeViewer] Analyzing finished, waiting for stream...');
    }
    // 5. We have code but in wrong state - fix it
    else if (!isEmpty && !isStreaming && !isAnalyzing && (viewState === 'EMPTY' || viewState === 'APPLYING')) {
      console.log('[CodeViewer] Transition: -> READY (has code, fixing state)');
      if (applyingTimeoutRef.current) {
        clearTimeout(applyingTimeoutRef.current);
        applyingTimeoutRef.current = null;
      }
      setViewState('READY');
      onStreamFinish?.();
    }
    // 6. CRITICAL: If we're stuck in ANALYZING for too long with code, force READY
    else if (!isEmpty && !isStreaming && !isAnalyzing && viewState === 'ANALYZING') {
      console.log('[CodeViewer] Transition: -> READY (stuck in analyzing with code)');
      setViewState('READY');
      onStreamFinish?.();
    }
    // 5. Initial empty state
    else if (isEmpty && !isAnalyzing && !isStreaming && viewState !== 'EMPTY' && viewState !== 'READY' && viewState !== 'APPLYING') {
      console.log('[CodeViewer] Transition: -> EMPTY (no code)');
      setViewState('EMPTY');
    }
    
    prevIsStreaming.current = isStreaming;
    prevIsAnalyzing.current = isAnalyzing;
    prevHasError.current = hasError;
  }, [isStreaming, isAnalyzing, isEmpty, viewState, onStreamFinish, hasError, files]);

  // Internal error handler from SandpackErrorListener
  const handleSandpackError = useCallback((error: { message: string }) => {
    // Only trigger error state if we're in READY state and not streaming
    if (viewState === 'READY' && !isStreaming && !isAnalyzing) {
      setErrorMessage(error.message);
      setViewState('ERROR');
      onError?.(error);
    }
  }, [viewState, isStreaming, isAnalyzing, onError]);

  // Handle fix request from ErrorStatePreview
  const handleRequestFix = useCallback((message: string) => {
    setViewState('ANALYZING');
    setErrorMessage('');
    onRequestFix?.(message);
  }, [onRequestFix]);

  // Aggressively suppress error overlay using MutationObserver
  useEffect(() => {
    // Skip on server-side - document is not available
    if (!isMounted) return;
    
    // Helper: Check if an element is a Sandpack-owned iframe (should NOT be removed)
    const isSandpackElement = (el: Element): boolean => {
      // Check for Sandpack-specific attributes and classes
      const className = el.className || '';
      const id = el.id || '';
      const src = el.getAttribute('src') || '';
      const dataAttributes = Array.from(el.attributes).some(attr => 
        attr.name.startsWith('data-') && attr.value.includes('sandpack')
      );
      
      // Sandpack preview iframes have specific patterns
      if (
        className.includes('sandpack') ||
        className.includes('sp-') ||
        id.includes('sandpack') ||
        src.includes('sandpack') ||
        src.includes('csb') ||
        dataAttributes ||
        el.closest('[class*="sandpack"]') ||
        el.closest('[class*="sp-"]')
      ) {
        return true;
      }
      
      return false;
    };
    
    // Target: Find and hide any iframe or div with extremely high z-index (error overlays)
    const hideErrorOverlays = () => {
      // Look for iframes with the characteristic error overlay style
      const allElements = document.querySelectorAll('iframe, div');
      allElements.forEach(el => {
        // CRITICAL: Never remove Sandpack's own iframes
        if (isSandpackElement(el)) return;
        
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex || '0');
        // Error overlays typically use z-index: 2147483647 (max int)
        if (zIndex > 2147483600 && style.position === 'fixed') {
          (el as HTMLElement).style.display = 'none';
          (el as HTMLElement).style.visibility = 'hidden';
          (el as HTMLElement).remove();
        }
      });
    };

    // Run immediately
    hideErrorOverlays();

    // Watch for new elements being added
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // CRITICAL: Never touch Sandpack elements
            if (isSandpackElement(node)) return;
            
            const style = window.getComputedStyle(node);
            const zIndex = parseInt(style.zIndex || '0');
            if (zIndex > 2147483600 && style.position === 'fixed') {
              node.style.display = 'none';
              node.remove();
            }
            // Also check if it's an iframe with error-like content (but not Sandpack)
            if (node.tagName === 'IFRAME' && !isSandpackElement(node)) {
              const src = node.getAttribute('src') || '';
              // Only hide codesandbox error overlays, not the preview
              if (src.includes('codesandbox') && src.includes('error')) {
                node.style.display = 'none';
              } else if (style.zIndex === '2147483647') {
                node.style.display = 'none';
              }
            }
          }
        });
      });
      // Also run general cleanup
      hideErrorOverlays();
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // Also run on interval as backup
    const interval = setInterval(hideErrorOverlays, 300);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [isMounted]);

  // Keep a stable version of files that only updates when not streaming
  const [stableFiles, setStableFiles] = useState(files);
  const prevChatId = useRef(chatId);
  const filesReadyRef = useRef(false);
  
  // Force update stableFiles when chatId changes (switching between chats)
  useEffect(() => {
    if (chatId !== prevChatId.current) {
      setStableFiles(files);
      filesReadyRef.current = true;
      prevChatId.current = chatId;
    }
  }, [chatId, files]);
  
  // Update stableFiles when streaming stops
  // CRITICAL: Update immediately when streaming stops to ensure preview shows generated code
  useEffect(() => {
    if (!isStreaming) {
      // Immediately update stableFiles when streaming stops
      // This ensures the preview shows the generated code right away
      setStableFiles(files);
      filesReadyRef.current = true;
    }
  }, [files, isStreaming]);

  // CRITICAL FIX: Always use files directly for both preview and code tabs
  // The stableFiles abstraction was causing desync - preview showed old "Hello World"
  // while code tab showed actual generated code
  const sandpackFiles = files;

  // Files for deployment - includes SDK but NOT error suppression scripts
  // This is what gets deployed to Vercel
  const filesForDeploy = useMemo(() => {
    console.log('[filesForDeploy] Generating with chatId:', effectiveChatId, 'apiKey:', apiKey ? apiKey.substring(0, 10) + '...' : '(none)', 'apiUrl:', apiUrl || '(none)');
    const sdkFiles = getMoonelyDbFiles(effectiveChatId, apiKey || undefined, apiUrl || undefined);
    const sdkFilesFormatted: Record<string, string> = {};
    Object.entries(sdkFiles).forEach(([path, file]) => {
      sdkFilesFormatted[path] = file.code;
    });
    console.log('[filesForDeploy] SDK files added:', Object.keys(sdkFilesFormatted));
    console.log('[filesForDeploy] Total files for deploy:', Object.keys({ ...files, ...sdkFilesFormatted }).length);
    return {
      ...files,
      ...sdkFilesFormatted,
    };
  }, [files, effectiveChatId, apiKey, apiUrl]);

  // Generate a stable key for Sandpack that changes when chat changes or files are first loaded
  // This ensures preview shows correct content without unnecessary remounts during editing
  // CRITICAL FIX: Use FULL file content for hash to ensure preview updates after every change
  const sandpackKey = useMemo(() => {
    // Use FULL files content for hash to ensure preview updates when ANY part of files changes
    const filesSnapshot = Object.entries(files)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, content]) => `${path}:${content.length}:${content}`)
      .join('|||');
    
    // Simple string hash using full content
    let hash = 0;
    for (let i = 0; i < filesSnapshot.length; i++) {
      const char = filesSnapshot.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Add timestamp component to force refresh during streaming end
    const forceKey = `sandpack-${effectiveChatId || 'default'}-${hash}`;
    console.log('[CodeViewer] SandpackKey updated:', forceKey.substring(0, 50));
    return forceKey;
  }, [effectiveChatId, files]);

  // Add error suppression script that runs immediately when the app starts
  const filesWithErrorSuppression = useMemo(() => {
    const errorSuppressScript = `
// Error overlay suppression - runs immediately
// Hardened version: catches all errors to prevent "Cannot assign to read only property"
(function suppressErrorOverlay() {
  try {
    // Guard: ensure document exists before proceeding
    if (typeof document === 'undefined' || !document) return;
    
    // CSS injection - with null check
    if (document.head) {
      var style = document.createElement('style');
      style.textContent = 'body > iframe[style*="position: fixed"]:not([class*="sp-"]):not([class*="sandpack"]), body > iframe[style*="z-index"]:not([class*="sp-"]):not([class*="sandpack"]), iframe[style*="z-index: 2147483646"]:not([class*="sp-"]), iframe[style*="z-index: 2147483647"]:not([class*="sp-"]) { display: none !important; visibility: hidden !important; width: 0 !important; height: 0 !important; }';
      document.head.appendChild(style);
    }
    
    // Helper: Check if element is Sandpack-owned (should NOT be removed)
    function isSandpackElement(el) {
      try {
        if (!el) return true; // Treat null as protected
        var cls = el.className || '';
        var src = (el.getAttribute && el.getAttribute('src')) || '';
        return cls.includes('sp-') || cls.includes('sandpack') || src.includes('sandpack') || src.includes('csb');
      } catch (e) {
        return true; // If error, assume it's protected
      }
    }
    
    // Remove existing overlays - but protect Sandpack iframes
    function removeOverlays() {
      try {
        if (!document.body) return;
        document.querySelectorAll('body > iframe').forEach(function(el) {
          try {
            if (isSandpackElement(el)) return; // CRITICAL: Protect Sandpack
            var s = el.getAttribute('style') || '';
            if (s.includes('fixed') && s.includes('z-index')) el.remove();
          } catch (e) { /* ignore individual element errors */ }
        });
      } catch (e) { /* ignore */ }
    }
    
    // Watch for new overlays - only if body exists
    if (document.body) {
      try {
        var obs = new MutationObserver(removeOverlays);
        obs.observe(document.body, { childList: true });
        setInterval(removeOverlays, 100);
        removeOverlays();
      } catch (e) { /* ignore */ }
    }
    
    // Helper: safely get error message without mutating original error
    function safeGetMessage(e) {
      try {
        if (!e) return '';
        if (typeof e === 'string') return e;
        if (e.message) return String(e.message);
        if (e.reason && e.reason.message) return String(e.reason.message);
        return String(e);
      } catch (err) {
        return '';
      }
    }
    
    // List of error patterns to suppress
    var suppressPatterns = [
      'document',
      'cannot read properties of null',
      'null (reading',
      'read only property',
      'cannot assign to',
      'syntaxerror',
      'unterminated jsx',
      'unexpected token'
    ];
    
    function shouldSuppressMessage(msg) {
      if (!msg) return false;
      var lower = msg.toLowerCase();
      return suppressPatterns.some(function(p) { return lower.includes(p); });
    }
    
    // Suppress specific error events - wrapped in try-catch to prevent read-only property errors
    window.addEventListener('error', function(e) {
      try {
        var msg = safeGetMessage(e);
        if (shouldSuppressMessage(msg)) {
          e.stopImmediatePropagation();
          e.preventDefault();
          return false;
        }
      } catch (err) {
        // Silently ignore errors in error handler
      }
    }, true);
    
    // Also suppress unhandled rejections
    window.addEventListener('unhandledrejection', function(e) {
      try {
        var msg = safeGetMessage(e);
        if (shouldSuppressMessage(msg)) {
          e.preventDefault();
          return false;
        }
      } catch (err) {
        // Silently ignore errors in error handler
      }
    }, true);
    
  } catch (globalError) {
    // If anything fails in setup, silently continue
    console.warn('[ErrorSuppression] Setup failed:', globalError);
  }
})();
`;

    // Prepend error suppression to the App.tsx file
    const appFile = sandpackFiles["/App.tsx"] || "";
    const suppressedAppFile = `// @ts-nocheck
${errorSuppressScript}
${appFile}`;

    // Получаем файлы SDK для инъекции
    // SDK автоматически определяет режим: proxy (Sandpack), direct (Vercel), local (ZIP)
    // Для Sandpack preview apiUrl не нужен - используется postMessage proxy
    const sdkFiles = getMoonelyDbFiles(effectiveChatId, apiKey || undefined, apiUrl || undefined);
    
    // Преобразуем SDK файлы в формат Sandpack
    const sdkFilesFormatted: Record<string, string> = {};
    Object.entries(sdkFiles).forEach(([path, file]) => {
      sdkFilesFormatted[path] = file.code;
    });

    return {
      ...sandpackFiles,
      ...sdkFilesFormatted,
      "/App.tsx": suppressedAppFile,
    };
  }, [sandpackFiles, effectiveChatId, apiKey, apiUrl]);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.98, // Reduced scale effect for less "laggy" feel
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.98,
    })
  };

  const options = useMemo(() => ({
    ...sharedProps.options,
    autorun: true
  }), []);

  // Render state-based UI
  const renderStateContent = () => {
    switch (viewState) {
      case 'EMPTY':
        return (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <EmptyStatePreview />
          </motion.div>
        );
      
      case 'ANALYZING':
        return (
          <motion.div
            key="analyzing-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full w-full"
          >
            <AnalyzingStatePreview />
          </motion.div>
        );
      
      case 'STREAMING':
        return (
          <motion.div
            key="streaming-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <StreamingStatePreview />
          </motion.div>
        );
      
      case 'APPLYING':
        return (
          <motion.div
            key="applying-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            <ApplyingStatePreview />
          </motion.div>
        );
      
      case 'ERROR':
        return (
          <motion.div
            key="error-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <ErrorStatePreview 
              onRequestFix={handleRequestFix}
              errorMessage={errorMessage}
            />
          </motion.div>
        );
      
      case 'READY':
        return (
          <motion.div
            key="sandpack-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full flex flex-col"
          >
            {/* Key based on chatId + files hash ensures correct preview content */}
            <SandpackProvider
              key={sandpackKey}
              {...sharedProps}
              files={filesWithErrorSuppression}
              options={options}
              style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {/* Error Listener - monitors bundler for errors */}
              <SandpackErrorListener onError={handleSandpackError} />
              
              {/* Custom Floating Header - Desktop (Top) */}
              {!hideHeader && !showPreviewOnly && (
                <PreviewHeader 
                  activeTab={activeTab} 
                  onTabChange={setActiveTab} 
                  files={filesForDeploy}
                  showPreviewOnly={showPreviewOnly}
                  chatId={chatId}
                  projectName={projectName}
                />
              )}

              {/* Content Area */}
              <div ref={containerRef} className="flex-1 relative overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-zinc-950 ring-1 ring-white/5 mx-2 mb-2">
                <SandpackLayout style={{ height: '100%', width: '100%', borderRadius: 0, border: 'none', display: 'block' }}>
                  <div className="relative h-full w-full bg-background overflow-hidden">
                    {/* Code Panel - Always mounted, slides left/right */}
                    <motion.div
                      animate={{ 
                        x: effectiveTab === "code" ? "0%" : "100%",
                        opacity: effectiveTab === "code" ? 1 : 0.5,
                        scale: effectiveTab === "code" ? 1 : 0.95
                      }}
                      transition={{ type: "spring", stiffness: 200, damping: 25 }}
                      className="absolute inset-0 h-full w-full bg-zinc-950 z-10 overflow-hidden"
                    >
                      <SandpackCodeEditor 
                        showTabs={true}
                        showLineNumbers={true}
                        showInlineErrors={false}
                        wrapContent={true}
                        closableTabs={false}
                        readOnly={isStreaming}
                        style={{ height: '100%', width: '100%', overflow: 'hidden' }}
                      />
                    </motion.div>

                    {/* Preview Panel - Always mounted, slides left/right */}
                    <motion.div
                      animate={{ 
                        x: effectiveTab === "preview" ? "0%" : "-100%",
                        opacity: effectiveTab === "preview" ? 1 : 0.5,
                        scale: effectiveTab === "preview" ? 1 : 0.95
                      }}
                      transition={{ type: "spring", stiffness: 200, damping: 25 }}
                      className="absolute inset-0 h-full w-full bg-zinc-950 z-10 overflow-hidden"
                    >
                      {/* Error boundary catches null document errors from Sandpack iframe */}
                      <SandpackErrorBoundary>
                        <SandpackPreview 
                          showOpenInCodeSandbox={false}
                          showRefreshButton={false}
                          showNavigator={false}
                          showSandpackErrorOverlay={false}
                          style={{ height: '100%', width: '100%', overflow: 'hidden' }}
                        />
                      </SandpackErrorBoundary>
                    </motion.div>
                  </div>
                </SandpackLayout>
              </div>

              {/* Custom Floating Header - Mobile (Bottom) */}
              {!hideHeader && showPreviewOnly && (
                <PreviewHeader 
                  activeTab={activeTab} 
                  onTabChange={setActiveTab} 
                  files={filesForDeploy}
                  showPreviewOnly={showPreviewOnly}
                  chatId={chatId}
                  projectName={projectName}
                />
              )}
            </SandpackProvider>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  // Don't render anything on the server
  if (!isMounted) {
    return (
      <div className="h-full w-full bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Using mode="popLayout" to prevent Sandpack unmount during state transitions */}
      {/* This fixes "Cannot read properties of null (reading 'document')" error */}
      <AnimatePresence mode="popLayout" initial={false}>
        {renderStateContent()}
      </AnimatePresence>
    </div>
  );
}
