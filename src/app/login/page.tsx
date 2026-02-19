"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Loader2, ArrowUp, Eye, EyeOff } from "lucide-react";
import { TypewriterEffect } from "@/components/typewriter-effect";
import { useAnalytics } from "@/hooks/use-analytics";

// Google Icon SVG Component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const { trackClick } = useAnalytics();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const redirectUrl = searchParams.get("redirect"); // Support for redirect parameter
  const q = searchParams.get("q"); // Legacy support if q is passed directly

  // Determine final redirect destination
  const getRedirectUrl = () => {
    if (callbackUrl) return callbackUrl;
    if (redirectUrl) return redirectUrl;
    if (q) return `/new?q=${encodeURIComponent(q)}`;
    return "/";
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    trackClick("login_google");
    setIsGoogleLoading(true);
    setError("");
    try {
      await signIn("google", {
        callbackUrl: getRedirectUrl(),
      });
    } catch (error) {
      setError("Ошибка входа через Google");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackClick("login_submit");
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Неверный email или пароль");
      } else {
        router.push(getRedirectUrl());
        router.refresh();
      }
    } catch (error) {
      setError("Что-то пошло не так");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-zinc-950 selection:bg-primary/20">
      {/* Concentrated Right-Side Glow */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
          {/* Deep Purple Core */}
          <div className="absolute top-[50%] right-[-5%] -translate-y-1/2 w-[50vw] h-[50vw] min-w-[600px] min-h-[600px] bg-purple-600/20 rounded-full blur-[130px] mix-blend-screen" />
          
          {/* Upper Blue/Indigo Accent */}
          <div className="absolute top-[10%] right-[-10%] w-[40vw] h-[40vw] min-w-[500px] min-h-[500px] bg-indigo-500/15 rounded-full blur-[100px] mix-blend-screen" />
          
          {/* Lower Pink/Purple Accent */}
          <div className="absolute bottom-[10%] right-[-10%] w-[40vw] h-[40vw] min-w-[500px] min-h-[500px] bg-fuchsia-500/15 rounded-full blur-[100px] mix-blend-screen" />
          
          {/* Vignette/Fade to keep left side dark */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />
      </div>

      <div className="relative z-10 w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
        <div className="flex items-center justify-center py-12 px-4">
          <div className="mx-auto grid w-[350px] gap-6 bg-zinc-950/40 backdrop-blur-sm p-8 rounded-2xl border border-white/5 shadow-2xl">
            <div className="grid gap-2 text-center">
              <div className="flex justify-center mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                      <Moon className="w-6 h-6" />
                  </div>
              </div>
              <h1 className="text-3xl font-bold">Вход</h1>
              <p className="text-balance text-muted-foreground">
                Введите email и пароль для входа в аккаунт
              </p>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-900/50 border-white/10 focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Пароль</label>
                  <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Забыли пароль?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-900/50 border-white/10 focus:border-primary/50 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => { trackClick("login_toggle_password"); setShowPassword(!showPassword); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <Button 
                type="submit" 
                className="w-full bg-white text-black hover:bg-white/90 font-medium h-10 transition-all" 
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Войти
              </Button>
            </form>
            
            {/* OAuth Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-950/40 px-2 text-muted-foreground">или</span>
              </div>
            </div>
            
            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full bg-zinc-900/50 border-white/10 hover:bg-zinc-800/50 hover:border-white/20 font-medium h-10 transition-all"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-4 w-4" />
              )}
              Войти через Google
            </Button>
            
            <div className="mt-4 text-center text-sm">
              Нет аккаунта?{" "}
              <Link href={`/register${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="underline hover:text-primary transition-colors">
                Регистрация
              </Link>
            </div>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center justify-center p-10 relative">
            <div className="w-full max-w-[420px]">
                <div className="relative group cursor-default">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-orange-500/30 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                    <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2 flex items-center justify-between shadow-2xl">
                        <div className="pl-4 text-zinc-100 text-sm font-medium tracking-wide w-full">
                            <TypewriterEffect 
                                texts={[
                                  "Создай приложение своей мечты...",
                                  "Создай интернет-магазин...",
                                  "Создай личный блог...",
                                  "Создай CRM систему...",
                                  "Создай лендинг пейдж..."
                                ]} 
                            />
                        </div>
                        <div className="bg-zinc-900 p-2 rounded-xl shrink-0 cursor-pointer hover:bg-zinc-800 transition-colors flex items-center justify-center w-10 h-10">
                             <ArrowUp className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Загрузка...</div>}>
      <LoginForm />
    </Suspense>
  );
}
