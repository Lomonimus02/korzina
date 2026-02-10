"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Globe, 
  Loader2, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  AlertCircle,
  Rocket,
  Key,
  HelpCircle,
  Link2,
  Unlink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeployButtonProps {
  files: Record<string, string>;
  chatId?: string;
  projectName?: string;
  className?: string;
}

type DeployStep = "loading" | "connect" | "initial" | "token" | "deploying" | "success" | "error";

interface VercelStatus {
  connected: boolean;
  vercelUsername?: string;
  vercelEmail?: string;
  reason?: string;
}

export function DeployButton({ files, chatId, projectName, className }: DeployButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<DeployStep>("loading");
  const [vercelToken, setVercelToken] = useState("");
  const [vercelStatus, setVercelStatus] = useState<VercelStatus | null>(null);
  const [customProjectName, setCustomProjectName] = useState(projectName || "my-site");
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showDomainHelp, setShowDomainHelp] = useState(false);

  // Проверяем статус подключения Vercel при открытии диалога
  const checkVercelStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const response = await fetch("/api/vercel/status");
      const data = await response.json();
      
      setVercelStatus(data);
      
      if (data.connected) {
        setStep("initial");
      } else {
        setStep("connect");
      }
    } catch (error) {
      console.error("Error checking Vercel status:", error);
      setStep("connect");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setErrorMessage(null);
    checkVercelStatus();
  };

  const handleClose = () => {
    setIsOpen(false);
    // Сбрасываем состояние только если не успех
    if (step !== "success") {
      setStep("loading");
    }
  };

  // OAuth подключение — открываем в новом окне
  const handleConnectVercel = () => {
    // Открываем OAuth в popup окне
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      "/api/vercel/authorize",
      "vercel_oauth",
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    // Проверяем статус после закрытия popup
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        // Проверяем статус подключения
        setTimeout(() => {
          checkVercelStatus();
        }, 500);
      }
    }, 500);
  };

  // Отключение Vercel
  const handleDisconnectVercel = async () => {
    try {
      await fetch("/api/vercel/disconnect", { method: "POST" });
      setVercelStatus(null);
      setStep("connect");
    } catch (error) {
      console.error("Error disconnecting Vercel:", error);
    }
  };

  // Ручной ввод токена (fallback)
  const handleSaveToken = () => {
    if (vercelToken.trim()) {
      // Сохраняем токен через API deploy (он сохранит его в БД)
      setStep("initial");
    }
  };

  const handleDeploy = async () => {
    // Для OAuth используем токен из БД (API сам его возьмёт)
    // Для ручного ввода передаём токен
    const token = vercelStatus?.connected ? undefined : vercelToken.trim();
    
    if (!vercelStatus?.connected && !token) {
      setStep("connect");
      return;
    }

    setIsLoading(true);
    setStep("deploying");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          projectName: customProjectName || "my-site",
          chatId,
          // Передаём токен только если ввели вручную
          ...(token && { vercelToken: token }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при публикации");
      }

      setDeployedUrl(data.url);
      setStep("success");

      // Polling для проверки статуса если ещё билдится
      if (data.status === "QUEUED" || data.status === "BUILDING") {
        pollDeploymentStatus(data.deploymentId);
      }

    } catch (error: any) {
      console.error("Deploy error:", error);
      setErrorMessage(error.message || "Произошла ошибка при публикации");
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const pollDeploymentStatus = async (deploymentId: string) => {
    const maxAttempts = 60; // 5 минут максимум
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/deploy/${deploymentId}`);
        const data = await response.json();

        if (data.status === "DEPLOYED") {
          setDeployedUrl(data.url);
          return;
        }

        if (data.status === "FAILED") {
          setErrorMessage("Сборка завершилась с ошибкой");
          setStep("error");
          return;
        }

        // Продолжаем проверять
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    };

    setTimeout(checkStatus, 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        title="Опубликовать сайт"
        className={cn(
          "h-7 w-7 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10",
          className
        )}
      >
        <Globe size={14} />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800">
          {/* Шаг: Загрузка статуса */}
          {step === "loading" && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-zinc-400">Проверяем подключение...</p>
            </div>
          )}

          {/* Шаг: Подключение Vercel (OAuth) */}
          {step === "connect" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Link2 className="h-5 w-5 text-indigo-400" />
                  Подключите Vercel
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Для публикации сайта нужно подключить ваш аккаунт Vercel. Это бесплатно!
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-10 h-10" viewBox="0 0 76 65" fill="white">
                      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Войдите через Vercel
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Нажмите кнопку ниже — откроется страница Vercel для авторизации
                  </p>
                  <Button
                    onClick={handleConnectVercel}
                    className="bg-white text-black hover:bg-zinc-200 font-medium px-6"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 76 65" fill="currentColor">
                      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                    </svg>
                    Подключить Vercel
                  </Button>
                </div>

                {/* Пошаговая инструкция */}
                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-indigo-400" />
                    Что нужно сделать после нажатия:
                  </h4>
                  <ol className="text-sm text-zinc-400 space-y-3 list-decimal list-inside">
                    <li>
                      <span className="text-zinc-300">Войдите в Vercel</span> — если у вас нет аккаунта, зарегистрируйтесь бесплатно через GitHub, GitLab или email
                    </li>
                    <li>
                      <span className="text-zinc-300">Выберите аккаунт/команду</span> — в выпадающем списке "Select Account" выберите ваш личный аккаунт или команду
                    </li>
                    <li>
                      <span className="text-zinc-300">Выберите "All Projects"</span> — это позволит публиковать любые сайты (рекомендуется)
                    </li>
                    <li>
                      <span className="text-zinc-300">Нажмите "Continue"</span> — кнопка внизу страницы, затем следуйте инструкциям до завершения
                    </li>
                  </ol>
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <p className="text-xs text-zinc-500">
                      ✓ Moonely получит доступ только к публикации сайтов<br/>
                      ✓ Вы сможете отключить интеграцию в любой момент<br/>
                      ✓ Никакие другие данные не будут доступны
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => setStep("token")}
                    className="text-xs text-zinc-500 hover:text-zinc-400 underline"
                  >
                    Или введите токен вручную
                  </button>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-medium text-white">Что такое Vercel?</h4>
                  <p className="text-xs text-zinc-400">
                    Vercel — бесплатный хостинг для сайтов. Ваш сайт будет доступен по адресу 
                    <code className="bg-zinc-700 px-1 rounded mx-1">your-site.vercel.app</code>
                    и вы сможете привязать свой домен.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={handleClose}>
                  Отмена
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Шаг: Ввод токена (fallback) */}
          {step === "token" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Key className="h-5 w-5 text-indigo-400" />
                  Ручной ввод токена
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Альтернативный способ подключения через токен.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-indigo-400" />
                    Как получить токен:
                  </h4>
                  <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                    <li>
                      Зайдите на{" "}
                      <a
                        href="https://vercel.com/account/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 underline"
                      >
                        vercel.com/account/tokens
                      </a>
                    </li>
                    <li>Нажмите "Create Token"</li>
                    <li>Введите любое название (например, "Moonely")</li>
                    <li>Scope: выберите "Full Account"</li>
                    <li>Скопируйте токен и вставьте ниже</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Vercel Token
                  </label>
                  <Input
                    type="password"
                    placeholder="Вставьте токен сюда..."
                    value={vercelToken}
                    onChange={(e) => setVercelToken(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <p className="text-xs text-zinc-500">
                  🔒 Токен хранится безопасно и используется только для публикации ваших сайтов.
                </p>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setStep("connect")}>
                  ← Назад
                </Button>
                <Button
                  onClick={handleSaveToken}
                  disabled={!vercelToken.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Продолжить
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Шаг: Начальный (выбор имени проекта) */}
          {step === "initial" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Rocket className="h-5 w-5 text-emerald-400" />
                  Публикация сайта
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Ваш сайт будет опубликован в интернете и доступен по ссылке.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Название проекта
                  </label>
                  <Input
                    placeholder="my-awesome-site"
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-zinc-500">
                    Будет использовано в URL: {customProjectName || "my-site"}-xxx.vercel.app
                  </p>
                </div>

                {/* Показываем статус подключения Vercel */}
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">
                      Vercel подключён
                      {vercelStatus?.vercelUsername && (
                        <span className="text-zinc-400 ml-1">
                          (@{vercelStatus.vercelUsername})
                        </span>
                      )}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectVercel}
                    className="text-xs text-zinc-500 hover:text-red-400"
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    Отключить
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={handleClose}>
                  Отмена
                </Button>
                <Button
                  onClick={handleDeploy}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Опубликовать
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Шаг: Процесс деплоя */}
          {step === "deploying" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                  Публикация...
                </DialogTitle>
              </DialogHeader>

              <div className="py-8 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">Собираем ваш сайт</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Обычно это занимает 30-60 секунд
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Шаг: Успех */}
          {step === "success" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Сайт опубликован!
                </DialogTitle>
              </DialogHeader>

              <div className="py-6 space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 overflow-hidden">
                  <p className="text-sm text-emerald-400 mb-2">Ваш сайт доступен по адресу:</p>
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="flex-1 min-w-0 bg-zinc-800 px-3 py-2 rounded text-white text-sm break-all">
                      {deployedUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(deployedUrl || "")}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(deployedUrl || "", "_blank")}
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Важная инструкция для публичного доступа */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2 overflow-hidden">
                  <h4 className="text-sm font-medium text-amber-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Важно! Сделайте сайт публичным:
                  </h4>
                  <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
                    <li>Откройте <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">vercel.com/dashboard</a></li>
                    <li>Выберите ваш проект</li>
                    <li>Settings → Deployment Protection</li>
                    <li>Выключите "Vercel Authentication"</li>
                  </ol>
                  <p className="text-xs text-zinc-500 mt-2">
                    Если не сделать сайт публичным, он будет доступен только после авторизации в Vercel
                  </p>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2 overflow-hidden">
                  <h4 className="text-sm font-medium text-white">Что ещё можно сделать:</h4>
                  <ul className="text-sm text-zinc-400 space-y-1">
                    <li>• <button onClick={() => setShowDomainHelp(true)} className="text-blue-400 hover:underline cursor-pointer">Привяжите свой домен</button> в панели Vercel</li>
                    <li>• Обновляйте сайт — изменения применятся автоматически</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => window.open(deployedUrl || "", "_blank")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Открыть сайт
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Шаг: Ошибка */}
          {step === "error" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  Ошибка публикации
                </DialogTitle>
              </DialogHeader>

              <div className="py-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-sm text-red-400">
                    {errorMessage || "Произошла неизвестная ошибка"}
                  </p>
                </div>

                <div className="mt-4 bg-zinc-800/50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-medium text-white">Возможные решения:</h4>
                  <ul className="text-sm text-zinc-400 space-y-1">
                    <li>• Переподключите Vercel аккаунт</li>
                    <li>• Убедитесь, что у вас есть интернет-соединение</li>
                    <li>• Попробуйте ещё раз через минуту</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={handleClose}>
                  Закрыть
                </Button>
                <Button
                  onClick={() => {
                    setStep("connect");
                    setErrorMessage(null);
                    setVercelStatus(null);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Переподключить Vercel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Модальное окно с инструкцией по привязке домена */}
      <Dialog open={showDomainHelp} onOpenChange={setShowDomainHelp}>
        <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-400" />
              Как привязать свой домен
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm text-zinc-400">
              Вы можете привязать собственный домен (например, mysite.com) к вашему сайту на Vercel.
            </p>
            
            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-white">Пошаговая инструкция:</h4>
              <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                <li>Откройте <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">vercel.com/dashboard</a></li>
                <li>Выберите ваш проект</li>
                <li>Перейдите в <span className="text-white">Settings → Domains</span></li>
                <li>Нажмите <span className="text-white">Add Domain</span></li>
                <li>Введите ваш домен и нажмите <span className="text-white">Add</span></li>
                <li>Скопируйте DNS-записи, которые покажет Vercel</li>
                <li>Добавьте эти записи у вашего регистратора домена</li>
                <li>Подождите 5-30 минут пока DNS обновится</li>
              </ol>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-400">
                💡 Vercel автоматически выдаст SSL-сертификат для вашего домена бесплатно
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowDomainHelp(false)}>
              Понятно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
