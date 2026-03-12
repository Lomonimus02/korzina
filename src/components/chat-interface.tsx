"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, User, Bot, Loader2, FileCode2, Archive, ChevronLeft, History, LayoutTemplate, MessageSquare, Pencil, ArrowUp, Eye, Sparkles, Zap, Wand2, Code2, CheckCircle2, AlertTriangle, Upload, ImagePlus, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseXmlToFiles, parseXmlToFilesWithValidation, type ValidationResult } from "@/lib/parse-xml";
import { motion, AnimatePresence } from "framer-motion";

import { DownloadButton } from "./download-button";
import TextareaAutosize from "react-textarea-autosize";
import { UserProfile } from "./user-profile";
import { SidebarChatList } from "./sidebar-chat-list";
import { ChatSuggestions } from "@/components/chat-suggestions";
import { VoiceInput } from "@/components/voice-input";
import { ImageUpload, AttachmentPreview, useAttachmentPaste, type Attachment } from "@/components/image-upload";
import { publishToShowcase } from "@/app/actions/showcase";
import { useAnalytics } from "@/hooks/use-analytics";

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[]; // Legacy - kept for backward compatibility with old messages
  attachments?: { url: string; name: string }[]; // New attachment format
}

// This forces the component to load ONLY on the client side
const CodeViewer = dynamic(() => import("@/components/code-viewer"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-zinc-900 flex items-center justify-center text-zinc-500">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ),
});

const INITIAL_CODE = `export default function App() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Hello World</h1>
        <p className="text-lg text-gray-300">Welcome to Moonely!</p>
        <button className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
          Click Me
        </button>
      </div>
    </div>
  );
}`;

const LIB_UTILS_CODE = `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`;

const STOCK_PHOTOS_CODE = `// @ts-nocheck
// Используем Pexels - бесплатный сервис, доступный в России
export const STOCK_PHOTOS = {
  // Abstract Gradients & 3D (Perfect for Hero sections, backgrounds)
  abstract: [
    "https://images.pexels.com/photos/3109807/pexels-photo-3109807.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2693212/pexels-photo-2693212.png?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1629236/pexels-photo-1629236.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4348401/pexels-photo-4348401.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Modern Tech & SaaS
  tech: [
    "https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Business & Office
  business: [
    "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Lifestyle & People
  lifestyle: [
    "https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/708440/pexels-photo-708440.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/853151/pexels-photo-853151.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1206059/pexels-photo-1206059.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Minimal & Architecture
  minimal: [
    "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1668860/pexels-photo-1668860.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/259580/pexels-photo-259580.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Food & Coffee
  food: [
    "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Nature & Landscape
  nature: [
    "https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // E-commerce & Products
  ecommerce: [
    "https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/5632371/pexels-photo-5632371.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/5632381/pexels-photo-5632381.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3965548/pexels-photo-3965548.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3965545/pexels-photo-3965545.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Avatar photos - professional headshots for testimonials, team members
  avatar: [
    "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
    "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200",
    "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
    "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200",
    "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200",
    "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200",
    "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=200",
    "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=200"
  ],
  // Automotive - cars, vehicles, transport
  automotive: [
    "https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1149137/pexels-photo-1149137.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2365572/pexels-photo-2365572.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1035108/pexels-photo-1035108.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1149831/pexels-photo-1149831.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Medical & Healthcare
  medical: [
    "https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4225880/pexels-photo-4225880.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4021775/pexels-photo-4021775.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4225920/pexels-photo-4225920.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Sports & Fitness
  sports: [
    "https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3253501/pexels-photo-3253501.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Real Estate & Property
  realestate: [
    "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Education & Learning
  education: [
    "https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/5428012/pexels-photo-5428012.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/5553050/pexels-photo-5553050.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/4145153/pexels-photo-4145153.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/5905709/pexels-photo-5905709.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Travel & Tourism
  travel: [
    "https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2325446/pexels-photo-2325446.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2087391/pexels-photo-2087391.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ],
  // Beauty & Fashion
  beauty: [
    "https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3373738/pexels-photo-3373738.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2587370/pexels-photo-2587370.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ]
};

// Get a stable photo by category and index (recommended for galleries/testimonials)
export function getPhoto(category, index = 0) {
  const keys = Object.keys(STOCK_PHOTOS);
  const safeCategory = keys.includes(category) ? category : 'abstract';
  const photos = STOCK_PHOTOS[safeCategory];
  const safeIndex = Math.abs(index) % photos.length;
  return photos[safeIndex];
}

// Get a random photo (changes on each call/refresh)
export function getRandomPhoto(category) {
  const keys = Object.keys(STOCK_PHOTOS);
  const safeCategory = keys.includes(category) ? category : 'abstract';
  const photos = STOCK_PHOTOS[safeCategory];
  return photos[Math.floor(Math.random() * photos.length)];
}
`;

interface ChatInterfaceProps {
  chatId?: string;
  initialMessages?: any[];
  initialInput?: string;
  initialTitle?: string;
  userData?: {
    email: string;
    plan: "FREE" | "STARTER" | "CREATOR" | "PRO" | "STUDIO" | "AGENCY";
    role?: "USER" | "ADMIN";
  };
  isTrialMode?: boolean;  // Анонимный trial — 1 бесплатный промпт без регистрации
  trialUsed?: boolean;    // Trial уже использован (показываем результат read-only)
}

// Building UI Card - memoized to prevent animation resets during streaming
// States: isActive (streaming), isApplying (just finished, short delay), isComplete (done)
const BuildingCard = memo(function BuildingCard({ 
  isActive, 
  fileCount, 
  isComplete,
  isApplying = false,
  isFirst 
}: { 
  isActive: boolean; 
  fileCount: number; 
  isComplete: boolean;
  isApplying?: boolean;
  isFirst: boolean;
}) {
  // Determine title based on state
  const title = isComplete 
    ? "Изменения применены" 
    : isApplying
      ? "Применяю изменения..."
      : isFirst 
        ? "Генерирую код..." 
        : "Генерирую код...";

  // Determine subtitle based on state  
  const subtitle = isComplete
    ? `${fileCount} ${fileCount === 1 ? 'файл' : fileCount < 5 ? 'файла' : 'файлов'} обновлено`
    : isApplying
      ? "Почти готово..."
      : fileCount > 0 
        ? `${fileCount} ${fileCount === 1 ? 'файл' : fileCount < 5 ? 'файла' : 'файлов'}` 
        : 'Создаю компоненты...';

  // Color scheme: indigo for streaming, teal for applying, zinc for complete
  const getColorClasses = () => {
    if (isComplete) {
      return {
        border: 'border-zinc-600/40 bg-zinc-800/30',
        iconBg: 'bg-zinc-700/40',
        icon: 'text-zinc-300',
        title: 'text-zinc-200',
        spinner: 'text-zinc-400'
      };
    }
    if (isApplying) {
      return {
        border: 'border-teal-500/30 bg-teal-500/5',
        iconBg: 'bg-teal-500/20',
        icon: 'text-teal-400',
        title: 'text-teal-300',
        spinner: 'text-teal-400'
      };
    }
    return {
      border: 'border-indigo-500/30 bg-indigo-500/5',
      iconBg: 'bg-indigo-500/20',
      icon: 'text-indigo-400',
      title: 'text-indigo-300',
      spinner: 'text-indigo-400'
    };
  };

  const colors = getColorClasses();
  
  return (
    <div className={`relative overflow-hidden rounded-xl border ${colors.border} p-4 my-2`}>
      {/* Shimmer effect - always rendered but hidden when not active */}
      <div 
        className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transition-opacity ${isActive && !isComplete && !isApplying ? 'opacity-100' : 'opacity-0'}`}
        style={{
          animation: 'shimmer 2s infinite',
          transform: 'translateX(-100%)',
        }}
      />
      
      <div className="relative flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.iconBg}`}>
          {isComplete ? (
            <CheckCircle2 className={`w-5 h-5 ${colors.icon}`} />
          ) : isApplying ? (
            <Sparkles className={`w-5 h-5 ${colors.icon}`} />
          ) : (
            <Code2 className={`w-5 h-5 ${colors.icon}`} />
          )}
        </div>
        <div className="flex-1">
          <div className={`text-sm font-medium ${colors.title}`}>
            {title}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {subtitle}
          </div>
        </div>
        {(isActive || isApplying) && !isComplete && (
          <Loader2 className={`w-4 h-4 animate-spin ${colors.spinner}`} />
        )}
      </div>
    </div>
  );
});

