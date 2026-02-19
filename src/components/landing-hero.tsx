"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypewriterEffect } from "@/components/typewriter-effect";
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

// Simple image processing for landing page (base64 - will be uploaded when user logs in)
async function processImageFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null);
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      resolve(null);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX_SIZE = 1024;
        
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = (height / width) * MAX_SIZE;
            width = MAX_SIZE;
          } else {
            width = (width / height) * MAX_SIZE;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
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

export function LandingHero({ user }: LandingHeroProps) {
  const router = useRouter();
  const { trackClick } = useAnalytics();
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    try {
      for (const file of Array.from(files)) {
        const base64 = await processImageFile(file);
        if (base64) {
          setImages(prev => [...prev, base64]);
        }
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

    // Store images in sessionStorage to pass to chat
    // Note: These will be uploaded to cloud in the chat interface
    if (images.length > 0) {
      sessionStorage.setItem('pendingImages', JSON.stringify(images));
    }

    if (user) {
      // User is logged in, go to new chat with prompt
      router.push(`/new?q=${encodeURIComponent(prompt)}`);
    } else {
      // User is not logged in, go to register (could pass prompt to preserve it)
      router.push(`/register?q=${encodeURIComponent(prompt)}`);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setPrompt((prev) => prev + (prev ? " " : "") + transcript);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative px-4 pb-24">
      {/* Gradient Background - positioned at bottom like Lovable */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-t from-orange-500/30 via-purple-500/20 to-transparent opacity-60 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-4xl w-full">
        
        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">
          Создай что-то <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">прекрасное</span>
        </h1>
        
        <p className="text-xl text-white/60 max-w-2xl">
          Создавайте приложения и сайты, общаясь с ИИ
        </p>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
          <div className="relative bg-[#0e0e16] border border-white/10 md:border-white/15 rounded-2xl p-4 shadow-2xl md:shadow-[0_25px_50px_-12px_rgba(120,100,200,0.15)]">
            {/* Image Preview */}
            {images.length > 0 && (
              <div className="flex gap-2 p-2 flex-wrap mb-2">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="relative group/img rounded-lg overflow-hidden border border-white/10 md:border-white/15 bg-zinc-900"
                  >
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="h-16 w-16 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { trackClick("landing_remove_image"); setImages(images.filter((_, i) => i !== index)); }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white opacity-0 group-hover/img:opacity-100 transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              {!prompt && images.length === 0 && (
                <div className="absolute top-0 left-0 pointer-events-none text-white/30 text-lg">
                  <TypewriterEffect 
                    texts={[
                      "Опишите идею сайта...",
                      "Создай интернет-магазин одежды...",
                      "Сделай лендинг для фитнес-клуба...",
                      "Сайт-портфолио для фотографа...",
                      "Страница для кофейни с меню..."
                    ]} 
                  />
                </div>
              )}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="w-full bg-transparent text-white placeholder:text-transparent resize-none outline-none min-h-[60px] text-lg z-10 relative"
              />
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-1">
                {/* Simple image upload for landing page */}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all">
                    <ImagePlus className={`h-4 w-4 ${isProcessing ? "animate-pulse" : ""}`} />
                  </div>
                </label>
                <VoiceInput onTranscript={handleVoiceTranscript} />
              </div>
              <Button 
                type="submit" 
                size="icon" 
                className={`h-8 w-8 rounded-lg transition-all ${(prompt.trim() || images.length > 0) ? 'bg-white text-black hover:bg-white/90' : 'bg-white/10 text-white/30 hover:bg-white/20'}`}
                disabled={!prompt.trim() && images.length === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>

        <ChatSuggestions 
          onSelect={setPrompt} 
        />
      </div>
    </div>
  );
}
