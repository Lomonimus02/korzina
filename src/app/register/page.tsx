"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Loader2, ArrowUp, ArrowLeft, Mail, Eye, EyeOff } from "lucide-react";
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

function RegisterForm() {
  const router = useRouter();
  const { trackClick } = useAnalytics();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const q = searchParams.get("q");
  const ref = searchParams.get("ref");
  
  const [step, setStep] = useState<"register" | "verify">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleGoogleSignIn = async () => {
    trackClick("register_google");
    setIsGoogleLoading(true);
    setError("");
    try {
      await signIn("google", {
        callbackUrl: callbackUrl || (q ? `/new?q=${encodeURIComponent(q)}` : "/account"),
      });
    } catch (error) {
      setError("Ошибка регистрации через Google");
      setIsGoogleLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackClick("register_submit");
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ref: ref || undefined }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Ошибка регистрации");
      }

      const data = await response.json();
      
      if (data.success) {
        // DEV MODE: If already verified, auto sign in
        if (data.verified) {
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (result?.ok) {
            // Link trial project if cookie exists
            try { await fetch("/api/trial/link", { method: "POST" }); } catch {}
            const redirectUrl = callbackUrl || (q ? `/new?q=${encodeURIComponent(q)}` : "/account");
            router.push(redirectUrl);
          } else {
            router.push("/login");
          }
          return;
        }
        
        // Normal flow: go to verification step
        setStep("verify");
        setResendCooldown(60); // Start 60 second cooldown
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Что-то пошло не так");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split("");
      const newOtp = [...otpCode];
      pastedCode.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtpCode(newOtp);
      const nextIndex = Math.min(index + pastedCode.length, 5);
      otpInputs.current[nextIndex]?.focus();
      return;
    }
    
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const code = otpCode.join("");
    
    if (code.length !== 6) {
      setError("Введите 6-значный код");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Ошибка подтверждения");
      }

      const data = await response.json();
      
      if (data.success) {
        // Auto sign in after successful verification
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.ok) {
          // Link trial project if cookie exists
          try { await fetch("/api/trial/link", { method: "POST" }); } catch {}
          // Redirect to account or callback URL
          const redirectUrl = callbackUrl || (q ? `/new?q=${encodeURIComponent(q)}` : "/account");
          router.push(redirectUrl);
        } else {
          // Fallback to login if auto-signin fails
          router.push("/login");
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Что-то пошло не так");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return; // Prevent resend during cooldown
    
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Ошибка отправки кода");
      }

      setOtpCode(["", "", "", "", "", ""]);
      setError("");
      setResendCooldown(60); // Start 60 second cooldown after successful resend
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Что-то пошло не так");
      }
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
            
            {step === "register" ? (
              <>
                <div className="grid gap-2 text-center">
                  <div className="flex justify-center mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                          <Moon className="w-6 h-6" />
                      </div>
                  </div>
                  <h1 className="text-3xl font-bold">Регистрация</h1>
                  <p className="text-balance text-muted-foreground">
                    Создайте аккаунт, чтобы начать использовать Moonely
                  </p>
                </div>
                <form onSubmit={handleRegisterSubmit} className="grid gap-4">
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
                    <div className="flex items-center">
                      <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Пароль</label>
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
                        onClick={() => { trackClick("register_toggle_password"); setShowPassword(!showPassword); }}
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
                    Зарегистрироваться
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
                  Продолжить с Google
                </Button>
                
                <div className="mt-4 text-center text-sm">
                  Уже есть аккаунт?{" "}
                  <Link href="/login" className="underline hover:text-primary transition-colors">
                    Войти
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2 text-center">
                  <div className="flex justify-center mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                          <Mail className="w-6 h-6" />
                      </div>
                  </div>
                  <h1 className="text-3xl font-bold">Подтверждение</h1>
                  <p className="text-balance text-muted-foreground">
                    Мы отправили 6-значный код на<br />
                    <span className="text-white font-medium">{email}</span>
                  </p>
                </div>
                <form onSubmit={(e) => { trackClick("register_verify_submit"); handleVerifySubmit(e); }} className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium leading-none text-center">Код подтверждения</label>
                    <div className="flex gap-2 justify-center">
                      {otpCode.map((digit, index) => (
                        <Input
                          key={index}
                          ref={(el) => { otpInputs.current[index] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-11 h-12 text-center text-lg font-semibold bg-zinc-900/50 border-white/10 focus:border-primary/50 transition-colors"
                        />
                      ))}
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                  <Button 
                    type="submit" 
                    className="w-full bg-white text-black hover:bg-white/90 font-medium h-10 transition-all" 
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Подтвердить
                  </Button>
                </form>
                <div className="flex flex-col gap-2 mt-2">
                  <button 
                    type="button"
                    onClick={() => { trackClick("register_resend_code"); handleResendCode(); }}
                    disabled={isLoading || resendCooldown > 0}
                    className={`text-sm transition-colors text-center ${
                      resendCooldown > 0 
                        ? "text-muted-foreground/50 cursor-not-allowed" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    {resendCooldown > 0 
                      ? `Отправить повторно через ${resendCooldown} сек` 
                      : "Отправить код повторно"
                    }
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      trackClick("register_back");
                      setStep("register");
                      setOtpCode(["", "", "", "", "", ""]);
                      setError("");
                    }}
                    className="text-sm text-muted-foreground hover:text-white transition-colors text-center flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Назад к регистрации
                  </button>
                </div>
              </>
            )}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Загрузка...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
