"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Loader2, ArrowUp, ArrowLeft, Mail, Eye, EyeOff, Check } from "lucide-react";
import { TypewriterEffect } from "@/components/typewriter-effect";

function ForgotPasswordForm() {
  const router = useRouter();
  
  const [step, setStep] = useState<"email" | "verify" | "success">("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [autoLoginFailed, setAutoLoginFailed] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Ошибка отправки");
      }

      const data = await response.json();
      
      if (data.success) {
        setStep("verify");
        setResendCooldown(60);
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

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setAutoLoginFailed(false);

    const code = otpCode.join("");
    
    if (code.length !== 6) {
      setError("Введите 6-значный код");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      setIsLoading(false);
      return;
    }

    // Store password temporarily for auto-login (will be cleared after use)
    const passwordForLogin = newPassword;

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Ошибка сброса пароля");
      }

      const data = await response.json();
      
      if (data.success) {
        // Clear sensitive data from state immediately
        setNewPassword("");
        setOtpCode(["", "", "", "", "", ""]);
        
        // Attempt auto-login if server supports it
        if (data.autoLogin) {
          setIsAutoLoggingIn(true);
          setIsLoading(false);
          
          try {
            const signInResult = await signIn("credentials", {
              email: data.email || email,
              password: passwordForLogin,
              redirect: false,
            });

            if (signInResult?.ok && !signInResult?.error) {
              // Successful auto-login - redirect to dashboard
              router.push("/");
              return;
            } else {
              // Auto-login failed - show success with manual login option
              console.warn("Auto-login failed:", signInResult?.error);
              setAutoLoginFailed(true);
              setStep("success");
            }
          } catch (signInError) {
            // Auto-login error - show success with manual login option
            console.error("Auto-login error:", signInError);
            setAutoLoginFailed(true);
            setStep("success");
          } finally {
            setIsAutoLoggingIn(false);
          }
        } else {
          // Server doesn't support auto-login, show success page
          setStep("success");
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
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Ошибка отправки кода");
      }

      setOtpCode(["", "", "", "", "", ""]);
      setError("");
      setResendCooldown(60);
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
            
            {step === "email" && (
              <>
                <div className="grid gap-2 text-center">
                  <div className="flex justify-center mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                          <Moon className="w-6 h-6" />
                      </div>
                  </div>
                  <h1 className="text-3xl font-bold">Сброс пароля</h1>
                  <p className="text-balance text-muted-foreground">
                    Введите email для восстановления доступа к аккаунту
                  </p>
                </div>
                <form onSubmit={handleEmailSubmit} className="grid gap-4">
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
                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                  <Button 
                    type="submit" 
                    className="w-full bg-white text-black hover:bg-white/90 font-medium h-10 transition-all" 
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Отправить код
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm">
                  <Link href="/login" className="underline hover:text-primary transition-colors flex items-center justify-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    Вернуться к входу
                  </Link>
                </div>
              </>
            )}

            {step === "verify" && (
              <>
                <div className="grid gap-2 text-center">
                  <div className="flex justify-center mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                          <Mail className="w-6 h-6" />
                      </div>
                  </div>
                  <h1 className="text-3xl font-bold">Новый пароль</h1>
                  <p className="text-balance text-muted-foreground">
                    Мы отправили 6-значный код на<br />
                    <span className="text-white font-medium">{email}</span>
                  </p>
                </div>
                <form onSubmit={handleResetSubmit} className="grid gap-4">
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
                  <div className="grid gap-2">
                    <label htmlFor="newPassword" className="text-sm font-medium leading-none">Новый пароль</label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-zinc-900/50 border-white/10 focus:border-primary/50 transition-colors pr-10"
                        placeholder="Минимум 6 символов"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
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
                    disabled={isLoading || isAutoLoggingIn}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isAutoLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Выполняется вход...
                      </>
                    ) : (
                      "Сохранить пароль"
                    )}
                  </Button>
                </form>
                <div className="flex flex-col gap-2 mt-2">
                  <button 
                    type="button"
                    onClick={handleResendCode}
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
                      setStep("email");
                      setOtpCode(["", "", "", "", "", ""]);
                      setNewPassword("");
                      setError("");
                    }}
                    className="text-sm text-muted-foreground hover:text-white transition-colors text-center flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Изменить email
                  </button>
                </div>
              </>
            )}

            {step === "success" && (
              <>
                <div className="grid gap-2 text-center">
                  <div className="flex justify-center mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10 text-green-500">
                          <Check className="w-6 h-6" />
                      </div>
                  </div>
                  <h1 className="text-3xl font-bold">Готово!</h1>
                  <p className="text-balance text-muted-foreground">
                    {autoLoginFailed 
                      ? "Пароль успешно изменён. Войдите с новым паролем."
                      : "Пароль успешно изменён. Выполняется вход..."
                    }
                  </p>
                </div>
                {autoLoginFailed && (
                  <Button 
                    onClick={() => router.push("/login")}
                    className="w-full bg-white text-black hover:bg-white/90 font-medium h-10 transition-all"
                  >
                    Войти в аккаунт
                  </Button>
                )}
                {!autoLoginFailed && (
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Загрузка...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
