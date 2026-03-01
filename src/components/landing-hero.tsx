"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ImagePlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatSuggestions } from "@/components/chat-suggestions";
import { VoiceInput } from "@/components/voice-input";
import { useAnalytics } from "@/hooks/use-analytics";

interface LandingHeroProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// ─── Typewriter hook ────────────────────────────────────────────────────────
const TYPEWRITER_TEXTS = [
  "Создай лендинг для барбершопа...",
  "Напиши CRM систему для флориста...",
  "Сделай сайт портфолио для фотографа...",
  "Создай дашборд для аналитики крипты...",
];

function useTypewriter() {
  const [placeholder, setPlaceholder] = useState("");
  const indexRef = useRef(0);
  const charRef = useRef(0);
  const deletingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function tick() {
      const current = TYPEWRITER_TEXTS[indexRef.current];
      if (!deletingRef.current) {
        charRef.current += 1;
        setPlaceholder(current.slice(0, charRef.current));
        if (charRef.current === current.length) {
          deletingRef.current = true;
          timeoutRef.current = setTimeout(tick, 2000);
          return;
        }
        timeoutRef.current = setTimeout(tick, 55);
      } else {
        charRef.current -= 1;
        setPlaceholder(current.slice(0, charRef.current));
        if (charRef.current === 0) {
          deletingRef.current = false;
          indexRef.current = (indexRef.current + 1) % TYPEWRITER_TEXTS.length;
          timeoutRef.current = setTimeout(tick, 350);
          return;
        }
        timeoutRef.current = setTimeout(tick, 28);
      }
    }
    timeoutRef.current = setTimeout(tick, 900);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return placeholder;
}

// ─── Image processing ────────────────────────────────────────────────────────
async function processImageFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) { resolve(null); return; }
    if (file.size > 4 * 1024 * 1024) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX_SIZE = 1024;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) { height = (height / width) * MAX_SIZE; width = MAX_SIZE; }
          else { width = (width / height) * MAX_SIZE; height = MAX_SIZE; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// ─── Hero component ───────────────────────────────────────────────────────────
export function LandingHero({ user }: LandingHeroProps) {
  const router = useRouter();
  const { trackClick } = useAnalytics();
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const typewriterText = useTypewriter();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    try {
      for (const file of Array.from(files)) {
        const base64 = await processImageFile(file);
        if (base64) setImages((prev) => [...prev, base64]);
      }
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && images.length === 0) return;
    trackClick("landing_submit");
    if (images.length > 0) sessionStorage.setItem("pendingImages", JSON.stringify(images));
    if (user) router.push(`/new?q=${encodeURIComponent(prompt)}`);
    else router.push(`/register?q=${encodeURIComponent(prompt)}`);
  };

  const handleVoiceTranscript = (transcript: string) => {
    setPrompt((prev) => prev + (prev ? " " : "") + transcript);
  };

  const hasContent = prompt.trim().length > 0 || images.length > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative px-4 pb-24 overflow-hidden"
      style={{ background: "radial-gradient(ellipse 80% 70% at 0% 50%, #0284c7 0%, #0ea5e9 20%, #38bdf8 40%, transparent 70%), radial-gradient(ellipse 75% 65% at 100% 0%, #ff4500 0%, #ff6a00 15%, #ff9500 30%, transparent 55%), radial-gradient(ellipse 65% 60% at 92% 35%, #7dd3fc 0%, #38bdf8 25%, #0ea5e9 50%, transparent 70%), radial-gradient(ellipse 70% 60% at 0% 100%, #ff4500 0%, #ff6a00 15%, #ff9500 30%, transparent 55%), radial-gradient(ellipse 90% 80% at 60% 65%, #7c3aed 0%, #a21caf 35%, #db2777 60%, transparent 100%), radial-gradient(ellipse 80% 70% at 100% 100%, #000002 0%, #010005 30%, transparent 70%), #010007" }}
    >

      {/* ── Animated blobs for depth & motion ────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">

        {/* top-left indigo pulse */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: "70vw", height: "70vw", top: "-10%", left: "-10%", background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 70%)", filter: "blur(40px)" }}
          animate={{ x: [0, 40, -20, 0], y: [0, 25, -15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />
        {/* center violet */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: "65vw", height: "65vw", top: "15%", left: "20%", background: "radial-gradient(circle, rgba(139,92,246,0.40) 0%, transparent 70%)", filter: "blur(45px)" }}
          animate={{ x: [0, -30, 25, 0], y: [0, 30, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 2 }}
        />
        {/* bottom-right pink */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: "75vw", height: "75vw", bottom: "-15%", right: "-10%", background: "radial-gradient(circle, rgba(236,72,153,0.45) 0%, transparent 65%)", filter: "blur(40px)" }}
          animate={{ x: [0, -35, 20, 0], y: [0, -25, 18, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear", delay: 4 }}
        />
        {/* subtle top fade so text stays readable */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{ height: "35%", background: "linear-gradient(to bottom, rgba(9,4,20,0.75) 0%, transparent 100%)" }}
        />
      </div>

      {/* ── Main content stack ────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-7 max-w-3xl w-full">

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1]"
        >
          Создай что-то прекрасное
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: "easeOut" }}
          className="text-lg text-white/60 max-w-lg leading-relaxed"
        >
          Профессиональный AI-конструктор. От идеи до готового сайта за 60 секунд.
        </motion.p>

        {/* ── Input box ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-2xl"
        >
          <div
            style={{
              borderRadius: "28px",
              padding: "2px",
              background: "rgba(38,38,48,0.95)",
            }}
          >
          <div
            style={{ background: "rgba(22,22,30,0.97)", backdropFilter: "blur(24px)", borderRadius: "26px", overflow: "hidden" }}
          >
            <form onSubmit={handleSubmit} className="p-5">

              {/* Image previews */}
              <AnimatePresence>
                {images.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 flex-wrap mb-4"
                  >
                    {images.map((image, index) => (
                      <div
                        key={index}
                        className="relative group/img rounded-xl overflow-hidden border border-white/10 bg-zinc-900"
                      >
                        <img src={image} alt={`Preview ${index + 1}`} className="h-16 w-16 object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            trackClick("landing_remove_image");
                            setImages(images.filter((_, i) => i !== index));
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-black/90 text-white/70 hover:text-white opacity-0 group-hover/img:opacity-100 transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Textarea */}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
                placeholder={typewriterText}
                rows={2}
                className="w-full bg-transparent text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-0 text-base leading-relaxed"
              />

              {/* Toolbar */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isProcessing}
                    />
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
                      <ImagePlus className={`h-4 w-4 ${isProcessing ? "animate-pulse" : ""}`} />
                    </div>
                  </label>
                  <VoiceInput onTranscript={handleVoiceTranscript} />
                </div>

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={!hasContent}
                  whileTap={{ scale: 0.88 }}
                  whileHover={hasContent ? { scale: 1.06 } : {}}
                  className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                    hasContent
                      ? "bg-white text-black shadow-lg"
                      : "bg-white/10 text-white/30 cursor-default"
                  }`}
                >
                  <ArrowUp className="h-4 w-4" />
                </motion.button>
              </div>
            </form>
          </div>
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full"
        >
          <ChatSuggestions onSelect={setPrompt} />
        </motion.div>
      </div>
    </div>
  );
}