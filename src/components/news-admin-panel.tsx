"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Plus,
  Loader2,
  X,
  ImagePlus,
  Edit,
  Trash2,
  Newspaper,
} from "lucide-react";
import Image from "next/image";
import { createNews, updateNews, deleteNews } from "@/app/actions/news";
import { useAnalytics } from "@/hooks/use-analytics";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image: string | null;
  published: boolean;
  createdAt: string;
}

interface NewsAdminPanelProps {
  initialNews: NewsItem[];
  onNewsCreated?: (news: NewsItem) => void;
  onNewsUpdated?: (news: NewsItem) => void;
  onNewsDeleted?: (id: string) => void;
}

export function NewsAdminPanel({ initialNews, onNewsCreated, onNewsUpdated, onNewsDeleted }: NewsAdminPanelProps) {
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [deletingNews, setDeletingNews] = useState<NewsItem | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { trackClick } = useAnalytics();

  // Reset form
  const resetForm = useCallback(() => {
    setTitle("");
    setContent("");
    setImageUrl("");
    setImagePreview(null);
  }, []);

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (item: NewsItem) => {
    setTitle(item.title);
    setContent(item.content);
    setImageUrl(item.image || "");
    setImagePreview(item.image);
    setEditingNews(item);
  };

  // Handle image upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Пожалуйста, выберите изображение");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Максимальный размер файла 10MB");
      return;
    }

    setIsUploading(true);

    try {
      // Create local preview
      const localPreview = URL.createObjectURL(file);
      setImagePreview(localPreview);

      // Upload to cloud
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      setImageUrl(data.url);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Ошибка загрузки изображения");
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove image
  const removeImage = () => {
    setImageUrl("");
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle create news
  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Заполните заголовок и текст новости");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createNews({
        title,
        content,
        image: imageUrl || null,
      });

      // Add new news to list
      const newNews: NewsItem = {
        id: result.id,
        title: title.trim(),
        content: content.trim(),
        image: imageUrl || null,
        published: true,
        createdAt: new Date().toISOString(),
      };

      setNews([newNews, ...news]);
      onNewsCreated?.(newNews);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Create error:", error);
      alert(error.message || "Ошибка при создании новости");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update news
  const handleUpdate = async () => {
    if (!editingNews) return;

    if (!title.trim() || !content.trim()) {
      alert("Заполните заголовок и текст новости");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateNews(editingNews.id, {
        title,
        content,
        image: imageUrl || null,
      });

      // Update news in list
      const updatedItem = {
        ...editingNews,
        title: title.trim(),
        content: content.trim(),
        image: imageUrl || null,
      };
      setNews(
        news.map((item) =>
          item.id === editingNews.id ? updatedItem : item
        )
      );
      onNewsUpdated?.(updatedItem);

      setEditingNews(null);
      resetForm();
    } catch (error: any) {
      console.error("Update error:", error);
      alert(error.message || "Ошибка при обновлении новости");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete news
  const handleDelete = async () => {
    if (!deletingNews) return;

    setIsDeleting(true);

    try {
      await deleteNews(deletingNews.id);
      const deletedId = deletingNews.id;
      setNews(news.filter((item) => item.id !== deletedId));
      onNewsDeleted?.(deletedId);
      setDeletingNews(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(error.message || "Ошибка при удалении новости");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Create News Button */}
      <Button
        onClick={() => { trackClick("news_create_open"); openCreateDialog(); }}
        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Создать новость
      </Button>

      {/* Admin News List (if there are news items) */}
      {news.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-zinc-400 mb-2">
            Управление новостями:
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {news.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Newspaper className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="text-sm text-zinc-300 truncate">
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                    onClick={() => { trackClick("news_edit_open"); openEditDialog(item); }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
                    onClick={() => { trackClick("news_delete_init"); setDeletingNews(item); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingNews}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingNews(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingNews ? "Редактировать новость" : "Создать новость"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-zinc-300">
                Заголовок
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите заголовок новости..."
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-zinc-300">
                Текст новости
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                placeholder="Введите текст новости..."
                rows={8}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Изображение (опционально)</Label>
              
              {imagePreview ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-zinc-900">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full aspect-video rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="w-8 h-8 text-zinc-400" />
                      <span className="text-sm text-zinc-400">
                        Нажмите, чтобы выбрать изображение
                      </span>
                    </>
                  )}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingNews(null);
                resetForm();
              }}
              className="text-zinc-400 hover:text-white"
            >
              Отмена
            </Button>
            <Button
              onClick={() => { trackClick("news_submit"); (editingNews ? handleUpdate : handleCreate)(); }}
              disabled={isSubmitting || isUploading || !title.trim() || !content.trim()}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingNews ? "Сохранение..." : "Публикация..."}
                </>
              ) : editingNews ? (
                "Сохранить"
              ) : (
                "Опубликовать"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingNews}
        onOpenChange={(open) => !open && setDeletingNews(null)}
      >
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Удалить новость?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Вы уверены, что хотите удалить новость "{deletingNews?.title}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { trackClick("news_delete_confirm"); handleDelete(); }}
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
