"use client";

import Link from "next/link";
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAnalytics } from "@/hooks/use-analytics";

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
}

interface SidebarChatListProps {
  initialChats?: Chat[];
}

export function SidebarChatList({ initialChats = [] }: SidebarChatListProps) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const pathname = usePathname();
  const router = useRouter();
  const { trackClick } = useAnalytics();

  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [chatToRename, setChatToRename] = useState<Chat | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialChats && initialChats.length > 0) {
      setChats(initialChats);
    }
  }, [initialChats]);

  useEffect(() => {
    const handleRefresh = async () => {
      try {
        const res = await fetch("/api/chats");
        if (res.ok) {
          const data = await res.json();
          setChats(data);
        }
      } catch (error) {
        console.error("Failed to refresh chats:", error);
      }
    };

    // If no initial chats provided, fetch them
    if (!initialChats || initialChats.length === 0) {
        handleRefresh();
    }

    window.addEventListener("refresh-sidebar", handleRefresh);
    return () => window.removeEventListener("refresh-sidebar", handleRefresh);
  }, []);

  const handleDelete = async () => {
    if (!chatToDelete) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat/${chatToDelete}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setChats(chats.filter((c) => c.id !== chatToDelete));
        if (pathname === `/c/${chatToDelete}`) {
          router.push("/");
        }
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    } finally {
      setIsLoading(false);
      setChatToDelete(null);
    }
  };

  const handleRename = async () => {
    if (!chatToRename || !renameValue.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat/${chatToRename.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue }),
      });

      if (res.ok) {
        setChats(
          chats.map((c) =>
            c.id === chatToRename.id ? { ...c, title: renameValue } : c
          )
        );
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to rename chat:", error);
    } finally {
      setIsLoading(false);
      setChatToRename(null);
    }
  };

  return (
    <div className="space-y-0.5 px-2">
      {chats.map((chat) => {
        const isActive = pathname === `/c/${chat.id}`;
        return (
        <div
          key={chat.id}
          className="group relative w-full"
        >
          <div
            className={cn(
              "w-full h-9 grid grid-cols-[1fr_auto] rounded-md transition-all duration-150",
              isActive 
                ? "bg-white/10 text-white" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            )}
          >
            <Link
              href={`/c/${chat.id}`}
              className="flex items-center min-w-0 h-full px-3"
            >
              <MessageSquare size={14} className="mr-2.5 shrink-0 opacity-50" />
              <span className="truncate text-sm" title={chat.title}>
                {chat.title || "Новый чат"}
              </span>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  role="button"
                  className="h-full w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white/10 rounded-r-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal size={14} className="text-zinc-500" />
                  <span className="sr-only">Еще</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10">
                <DropdownMenuItem
                  onClick={() => {
                    trackClick("chat_rename_open");
                    setChatToRename(chat);
                    setRenameValue(chat.title);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Переименовать
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => { trackClick("chat_delete_init"); setChatToDelete(chat.id); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      );
      })}
      
      {chats.length === 0 && (
        <div className="text-sm text-gray-600 text-center py-8">
          Нет чатов
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие безвозвратно удалит этот чат и все сообщения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                trackClick("chat_delete_confirm");
                handleDelete();
              }}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={!!chatToRename} onOpenChange={(open) => !open && setChatToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать чат</DialogTitle>
            <DialogDescription>
              Введите новое название для чата.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Название чата"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChatToRename(null)} disabled={isLoading}>
              Отмена
            </Button>
            <Button onClick={() => { trackClick("chat_rename_confirm"); handleRename(); }} disabled={isLoading || !renameValue.trim()}>
              {isLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
