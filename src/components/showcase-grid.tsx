"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Sparkles, Loader2, X, Code2, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { deleteShowcaseItem } from "@/app/actions/showcase";

// Dynamically import CodeViewer to avoid SSR issues with Sandpack
const CodeViewer = dynamic(() => import("@/components/code-viewer"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-zinc-900 flex items-center justify-center text-zinc-500">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ),
});

interface ShowcaseItem {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  filesSnapshot: Record<string, string>;
  chatId: string | null;
  createdAt: string;
}

interface ShowcaseGridProps {
  items: ShowcaseItem[];
  isLoggedIn: boolean;
  isAdmin?: boolean;
}

export function ShowcaseGrid({ items: initialItems, isLoggedIn, isAdmin = false }: ShowcaseGridProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(null);
  const [isRemixing, setIsRemixing] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ShowcaseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRemix = async () => {
    if (!selectedItem) return;
    
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=/");
      return;
    }

    setIsRemixing(true);
    try {
      const res = await fetch("/api/chat/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showcaseId: selectedItem.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to remix");
      }

      const { newChatId } = await res.json();
      router.push(`/c/${newChatId}`);
    } catch (error) {
      console.error("Failed to remix:", error);
      alert("Не удалось создать копию. Попробуйте ещё раз.");
    } finally {
      setIsRemixing(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteShowcaseItem(itemToDelete.id);
      setItems(items.filter(item => item.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Не удалось удалить шаблон. Попробуйте ещё раз.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {/* Card-like container as separate block - 80% width on desktop, with side margins on mobile */}
      <div className="relative w-[calc(100%-2rem)] md:w-[85%] lg:w-[80%] mx-auto bg-zinc-950 rounded-[2.5rem] border border-zinc-800/50">
        <section className="w-full px-6 md:px-10 py-10">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Шаблоны
            </h2>
            <p className="text-zinc-400 text-base md:text-lg">
              Начните с готового шаблона
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                {/* Admin delete button */}
                {isAdmin && (
                  <div className="absolute -top-2 -right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item);
                      }}
                      className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Image with rounded corners */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl mb-3">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 rounded-xl">
                      <Code2 className="w-12 h-12 text-zinc-600" />
                    </div>
                  )}
                </div>
                {/* Title and description below image */}
                <h3 className="font-semibold text-white truncate mb-0.5 group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-zinc-500 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Preview Modal - 65% on desktop, full on mobile */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent 
          className="!max-w-none w-[98vw] md:w-[65vw] h-[90vh] md:h-[85vh] p-0 bg-zinc-950 border-zinc-800 rounded-xl overflow-hidden"
          showCloseButton={false}
        >
          {/* Hidden DialogTitle for accessibility */}
          <DialogTitle className="sr-only">
            {selectedItem?.title || "Template Preview"}
          </DialogTitle>
          
          <div className="flex flex-col h-full overflow-hidden">
            {/* Modal Header - компактный на мобильных */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-zinc-800 shrink-0">
              <div className="min-w-0 flex-1 mr-3">
                <h2 className="text-base md:text-xl font-semibold text-white truncate">
                  {selectedItem?.title}
                </h2>
                {selectedItem?.description && (
                  <p className="text-xs md:text-sm text-zinc-400 mt-0.5 md:mt-1 truncate">
                    {selectedItem.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <Button
                  onClick={handleRemix}
                  disabled={isRemixing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-xs md:text-sm px-3 md:px-4 h-8 md:h-9"
                >
                  {isRemixing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                      <span className="hidden sm:inline">Создание...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                      <span className="hidden sm:inline">Использовать шаблон</span>
                      <span className="sm:hidden">Remix</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedItem(null)}
                  className="text-zinc-400 hover:text-white h-8 w-8 md:h-9 md:w-9"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
            </div>

            {/* Preview Area - занимает всё оставшееся пространство */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {selectedItem && (
                <ShowcasePreview files={selectedItem.filesSnapshot} />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Удалить шаблон?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Вы уверены, что хотите удалить шаблон &quot;{itemToDelete?.title}&quot;? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              disabled={isDeleting}
            >
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                "Удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Separate component to handle the preview to avoid re-renders
function ShowcasePreview({ files }: { files: Record<string, string> }) {
  return (
    <div className="h-full w-full">
      <CodeViewer
        files={files}
        showPreviewOnly={true}
        hideHeader={true}
        isEmpty={false}
      />
    </div>
  );
}
