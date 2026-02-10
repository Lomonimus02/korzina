"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Globe, 
  ExternalLink, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Rocket,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Deployment {
  id: string;
  projectName: string;
  url: string | null;
  customDomain: string | null;
  status: "PENDING" | "DEPLOYING" | "DEPLOYED" | "FAILED";
  createdAt: Date;
  chatId: string | null;
}

interface DeploymentsClientProps {
  deployments: Deployment[];
}

export default function DeploymentsClient({ deployments: initialDeployments }: DeploymentsClientProps) {
  const [deployments, setDeployments] = useState(initialDeployments);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/deploy/${deleteId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setDeployments(deployments.filter(d => d.id !== deleteId));
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "DEPLOYED":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
          text: "Опубликован",
          color: "text-emerald-400",
        };
      case "DEPLOYING":
        return {
          icon: <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />,
          text: "Публикуется...",
          color: "text-indigo-400",
        };
      case "PENDING":
        return {
          icon: <Clock className="h-4 w-4 text-yellow-400" />,
          text: "Ожидает",
          color: "text-yellow-400",
        };
      case "FAILED":
        return {
          icon: <XCircle className="h-4 w-4 text-red-400" />,
          text: "Ошибка",
          color: "text-red-400",
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4 text-zinc-400" />,
          text: status,
          color: "text-zinc-400",
        };
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-emerald-400" />
              Мои сайты
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Управляйте опубликованными сайтами
            </p>
          </div>
        </div>

        {/* Empty State */}
        {deployments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <Rocket className="h-8 w-8 text-zinc-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Нет опубликованных сайтов</h2>
            <p className="text-zinc-500 mb-6 max-w-md">
              Создайте сайт в чате и нажмите кнопку "Опубликовать" чтобы разместить его в интернете.
            </p>
            <Link href="/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                Создать сайт
              </Button>
            </Link>
          </div>
        )}

        {/* Deployments List */}
        {deployments.length > 0 && (
          <div className="space-y-4">
            {deployments.map((deployment) => {
              const statusInfo = getStatusInfo(deployment.status);
              
              return (
                <div
                  key={deployment.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-zinc-500" />
                        <h3 className="font-medium truncate">{deployment.projectName}</h3>
                        <div className={cn("flex items-center gap-1", statusInfo.color)}>
                          {statusInfo.icon}
                          <span className="text-xs">{statusInfo.text}</span>
                        </div>
                      </div>
                      
                      {deployment.url && (
                        <a
                          href={deployment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-400 hover:text-indigo-300 truncate block"
                        >
                          {deployment.url}
                        </a>
                      )}
                      
                      {deployment.customDomain && (
                        <p className="text-xs text-zinc-500 mt-1">
                          Домен: {deployment.customDomain}
                        </p>
                      )}
                      
                      <p className="text-xs text-zinc-600 mt-2">
                        {formatDate(deployment.createdAt)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {deployment.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(deployment.url!, "_blank")}
                          className="text-zinc-400 hover:text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {deployment.chatId && (
                        <Link href={`/c/${deployment.chatId}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white text-xs"
                          >
                            Редактировать
                          </Button>
                        </Link>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(deployment.id)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Удалить сайт?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Сайт будет удалён с хостинга Vercel и станет недоступен. 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
