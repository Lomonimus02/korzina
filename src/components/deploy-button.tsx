"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Copy,
  AlertCircle,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeployButtonProps {
  files: Record<string, string>;
  chatId?: string;
  projectName?: string;
  className?: string;
}

type Step = "idle" | "preparing" | "success" | "error";

export function DeployButton({ files, chatId, className }: DeployButtonProps) {
  const { trackClick } = useAnalytics();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasExistingDeploy, setHasExistingDeploy] = useState(false);

  // Check if a deployment already exists for this chatId
  useEffect(() => {
    if (!isOpen || !chatId) return;
    let cancelled = false;
    fetch("/api/deploy")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const exists = data.deployments?.some(
          (d: any) => d.chatId === chatId && (d.status === "DEPLOYED" || d.status === "DEPLOYING")
        );
        setHasExistingDeploy(!!exists);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, chatId]);

  const handleOpen = () => {
    trackClick("deploy_open");
    setIsOpen(true);
    setStep("idle");
    setErrorMessage(null);
    setDeployedUrl(null);
  };

  const handleClose = () => {
    trackClick("deploy_close");
    setIsOpen(false);
  };

  const handlePublish = async () => {
    if (!chatId) {
      setErrorMessage("chatId не определён. Сохраните чат и попробуйте снова.");
      setStep("error");
      return;
    }

    trackClick("deploy_publish");
    setStep("preparing");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, chatId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при публикации");
      }

      setDeployedUrl(data.url);
      setStep("success");
    } catch (error: any) {
      console.error("Deploy error:", error);
      setErrorMessage(error.message || "Произошла ошибка при публикации");
      setStep("error");
    }
  };

  const copyToClipboard = (text: string) => {
    trackClick("deploy_copy_url");
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
        <DialogContent className="sm:max-w-[480px] bg-zinc-900 border-zinc-800">

          {/* ── Idle: confirm publish ── */}
          {step === "idle" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Rocket className="h-5 w-5 text-emerald-400" />
                  Опубликовать сайт
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Ваш сайт будет опубликован и доступен по уникальной ссылке.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-3">
                {hasExistingDeploy && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300">
                      У этого чата уже есть опубликованный сайт. Предыдущая версия будет заменена на новую по той же ссылке.
                    </p>
                  </div>
                )}
                <div className="bg-zinc-800/50 rounded-lg p-4 text-xs text-zinc-400 space-y-1">
                  <p>• Сайт публикуется на платформе Moonely.</p>
                  <p>• URL: <span className="text-zinc-300">{chatId}.deploy.moonely.ru</span></p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={handleClose}>
                  Отмена
                </Button>
                <Button
                  onClick={handlePublish}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Опубликовать
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Preparing ── */}
          {step === "preparing" && (
            <div className="py-10 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Подготовка публикации...</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Применяем защитный слой и регистрируем приложение
                </p>
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {step === "success" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Сайт подготовлен к публикации!
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                {/* URL block */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <p className="text-sm text-emerald-400 mb-2">Адрес вашего сайта:</p>
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="flex-1 min-w-0 bg-zinc-800 px-3 py-2 rounded text-white text-sm break-all">
                      {deployedUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(deployedUrl ?? "")}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(deployedUrl ?? "", "_blank")}
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>


              </div>

              <DialogFooter>
                <Button
                  onClick={() => window.open(deployedUrl ?? "", "_blank")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Открыть сайт
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  Ошибка публикации
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-sm text-red-400">
                    {errorMessage ?? "Произошла неизвестная ошибка"}
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-1 text-sm text-zinc-400">
                  <p>• Убедитесь, что вы авторизованы.</p>
                  <p>• Проверьте интернет-соединение и попробуйте снова.</p>
                  <p>• Если ошибка повторяется — свяжитесь с поддержкой.</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={handleClose}>
                  Закрыть
                </Button>
                <Button
                  onClick={() => {
                    setStep("idle");
                    setErrorMessage(null);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Попробовать снова
                </Button>
              </DialogFooter>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