// Simple thinking indicator - just animated dots
const ThinkingIndicator = memo(function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30">
        <Sparkles className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
});

export default function ChatInterface({ chatId, initialMessages = [], initialInput, initialTitle, userData, isTrialMode = false, trialUsed = false }: ChatInterfaceProps) {
  const router = useRouter();
  const { trackClick } = useAnalytics();
  const [messages, setMessages] = useState<Message[]>(initialMessages.map(m => ({
    role: m.role,
    content: m.content
  })));
  const [input, setInput] = useState(initialInput || "");
  const [title, setTitle] = useState(initialTitle || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hasAutoSubmitted = useRef(false);
  const [trialCompleted, setTrialCompleted] = useState(trialUsed); // Trial промпт использован
  const [trialFixAttempted, setTrialFixAttempted] = useState(false); // Авто-фикс уже был
  const trialFixAttemptedRef = useRef(false); // Ref для мгновенной блокировки (без гонки)
  const [isTrialFixing, setIsTrialFixing] = useState(false); // Идёт авто-фикс
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mobileMessagesEndRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);
  const [files, setFiles] = useState<Record<string, string>>({ 
    "/App.tsx": INITIAL_CODE,
    "/lib/utils.ts": LIB_UTILS_CODE,
    "/lib/stock-photos.ts": STOCK_PHOTOS_CODE
  });
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // True from message send until first stream chunk
  const [isActuallyStreaming, setIsActuallyStreaming] = useState(false); // True when receiving stream chunks
  const [hasCodeError, setHasCodeError] = useState(false); // True when Sandpack reports a code error
  const [codeErrorMessage, setCodeErrorMessage] = useState<string>('');
  const [validFiles, setValidFiles] = useState<Record<string, string>>({ 
    "/App.tsx": INITIAL_CODE,
    "/lib/utils.ts": LIB_UTILS_CODE,
    "/lib/stock-photos.ts": STOCK_PHOTOS_CODE
  }); // Files that have passed validation
  const [fileValidation, setFileValidation] = useState<Record<string, ValidationResult>>({}); // Validation status per file
  const [safeFilesToShow, setSafeFilesToShow] = useState<Record<string, string>>({ 
    "/App.tsx": INITIAL_CODE,
    "/lib/utils.ts": LIB_UTILS_CODE,
    "/lib/stock-photos.ts": STOCK_PHOTOS_CODE
  }); // Files safe to display - uses debounce after stream ends
  const applyingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamEndDebounceRef = useRef<NodeJS.Timeout | null>(null); // Debounce for switching from validFiles to files
  // Ref to store submitMessage to avoid circular dependency with handleRequestFix
  const submitMessageRef = useRef<((message: string) => Promise<void>) | undefined>(undefined);

  // Publish to Showcase state (Admin only)
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishThumbnail, setPublishThumbnail] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Determine if preview should show empty state
  // Show empty state when files haven't changed from initial state
  // IMPORTANT: Check BOTH files AND safeFilesToShow to catch the moment code is generated
  // This prevents the race condition where safeFilesToShow hasn't updated yet
  const hasRealGeneratedCode = useMemo(() => {
    // Check both files and safeFilesToShow - if either has real code, we're not empty
    const defaultKeys = new Set(["/App.tsx", "/lib/utils.ts", "/lib/stock-photos.ts"]);
    
    const checkFiles = (fileMap: Record<string, string>) => {
      // Check for extra files beyond defaults (components, pages, etc.)
      if (Object.keys(fileMap).some(key => !defaultKeys.has(key))) return true;
      
      const appContent = fileMap["/App.tsx"];
      if (!appContent) return false;
      // If App.tsx still contains the Hello World placeholder, it's not real code
      if (appContent === INITIAL_CODE) return false;
      if (appContent.includes("Hello World") && appContent.includes("Welcome to Moonely")) return false;
      return true;
    };
    
    // Return true if either has real generated code
    return checkFiles(safeFilesToShow) || checkFiles(files);
  }, [safeFilesToShow, files]);
  
  const isPreviewEmpty = !hasRealGeneratedCode;

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (applyingTimeoutRef.current) {
        clearTimeout(applyingTimeoutRef.current);
      }
      if (streamEndDebounceRef.current) {
        clearTimeout(streamEndDebounceRef.current);
      }
    };
  }, []);

  // Parse files from initial messages on mount (for remixed chats)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      // Find the last assistant message that might contain code
      const assistantMessages = initialMessages.filter(m => m.role === 'assistant');
      if (assistantMessages.length > 0) {
        const lastAssistant = assistantMessages[assistantMessages.length - 1];
        const content = lastAssistant.content || '';
        
        // Check if this message contains file XML (remixed content or regular code)
        if (content.includes('<file path=') || content.includes('<boltArtifact')) {
          const parsedFiles = parseXmlToFiles(content, {
            "/App.tsx": INITIAL_CODE,
            "/lib/utils.ts": LIB_UTILS_CODE,
            "/lib/stock-photos.ts": STOCK_PHOTOS_CODE
          });
          
          // Check if we actually got new files
          const hasNewFiles = Object.keys(parsedFiles).some(
            key => key !== "/App.tsx" && key !== "/lib/utils.ts" && key !== "/lib/stock-photos.ts"
          ) || parsedFiles["/App.tsx"] !== INITIAL_CODE;
          
          if (hasNewFiles) {
            setFiles(parsedFiles);
            setValidFiles(parsedFiles);
            setSafeFilesToShow(parsedFiles);
          }
        }
      }
    }
  }, []); // Only run on mount

  // Handle attachment operations
  const handleAttachmentAdd = useCallback((attachment: Attachment) => {
    trackClick("upload_attachment");
    setAttachments((prev) => [...prev, attachment]);
  }, [trackClick]);

  const handleAttachmentUpdate = useCallback((id: string, updates: Partial<Attachment>) => {
    setAttachments((prev) =>
      prev.map((att) => (att.id === id ? { ...att, ...updates } : att))
    );
  }, []);

  const handleAttachmentRemove = useCallback((id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((att) => att.id === id);
      // Revoke blob URL to free memory
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((att) => att.id !== id);
    });
  }, []);
  
  // Handle paste events for images (Ctrl+V) - uploads to cloud automatically
  useAttachmentPaste(handleAttachmentAdd, handleAttachmentUpdate, isLoading);

  const handleRename = async (newTitle: string) => {
    if (!currentChatId || !newTitle.trim()) return;
    
    try {
      const res = await fetch(`/api/chat/${currentChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (res.ok) {
        window.dispatchEvent(new Event("refresh-sidebar"));
      }
    } catch (error) {
      console.error("Failed to rename chat:", error);
    }
  };

  // Handle Publish to Showcase (Admin only)
  const handlePublish = async () => {
    if (!publishTitle.trim()) {
      setPublishError("Title is required");
      return;
    }
    
    setIsPublishing(true);
    setPublishError(null);
    
    try {
      await publishToShowcase(
        currentChatId || "",
        publishTitle,
        publishDescription,
        safeFilesToShow,
        publishThumbnail
      );
      
      // Reset form and close dialog
      setPublishTitle("");
      setPublishDescription("");
      setPublishThumbnail("");
      setThumbnailPreview(null);
      setIsPublishDialogOpen(false);
      
      // Optionally show success toast/notification
      alert("Published to Showcase successfully!");
    } catch (error: any) {
      setPublishError(error.message || "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  // === Авто-фикс ошибок для trial-режима ===
  const autoFixTrial = useCallback(async (errorMsg: string) => {
    // Используем ref для мгновенной проверки (state обновляется асинхронно)
    if (trialFixAttemptedRef.current || !isTrialMode) return;
    trialFixAttemptedRef.current = true; // Мгновенная блокировка
    setTrialFixAttempted(true);
    setIsTrialFixing(true);
    setHasCodeError(false);
    setCodeErrorMessage('');
    setIsLoading(true);
    setIsAnalyzing(true);

    try {
      // Добавляем fix-сообщение пользователя в UI
      const fixMessage = `Исправь ошибку в коде: ${errorMsg}`;
      setMessages(prev => [...prev, { role: "user", content: fixMessage }]);

      const response = await fetch("/api/chat/trial/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorMessage: errorMsg,
          currentFiles: files,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Ошибка исправления");
      }

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (isFirstChunk) {
          setIsAnalyzing(false);
          setIsActuallyStreaming(true);
          isFirstChunk = false;
        }

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;

        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          const lastMsg = newMessages[lastIndex];
          if (lastMsg.role === "assistant") {
            newMessages[lastIndex] = { ...lastMsg, content: assistantMessage };
          }
          return newMessages;
        });
      }

      setIsLoading(false);
      setIsActuallyStreaming(false);
      setIsApplying(true);

      if (applyingTimeoutRef.current) clearTimeout(applyingTimeoutRef.current);
      applyingTimeoutRef.current = setTimeout(() => setIsApplying(false), 500);

    } catch (err: any) {
      console.error("Trial auto-fix error:", err);
      setError(err.message || "Ошибка автоматического исправления");
      setIsLoading(false);
      setIsAnalyzing(false);
      setIsActuallyStreaming(false);
      setIsApplying(false);
    } finally {
      setIsTrialFixing(false);
    }
  }, [isTrialMode, files]);

  // Handle code error from CodeViewer/Sandpack
  const handleCodeError = useCallback((error: { message: string }) => {
    setHasCodeError(true);
    setCodeErrorMessage(error.message);

    // В trial-режиме: автоматически пытаемся исправить (1 попытка)
    if (isTrialMode && !trialFixAttemptedRef.current) {
      autoFixTrial(error.message);
    }
  }, [isTrialMode, autoFixTrial]);

  // Handle auto-fix request from CodeViewer error UI
  const handleRequestFix = useCallback((errorMessage: string) => {
    setHasCodeError(false);
    setCodeErrorMessage('');
    // Submit a fix request message to the AI using ref to avoid circular dependency
    submitMessageRef.current?.(errorMessage);
  }, []);

  const submitMessage = useCallback(async (messageContent: string) => {
    // В trial-режиме: если промпт уже использован — блокируем
    if (isTrialMode && trialCompleted) {
      setError("Бесплатная проба использована. Зарегистрируйтесь для продолжения.");
      return;
    }

    // Check if any attachments are still uploading
    const uploadingAttachments = attachments.filter(a => a.status === "uploading");
    if (uploadingAttachments.length > 0) {
      setError("Подождите, пока изображения загружаются...");
      return;
    }

    // Get only successfully uploaded attachments
    const readyAttachments = attachments.filter(a => a.status === "success");
    
    if ((!messageContent.trim() && readyAttachments.length === 0) || isLoading) return;

    // Prepare attachments data for the message (url + name only)
    const attachmentsData = readyAttachments.map(a => ({ url: a.url, name: a.name }));
    
    const userMessage: Message = { 
      role: "user", 
      content: messageContent, 
      attachments: attachmentsData.length > 0 ? attachmentsData : undefined 
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    
    // Clear attachments and revoke blob URLs
    attachments.forEach(att => {
      if (att.previewUrl) {
        URL.revokeObjectURL(att.previewUrl);
      }
    });
    setAttachments([]);
    
    setIsLoading(true);
    setIsAnalyzing(true); // Start analyzing phase immediately
    setError(null);
    setHasCodeError(false); // Clear any existing code errors
    setCodeErrorMessage('');

    // === TRIAL MODE: отдельная логика ===
    if (isTrialMode) {
      try {
        const response = await fetch("/api/chat/trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [userMessage],
            currentFiles: files,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 403) {
            setTrialCompleted(true);
            // Если сервер вернул chatId существующего trial-чата
            if (errorData.chatId) {
              setCurrentChatId(errorData.chatId);
            }
            throw new Error("Бесплатная проба уже использована. Зарегистрируйтесь для продолжения.");
          }
          throw new Error(errorData.error || "Ошибка генерации");
        }

        // Получаем chatId и trialToken из заголовков ответа
        const trialChatId = response.headers.get("X-Chat-Id");
        if (trialChatId) {
          setCurrentChatId(trialChatId);
        }

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        let isFirstChunk = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (isFirstChunk) {
            setIsAnalyzing(false);
            setIsActuallyStreaming(true);
            isFirstChunk = false;
          }

          const chunk = decoder.decode(value, { stream: true });
          assistantMessage += chunk;

          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            const lastMsg = newMessages[lastIndex];
            if (lastMsg.role === "assistant") {
              newMessages[lastIndex] = { ...lastMsg, content: assistantMessage };
            }
            return newMessages;
          });
        }

        // Стрим завершён — помечаем trial как использованный
        setTrialCompleted(true);
        setIsLoading(false);
        setIsActuallyStreaming(false);
        setIsApplying(true);

        if (applyingTimeoutRef.current) clearTimeout(applyingTimeoutRef.current);
        applyingTimeoutRef.current = setTimeout(() => setIsApplying(false), 500);

      } catch (err: any) {
        console.error("Trial chat error:", err);
        setError(err.message || "Ошибка генерации");
        setIsLoading(false);
        setIsAnalyzing(false);
        setIsActuallyStreaming(false);
        setIsApplying(false);
      }
      return; // Выходим — дальше идёт логика для залогиненных
    }

    // === ОБЫЧНЫЙ РЕЖИМ (залогиненный пользователь) ===
    // Optimistically generate Chat ID if not present
    let activeChatId = currentChatId;

    // Safety check: If we don't have an ID in state, but the URL looks like /c/[id], use that.
    // This prevents creating a new chat if the state is lost but the URL is correct.
    if (!activeChatId && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/c\/([^\/]+)/);
      if (match) {
        activeChatId = match[1];
        setCurrentChatId(activeChatId);
      }
    }

    if (!activeChatId) {
      activeChatId = uuidv4();
      // Универсальная функция генерации UUID v4 (замена crypto.randomUUID)
      function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      setCurrentChatId(activeChatId);
      window.history.replaceState(null, "", `/c/${activeChatId}`);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          currentFiles: files,
          chatId: activeChatId,
          attachments: attachmentsData, // Send attachments with URL and name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || response.statusText || "Не удалось отправить сообщение";
        
        if (response.status === 403) {
          const errMsg = errorData.error || "";
          if (errMsg.includes("Дневной") || errMsg.toLowerCase().includes("daily")) {
            throw new Error("Дневной лимит исчерпан");
          } else if (errMsg.includes("Месячный") || errMsg.toLowerCase().includes("monthly")) {
            throw new Error("Месячный лимит исчерпан");
          }
          throw new Error("Недостаточно кредитов");
        }
        throw new Error(errorMessage);
      }

      // Trigger sidebar refresh via custom event
      // We do this after the request starts to ensure the chat is created on server
      // But since we stream, the chat is created at the start of the handler.
      // We might need to wait a bit or just fire it.
      // Actually, the server creates the chat before returning the stream.
      // So once we get response.ok, the chat exists.
      window.dispatchEvent(new Event("refresh-sidebar"));
      window.dispatchEvent(new Event("refresh-credits"));

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      // Add placeholder for assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let isFirstChunk = true;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // On first chunk, transition from analyzing to streaming
        if (isFirstChunk) {
          setIsAnalyzing(false);
          setIsActuallyStreaming(true);
          isFirstChunk = false;
        }

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;

        // Update the last message (assistant's) with new content safely
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          const lastMsg = newMessages[lastIndex];
          
          if (lastMsg.role === "assistant") {
            // Create a new object to ensure state immutability
            newMessages[lastIndex] = { ...lastMsg, content: assistantMessage };
          }
          return newMessages;
        });
      }
      
      // Refresh sidebar again after stream finishes to catch any auto-generated titles
      window.dispatchEvent(new Event("refresh-sidebar"));
      
      // DEBUG: Log stream completion
      console.log('[ChatInterface] Stream finished, transitioning states', {
        assistantMessageLength: assistantMessage.length,
        hasFileTag: assistantMessage.includes('<file'),
        hasEditTag: assistantMessage.includes('<edit')
      });
      
      // Transition to "applying" state for smooth UX
      setIsLoading(false);
      setIsActuallyStreaming(false);
      setIsApplying(true);
      
      // Clear any existing timeout
      if (applyingTimeoutRef.current) {
        clearTimeout(applyingTimeoutRef.current);
      }
      
      // After short delay, complete the applying phase
      applyingTimeoutRef.current = setTimeout(() => {
        setIsApplying(false);
      }, 500);
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "Не удалось получить ответ. Пожалуйста, проверьте API ключ.");
      setIsLoading(false);
      setIsAnalyzing(false);
      setIsActuallyStreaming(false);
      setIsApplying(false);
    }
  }, [attachments, isLoading, currentChatId, messages, files, isTrialMode, trialCompleted]);

  // Update ref when submitMessage changes
  useEffect(() => {
    submitMessageRef.current = submitMessage;
  }, [submitMessage]);

  // Track if we have pending images to load
  const [hasPendingImages, setHasPendingImages] = useState(false);
  const [pendingImagesLoaded, setPendingImagesLoaded] = useState(false);

  // Load pending images from sessionStorage (from landing page)
  // This runs FIRST before auto-submit
  useEffect(() => {
    const pendingImages = sessionStorage.getItem('pendingImages');
    if (pendingImages) {
      sessionStorage.removeItem('pendingImages');
      setHasPendingImages(true);
      
      try {
        const base64Images: string[] = JSON.parse(pendingImages);
        let uploadedCount = 0;
        const totalImages = base64Images.length;
        
        // Upload each base64 image to cloud
        base64Images.forEach(async (base64, index) => {
          const id = `pending_${Date.now()}_${index}`;
          
          // Add attachment with uploading status
          handleAttachmentAdd({
            id,
            url: "",
            name: `image-${index + 1}.jpg`,
            previewUrl: base64, // Use base64 as preview
            status: "uploading",
          });
          
          try {
            // Convert base64 to Blob
            const response = await fetch(base64);
            const blob = await response.blob();
            const file = new File([blob], `image-${index + 1}.jpg`, { type: 'image/jpeg' });
            
            // Upload to cloud
            const formData = new FormData();
            formData.append("file", file);
            
            const uploadResponse = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
            
            const data = await uploadResponse.json();
            
            if (uploadResponse.ok) {
              handleAttachmentUpdate(id, {
                url: data.url,
                name: data.fileName || `image-${index + 1}.jpg`,
                status: "success",
              });
            } else {
              throw new Error(data.error || "Ошибка загрузки");
            }
          } catch (error) {
            console.error("Failed to upload pending image:", error);
            handleAttachmentUpdate(id, {
              status: "error",
              error: error instanceof Error ? error.message : "Ошибка загрузки",
            });
          } finally {
            uploadedCount++;
            // Mark as loaded when all images are processed
            if (uploadedCount >= totalImages) {
              setPendingImagesLoaded(true);
            }
          }
        });
      } catch (e) {
        console.error("Failed to parse pending images:", e);
        setPendingImagesLoaded(true); // Mark as loaded even on error to unblock
      }
    } else {
      // No pending images, mark as loaded immediately
      setPendingImagesLoaded(true);
    }
  }, [handleAttachmentAdd, handleAttachmentUpdate]);

  // Auto-submit if initialInput is provided
  // Wait for pending images to be loaded first
  useEffect(() => {
    if (initialInput && !hasAutoSubmitted.current && !isLoading && pendingImagesLoaded) {
      // Small delay to ensure attachments state is updated
      const timer = setTimeout(() => {
        hasAutoSubmitted.current = true;
        submitMessage(initialInput);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialInput, isLoading, submitMessage, pendingImagesLoaded]);

  // Reset state when chatId changes (e.g. clicking "New Chat")
  useEffect(() => {
    // Only reset if the chatId prop actually changes to a different ID
    // or if we are navigating to a new chat (chatId is undefined)
    // But we must be careful not to reset if we just created the chat locally
    
    if (chatId !== currentChatId) {
        // If we are currently in a "new" chat state (currentChatId is set, but chatId prop is undefined)
        // and the new chatId prop is ALSO undefined, we shouldn't reset.
        // This happens when we are on /new, we type, currentChatId gets a value.
        // If something triggers a re-render with chatId=undefined, we don't want to wipe state.
        if (!chatId && currentChatId) {
            return;
        }

        setMessages(initialMessages.map(m => ({
            role: m.role,
            content: m.content
        })));
        setCurrentChatId(chatId);
        setInput("");
        setError(null);
        setIsLoading(false);
        
        // Parse files from initialMessages if they contain code
        // Otherwise reset to defaults
        const defaultFiles: Record<string, string> = { 
          "/App.tsx": INITIAL_CODE,
          "/lib/utils.ts": LIB_UTILS_CODE,
          "/lib/stock-photos.ts": STOCK_PHOTOS_CODE
        };
        
        let newFiles: Record<string, string> = defaultFiles;
        const assistantMsgs = initialMessages.filter(m => m.role === 'assistant');
        if (assistantMsgs.length > 0) {
          let parsedFiles = { ...defaultFiles };
          for (const msg of assistantMsgs) {
            if (msg.content && (msg.content.includes('<file path=') || msg.content.includes('<boltArtifact'))) {
              parsedFiles = parseXmlToFiles(msg.content, parsedFiles);
            }
          }
          const defaultKeys = new Set(["/App.tsx", "/lib/utils.ts", "/lib/stock-photos.ts"]);
          const hasNewContent = Object.keys(parsedFiles).some(k => !defaultKeys.has(k)) || 
                                parsedFiles["/App.tsx"] !== INITIAL_CODE;
          if (hasNewContent) {
            newFiles = parsedFiles;
          }
        }
        
        setFiles(newFiles);
        setSafeFilesToShow(newFiles);
        setValidFiles(newFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Parse messages to extract files with validation
  useEffect(() => {
    let currentFiles: Record<string, string> = { 
      "/App.tsx": INITIAL_CODE,
      "/lib/utils.ts": LIB_UTILS_CODE,
      "/lib/stock-photos.ts": STOCK_PHOTOS_CODE
    };
    let currentValidFiles: Record<string, string> = { ...currentFiles };
    let currentValidation: Record<string, ValidationResult> = {};
    
    // Only parse from current messages state (initialMessages are already loaded into messages state)
    messages.filter(m => m.role === "assistant").forEach(m => {
      const result = parseXmlToFilesWithValidation(m.content, currentFiles);
      currentFiles = result.files;
      // Merge valid files - keep previous valid versions if current is invalid
      currentValidFiles = { ...currentValidFiles, ...result.validFiles };
      currentValidation = { ...currentValidation, ...result.fileValidation };
    });

    setFiles(currentFiles);
    setValidFiles(currentValidFiles);
    setFileValidation(currentValidation);
    
    // CRITICAL FIX: Always update safeFilesToShow when messages change and we have real code
    // This ensures preview updates after EVERY message, not just during streaming transitions
    // Check if files have real generated code (not just initial placeholder)
    const appTsxChanged = currentFiles["/App.tsx"] !== INITIAL_CODE && 
      !(currentFiles["/App.tsx"]?.includes("Hello World") && currentFiles["/App.tsx"]?.includes("Welcome to Moonely"));
    // Also check if there are any files beyond the 3 defaults (components, etc.)
    const defaultKeys = new Set(["/App.tsx", "/lib/utils.ts", "/lib/stock-photos.ts"]);
    const hasExtraFiles = Object.keys(currentFiles).some(key => !defaultKeys.has(key));
    const hasRealCode = appTsxChanged || hasExtraFiles;
    
    // DEBUG: Log state for troubleshooting preview issues
    console.log('[ChatInterface] Parse effect:', {
      hasRealCode,
      appTsxChanged,
      hasExtraFiles,
      isActuallyStreaming,
      messagesCount: messages.length,
      fileCount: Object.keys(currentFiles).length,
      appTsxLength: currentFiles["/App.tsx"]?.length || 0
    });
    
    if (hasRealCode) {
      // CRITICAL: During streaming, use validFiles to prevent syntax errors
      // After streaming ends, use the full files
      if (isActuallyStreaming) {
        console.log('[ChatInterface] Setting safeFilesToShow to validFiles (streaming)');
        setSafeFilesToShow(currentValidFiles);
      } else {
        // Not streaming - always show the complete files
        console.log('[ChatInterface] Setting safeFilesToShow to currentFiles (not streaming)');
        setSafeFilesToShow(currentFiles);
      }
    }
    
    // Log validation issues in development for debugging
    if (process.env.NODE_ENV === 'development') {
      const invalidFiles = Object.entries(currentValidation).filter(([, v]) => !v.isValid || !v.isComplete);
      if (invalidFiles.length > 0) {
        console.log('[Moonely] File validation status:', invalidFiles.map(([path, v]) => ({
          path,
          errors: v.errors,
          isComplete: v.isComplete
        })));
      }
    }
  }, [messages, isActuallyStreaming]);

  // Cleanup debounce ref on unmount
  // Note: The main safeFilesToShow update logic is now in the message parsing useEffect above
  // This useEffect is kept for cleanup only
  useEffect(() => {
    return () => {
      if (streamEndDebounceRef.current) {
        clearTimeout(streamEndDebounceRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    mobileMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fix for preview flickering:
  // We need to ensure that the preview only updates when we are NOT loading,
  // OR if it's the very first load, we might want to show something.
  // But CodeViewer handles isStreaming.
  // The issue might be that files state updates too often.
  // Actually, the CodeViewer fix (moving sharedProps out) should have fixed the flickering.
  // If it still flickers, it might be because of how Sandpack handles file updates.
  // But let's assume the CodeViewer fix works for now.
  
  // Check if content contains any XML code blocks (file or edit tags)
  const hasCodeBlocks = (content: string) => {
    return content.includes("<file path=") || content.includes("<edit path=") || content.includes("<boltArtifact");
  };

  // Extract text content without XML blocks
  const getTextContent = (content: string) => {
    return content
      // Remove boltArtifact blocks (including everything inside them)
      .replace(/<boltArtifact[^>]*>[\s\S]*?<\/boltArtifact>/g, '')
      // Remove unclosed boltArtifact tags (streaming)
      .replace(/<boltArtifact[^>]*>[\s\S]*/g, '')
      // Remove file tags
      .replace(/<file path="[^"]+">[\s\S]*?(?:<\/file>|$)/g, '')
      // Remove edit tags
      .replace(/<edit path="[^"]+" start="\d+" end="\d+">[\s\S]*?(?:<\/edit>|$)/g, '')
      .trim();
  };

  // Count files being generated/edited
  const getFileCount = (content: string) => {
    const fileMatches = content.match(/<file path="[^"]+"/g) || [];
    const editMatches = content.match(/<edit path="[^"]+"/g) || [];
    // Also count boltAction file entries
    const boltActionMatches = content.match(/<boltAction type="file" filePath="[^"]+"/g) || [];
    // Count unique paths
    const allPaths = new Set([
      ...fileMatches.map(m => m.match(/path="([^"]+)"/)?.[1]),
      ...editMatches.map(m => m.match(/path="([^"]+)"/)?.[1]),
      ...boltActionMatches.map(m => m.match(/filePath="([^"]+)"/)?.[1])
    ].filter(Boolean));
    return allPaths.size;
  };

  const formatMessageContent = (content: string) => {
    // Remove the XML file/edit tags and replace with a summary
    // Handle both complete tags and streaming (incomplete) tags
    return content
      .replace(/<file path="([^"]+)">([\s\S]*?)(?:<\/file>|$)/g, (match, path) => {
        return `[Created/Updated file: ${path}]\n`;
      })
      .replace(/<edit path="([^"]+)" start="\d+" end="\d+">([\s\S]*?)(?:<\/edit>|$)/g, (match, path) => {
        return `[Edited file: ${path}]\n`;
      })
      .trim();
  };

  const renderStyledText = (text: string) => {
    const parts = text.split(/(\*\*[\s\S]*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Check if this is the first generation (no previous assistant messages with code)
  const isFirstGeneration = !messages.some((m, idx) => 
    m.role === "assistant" && 
    (m.content.includes("<file") || m.content.includes("<edit")) && 
    idx < messages.length - 1
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    trackClick("send_message");
    submitMessage(input);
  }, [submitMessage, input, trackClick]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setInput((prev) => prev + (prev ? " " : "") + transcript);
  }, []);


  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {error && (
        <div className={`fixed ${isTrialMode && trialCompleted ? 'top-16' : 'top-4'} right-4 z-50 bg-red-500/10 text-red-400 p-4 rounded-xl shadow-lg max-w-md flex flex-col gap-2 border border-red-500/20 backdrop-blur-md`}>
          <div>
            <p className="font-bold text-sm">Error</p>
            <p className="text-xs opacity-90">{error}</p>
          </div>
          {(error === "Недостаточно кредитов" || error === "Дневной лимит исчерпан" || error === "Месячный лимит исчерпан") && (
            <Button asChild variant="secondary" size="sm" className="w-full mt-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border-none" onClick={() => trackClick("upgrade_plan")}>
              <Link href="/pricing">Upgrade Plan</Link>
            </Button>
          )}
        </div>
      )}

      {/* Баннер регистрации после trial */}
      {isTrialMode && trialCompleted && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-white" />
            <span className="text-sm font-medium text-white">
              Понравилось? Зарегистрируйтесь, чтобы продолжить редактирование, деплоить и экспортировать
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/login">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                Войти
              </Button>
            </a>
            <a href="/register">
              <Button size="sm" className="bg-white text-indigo-700 hover:bg-white/90 font-semibold">
                Создать аккаунт
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Mobile Layout (Simplified for now, keeping functional) */}
      <div className={`flex md:hidden flex-col h-full w-full relative bg-zinc-950 ${isTrialMode && trialCompleted ? 'pt-12' : ''}`}>
        {/* Mobile Header */}
        <div className="h-14 flex items-center justify-between px-4 shrink-0 bg-zinc-950/80 backdrop-blur-xl z-20 relative">
           <div className="flex items-center gap-3">
             {!showHistory && (
               <Link href="/" onClick={() => trackClick("mobile_back")} className="active:scale-95 transition-transform p-1 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white">
                 <ChevronLeft className="h-6 w-6" />
               </Link>
             )}
             <span className="font-semibold truncate max-w-[150px] text-sm">
               {showHistory ? "История" : (title || (isTrialMode ? "Пробная генерация" : "Новый чат"))}
             </span>
           </div>
           <div className="flex items-center gap-3">
             {!isTrialMode && (
             <motion.button 
               whileTap={{ scale: 0.9 }}
               onClick={() => { trackClick("mobile_toggle_history"); setShowHistory(!showHistory); }} 
               className={`p-2 rounded-full transition-colors ${showHistory ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}
             >
               <Archive className="h-5 w-5" />
             </motion.button>
             )}
             {userData && (
                <div className="w-12">
                  <UserProfile email={userData.email} plan={userData.plan} isCollapsed={true} side="bottom" />
                </div>
             )}
           </div>
        </div>

        {/* History Overlay */}
        <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-14 left-0 right-0 bottom-0 bg-zinc-950/95 backdrop-blur-xl z-30 overflow-hidden flex flex-col"
          >
             <div className="p-4 flex-1 overflow-y-auto">
                <SidebarChatList />
             </div>
             <div className="p-4 border-t border-white/5 bg-zinc-900/50 text-center text-xs text-zinc-500">
                Нажмите на иконку архива, чтобы закрыть
             </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden relative z-10 flex flex-col">
           <div className={`flex flex-col h-full ${mobileTab === 'chat' ? 'flex' : 'hidden'}`}>
                 <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                    <div className="space-y-6 pb-20">
                      {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center min-h-[400px] px-4">
                          <h1 className="text-3xl font-bold text-center mb-8 text-zinc-200">
                            {isTrialMode ? "Попробуйте Moonely бесплатно" : "Что будем строить?"}
                          </h1>
                          {isTrialMode && (
                            <p className="text-sm text-zinc-400 text-center mb-6 max-w-sm">
                              Опишите сайт, который хотите создать. У вас есть 1 бесплатный промпт — убедитесь, что Moonely работает!
                            </p>
                          )}
                          <div className="w-full">
                            <ChatSuggestions onSelect={(text) => setInput(text)} />
                          </div>
                        </div>
                      )}
                      {messages.map((msg, index) => (
                        <div key={index} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          {/* Images above message for user messages */}
                          {msg.role === "user" && msg.images && msg.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2 justify-end max-w-[90%]">
                              {msg.images.map((img, imgIndex) => (
                                <img
                                  key={imgIndex}
                                  src={img}
                                  alt={`Изображение ${imgIndex + 1}`}
                                  className="max-w-[120px] max-h-[90px] rounded-lg object-cover border border-white/20 shadow-lg"
                                />
                              ))}
                            </div>
                          )}
                          {/* Attachments above message for user messages (new format) */}
                          {msg.role === "user" && msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2 justify-end max-w-[90%]">
                              {msg.attachments.map((att, attIndex) => (
                                <img
                                  key={attIndex}
                                  src={att.url}
                                  alt={att.name}
                                  className="max-w-[120px] max-h-[90px] rounded-lg object-cover border border-white/20 shadow-lg"
                                />
                              ))}
                            </div>
                          )}
                          <div className={`max-w-[90%] text-sm ${
                              msg.role === "user"
                                ? "bg-indigo-600 text-white rounded-br-sm p-4 rounded-2xl"
                                : "text-zinc-300"
                            }`}>
                            {msg.role === "user" ? (
                              msg.content
                            ) : (
                              <div>
                                {/* Show text content if any */}
                                {getTextContent(msg.content) && (
                                  <div className="whitespace-pre-wrap mb-2">
                                    {renderStyledText(getTextContent(msg.content))}
                                  </div>
                                )}
                                
                                {/* Show Building UI card if there's code being generated */}
                                {hasCodeBlocks(msg.content) && (
                                  <BuildingCard 
                                    isActive={isLoading && index === messages.length - 1}
                                    fileCount={getFileCount(msg.content)}
                                    isComplete={!isLoading && !isApplying && index === messages.length - 1 || index !== messages.length - 1}
                                    isApplying={isApplying && index === messages.length - 1}
                                    isFirst={isFirstGeneration && index === messages.length - 1}
                                  />
                                )}
                                
                                {/* Show Fix Error button if there's a code error on the latest assistant message */}
                                {!isTrialMode && hasCodeError && index === messages.length - 1 && hasCodeBlocks(msg.content) && !isLoading && !isApplying && (
                                  <button
                                    onClick={() => { trackClick("fix_error_mobile"); handleRequestFix(codeErrorMessage 
                                      ? `Исправь ошибку в коде: ${codeErrorMessage}`
                                      : "Исправь ошибку в коде. Код не компилируется."
                                    ); }}
                                    className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/15 hover:border-red-500/30 transition-all text-xs font-medium"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Исправить ошибку</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Mobile typing indicator */}
                      {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                        <div className="flex flex-col items-start">
                          <ThinkingIndicator />
                        </div>
                      )}
                      
                      <div ref={mobileMessagesEndRef} />
                    </div>
                 </div>
                 
                 {/* Mobile Input */}
                 <div className="p-3 bg-zinc-950/90 backdrop-blur-xl shrink-0 z-20 rounded-t-3xl border-t border-white/5">
                    {isTrialMode && trialCompleted ? (
                      <div className="text-center py-3">
                        <p className="text-sm text-zinc-400 mb-3">Бесплатный промпт использован</p>
                        <a href="/register">
                          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                            Создать аккаунт и продолжить
                          </Button>
                        </a>
                      </div>
                    ) : (
                    <>
                    {/* Attachment Preview */}
                    <AttachmentPreview attachments={attachments} onRemove={handleAttachmentRemove} />
                    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                      <ImageUpload 
                        attachments={attachments} 
                        onAttachmentAdd={handleAttachmentAdd}
                        onAttachmentUpdate={handleAttachmentUpdate}
                        onAttachmentRemove={handleAttachmentRemove}
                        disabled={isLoading} 
                        className="h-11 w-11 flex items-center justify-center shrink-0" 
                      />
                      <TextareaAutosize
                        placeholder={isTrialMode ? "Опишите сайт, который хотите создать..." : "Введите сообщение..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex w-full rounded-2xl bg-zinc-950 px-4 py-3 text-base placeholder:text-zinc-600 focus:outline-none resize-none flex-1"
                        minRows={1}
                        maxRows={4}
                        disabled={isLoading}
                      />
                      <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} className="h-11 w-11 rounded-full shrink-0" />
                      <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && attachments.filter(a => a.status === "success").length === 0)} className="h-11 w-11 rounded-full shrink-0 bg-indigo-600 text-white shadow-lg">
                        <ArrowUp size={20} />
                      </Button>
                    </form>
                    </>
                    )}
                 </div>
           </div>
           
           <div className={`h-full w-full ${mobileTab === 'preview' ? 'block' : 'hidden'}`}>
              <CodeViewer 
                files={safeFilesToShow} 
                isStreaming={isActuallyStreaming} 
                isAnalyzing={isAnalyzing}
                showPreviewOnly={true} 
                chatId={currentChatId} 
                projectName={title} 
                isEmpty={isPreviewEmpty}
                onError={handleCodeError}
                onRequestFix={isTrialMode ? undefined : handleRequestFix}
                hasError={hasCodeError}
                canExport={isTrialMode ? false : userData?.plan !== 'FREE'}
              />
           </div>
        </div>

        {/* Mobile Bottom Bar */}
        <div className="bg-zinc-950/80 backdrop-blur-xl flex items-center justify-center gap-4 px-4 shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
           <div className="bg-black/40 p-1 rounded-full flex items-center shadow-lg relative border border-white/5">
              <button 
                onClick={() => { trackClick("mobile_tab_chat"); setMobileTab('chat'); }} 
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all relative z-10 ${mobileTab === 'chat' ? 'text-white' : 'text-zinc-500'}`}
              >
                {mobileTab === 'chat' && (
                  <motion.div
                    layoutId="mobile-tab-pill"
                    className="absolute inset-0 bg-zinc-800 rounded-full shadow-sm"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <MessageSquare className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Чат</span>
              </button>
              <button 
                onClick={() => { trackClick("mobile_tab_preview"); setMobileTab('preview'); }} 
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all relative z-10 ${mobileTab === 'preview' ? 'text-white' : 'text-zinc-500'}`}
              >
                {mobileTab === 'preview' && (
                  <motion.div
                    layoutId="mobile-tab-pill"
                    className="absolute inset-0 bg-zinc-800 rounded-full shadow-sm"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <LayoutTemplate className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Превью</span>
              </button>
           </div>
        </div>
      </div>

      {/* Desktop Layout - The "Slick Dark UI" */}
      <div className="hidden md:flex h-full w-full bg-zinc-950">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        
        {/* Left Panel: Chat Interface */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={45} className="flex flex-col bg-zinc-950 relative overflow-hidden">
          {/* Minimal Header */}
          <div className="px-6 py-4 flex items-center justify-between shrink-0 z-10">
            {isEditingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  handleRename(title);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsEditingTitle(false);
                    handleRename(title);
                  }
                }}
                className="h-8 text-sm font-medium bg-transparent border-none focus-visible:ring-0 px-0 w-full"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer overflow-hidden" onClick={() => { trackClick("edit_title"); setIsEditingTitle(true); }}>
                <h2 className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                  {title || "New Project"}
                </h2>
                <Pencil size={12} className="opacity-0 group-hover:opacity-50 transition-opacity text-zinc-500" />
              </div>
            )}
            <div className="flex items-center gap-2">
               {/* Publish to Showcase button - Admin only */}
               {userData?.role === "ADMIN" && hasRealGeneratedCode && (
                 <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
                   <DialogTrigger asChild>
                     <Button
                       variant="ghost"
                       size="sm"
                       className="h-8 px-3 text-xs text-zinc-400 hover:text-white hover:bg-white/10"
                       onClick={() => {
                         trackClick("publish_open");
                         setPublishTitle(title || "");
                         setPublishDescription("");
                         setPublishThumbnail("");
                         setThumbnailPreview(null);
                         setPublishError(null);
                       }}
                     >
                       <Upload size={14} className="mr-1.5" />
                       Publish
                     </Button>
                   </DialogTrigger>
                   <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                       <DialogTitle>Publish to Showcase</DialogTitle>
                       <DialogDescription>
                         Share this creation on the landing page for users to remix.
                       </DialogDescription>
                     </DialogHeader>
                     <div className="space-y-4 py-4">
                       <div className="space-y-2">
                         <label className="text-sm font-medium text-zinc-200">Title *</label>
                         <Input
                           value={publishTitle}
                           onChange={(e) => setPublishTitle(e.target.value)}
                           placeholder="My Awesome Landing Page"
                           className="bg-zinc-900 border-zinc-800"
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-sm font-medium text-zinc-200">Description</label>
                         <Input
                           value={publishDescription}
                           onChange={(e) => setPublishDescription(e.target.value)}
                           placeholder="A beautiful landing page for..."
                           className="bg-zinc-900 border-zinc-800"
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-sm font-medium text-zinc-200">Thumbnail</label>
                         <input
                           ref={thumbnailInputRef}
                           type="file"
                           accept="image/*"
                           onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (!file) return;
                             
                             // Show preview immediately
                             const previewUrl = URL.createObjectURL(file);
                             setThumbnailPreview(previewUrl);
                             setIsThumbnailUploading(true);
                             setPublishError(null);
                             
                             try {
                               const formData = new FormData();
                               formData.append("file", file);
                               
                               const response = await fetch("/api/upload", {
                                 method: "POST",
                                 body: formData,
                               });
                               
                               const data = await response.json();
                               
                               if (!response.ok) {
                                 throw new Error(data.error || "Upload failed");
                               }
                               
                               setPublishThumbnail(data.url);
                             } catch (error: any) {
                               setPublishError(error.message || "Failed to upload thumbnail");
                               setThumbnailPreview(null);
                               setPublishThumbnail("");
                             } finally {
                               setIsThumbnailUploading(false);
                             }
                           }}
                           className="hidden"
                         />
                         
                         {thumbnailPreview ? (
                           <div className="relative group">
                             <img
                               src={thumbnailPreview}
                               alt="Thumbnail preview"
                               className="w-full h-32 object-cover rounded-lg border border-zinc-800"
                             />
                             {isThumbnailUploading && (
                               <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                 <Loader2 className="h-6 w-6 animate-spin text-white" />
                               </div>
                             )}
                             <button
                               type="button"
                               onClick={() => {
                                 setThumbnailPreview(null);
                                 setPublishThumbnail("");
                                 if (thumbnailInputRef.current) {
                                   thumbnailInputRef.current.value = "";
                                 }
                               }}
                               className="absolute top-2 right-2 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                             >
                               <X className="h-4 w-4 text-white" />
                             </button>
                           </div>
                         ) : (
                           <button
                             type="button"
                             onClick={() => thumbnailInputRef.current?.click()}
                             className="w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-zinc-600 hover:bg-zinc-900/50 transition-colors"
                           >
                             <ImagePlus className="h-8 w-8 text-zinc-500" />
                             <span className="text-sm text-zinc-500">Click to upload thumbnail</span>
                           </button>
                         )}
                       </div>
                       {publishError && (
                         <p className="text-sm text-red-400">{publishError}</p>
                       )}
                     </div>
                     <DialogFooter>
                       <Button
                         variant="ghost"
                         onClick={() => { trackClick("publish_cancel"); setIsPublishDialogOpen(false); }}
                         disabled={isPublishing}
                       >
                         Cancel
                       </Button>
                       <Button
                         onClick={() => { trackClick("publish_confirm"); handlePublish(); }}
                         disabled={isPublishing || isThumbnailUploading || !publishTitle.trim()}
                         className="bg-indigo-600 hover:bg-indigo-700"
                       >
                         {isPublishing ? (
                           <>
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             Publishing...
                           </>
                         ) : (
                           "Publish"
                         )}
                       </Button>
                     </DialogFooter>
                   </DialogContent>
                 </Dialog>
               )}
            </div>
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6">
              <div className="space-y-8 pb-48 pt-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in duration-700">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-6 border border-white/5 shadow-2xl shadow-indigo-500/10">
                    <Bot className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h1 className="text-2xl font-semibold text-center mb-2 text-zinc-100">
                    {isTrialMode ? "Попробуйте Moonely бесплатно" : "Что вы хотите создать?"}
                  </h1>
                  <p className="text-zinc-500 text-center max-w-xs mb-8 text-sm">
                    {isTrialMode ? "У вас есть 1 бесплатный промпт — опишите идею и увидите результат" : "Опишите вашу идею и Moonely создаст её за считанные минуты"}
                  </p>
                  <div className="w-full max-w-md">
                    {!isTrialMode && <ChatSuggestions onSelect={(text) => setInput(text)} />}
                  </div>
                </div>
              )}
              
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[90%] ${msg.role === "user" ? "ml-12" : "mr-12"}`}>
                      {/* Images above message for user messages (legacy format) */}
                      {msg.role === "user" && msg.images && msg.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 justify-end">
                          {msg.images.map((img, imgIndex) => (
                            <img
                              key={imgIndex}
                              src={img}
                              alt={`Изображение ${imgIndex + 1}`}
                              className="max-w-[200px] max-h-[150px] rounded-xl object-cover border border-white/10 shadow-lg"
                            />
                          ))}
                        </div>
                      )}
                      {/* Attachments above message for user messages (new format) */}
                      {msg.role === "user" && msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 justify-end">
                          {msg.attachments.map((att, attIndex) => (
                            <img
                              key={attIndex}
                              src={att.url}
                              alt={att.name}
                              className="max-w-[200px] max-h-[150px] rounded-xl object-cover border border-white/10 shadow-lg"
                            />
                          ))}
                        </div>
                      )}
                      
                      <div
                        className={`text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-zinc-900 text-zinc-100 border border-white/5 p-4 rounded-2xl shadow-sm"
                            : "text-zinc-300"
                        }`}
                      >
                        {msg.role === "user" ? (
                          msg.content
                        ) : (
                          <div>
                            {/* Show text content if any */}
                            {getTextContent(msg.content) && (
                              <div className="whitespace-pre-wrap mb-2">
                                {renderStyledText(getTextContent(msg.content))}
                              </div>
                            )}
                            
                            {/* Show Building UI card if there's code being generated */}
                            {hasCodeBlocks(msg.content) && (
                              <BuildingCard 
                                isActive={isLoading && index === messages.length - 1}
                                fileCount={getFileCount(msg.content)}
                                isComplete={!isLoading && !isApplying && index === messages.length - 1 || index !== messages.length - 1}
                                isApplying={isApplying && index === messages.length - 1}
                                isFirst={isFirstGeneration && index === messages.length - 1}
                              />
                            )}
                            
                            {/* Show Fix Error button if there's a code error on the latest assistant message */}
                            {!isTrialMode && hasCodeError && index === messages.length - 1 && hasCodeBlocks(msg.content) && !isLoading && !isApplying && (
                              <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => { trackClick("fix_error_desktop"); handleRequestFix(codeErrorMessage 
                                  ? `Исправь ошибку в коде: ${codeErrorMessage}`
                                  : "Исправь ошибку в коде. Код не компилируется."
                                ); }}
                                className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/15 hover:border-red-500/30 transition-all text-xs font-medium"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Исправить ошибку</span>
                              </motion.button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="mr-12">
                    <ThinkingIndicator />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          </div>

          {/* Floating Input Card */}
          <div className="absolute bottom-4 left-6 right-6 z-20">
            {isTrialMode && trialCompleted ? (
              <div className="relative flex flex-col items-center bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/50">
                <p className="text-zinc-400 text-sm mb-3">Ваш пробный промпт использован</p>
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  Создать аккаунт и продолжить
                </a>
              </div>
            ) : (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <form 
                onSubmit={handleSubmit} 
                className="relative flex flex-col bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl shadow-black/50 transition-all duration-300 focus-within:border-indigo-500/30 focus-within:ring-1 focus-within:ring-indigo-500/20"
              >
                {/* Attachment Preview */}
                <AttachmentPreview attachments={attachments} onRemove={handleAttachmentRemove} />
                <TextareaAutosize
                  placeholder={isTrialMode ? "Опишите сайт, который хотите создать..." : "Попросите Moonely..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full bg-transparent border-none px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none max-h-32 min-h-[52px]"
                  minRows={1}
                  maxRows={5}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <div className="flex justify-between items-center px-2 pb-1">
                  <div className="flex gap-1">
                    <ImageUpload 
                      attachments={attachments} 
                      onAttachmentAdd={handleAttachmentAdd}
                      onAttachmentUpdate={handleAttachmentUpdate}
                      onAttachmentRemove={handleAttachmentRemove}
                      disabled={isLoading} 
                    />
                    <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} />
                  </div>
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isLoading || (!input.trim() && attachments.filter(a => a.status === "success").length === 0)} 
                    className="h-8 w-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <ArrowUp size={16} />
                  </Button>
                </div>
              </form>
            </div>
            )}
          </div>
        </ResizablePanel>

        {/* Right Panel: Preview Area (Browser Window) */}
        <ResizablePanel defaultSize={70} className="bg-zinc-950 relative flex flex-col">
          <div className="w-full h-full flex flex-col bg-zinc-950 overflow-hidden">
             <CodeViewer 
               files={safeFilesToShow} 
               isStreaming={isActuallyStreaming}
               isAnalyzing={isAnalyzing}
               activeTab={viewMode}
               onTabChange={setViewMode}
               hideHeader={false}
               chatId={currentChatId}
               projectName={title}
               isEmpty={isPreviewEmpty}
               onError={handleCodeError}
               onRequestFix={isTrialMode ? undefined : handleRequestFix}
               hasError={hasCodeError}
               canExport={isTrialMode ? false : userData?.plan !== 'FREE'}
             />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>
    </div>
  );
}