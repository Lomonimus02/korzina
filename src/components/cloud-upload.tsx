"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Check, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpload } from "@/hooks/use-upload";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UploadedAsset {
  id: string;
  fileName: string;
  url: string;
  size: number;
  mimeType: string;
}

interface CloudUploadProps {
  onUploadComplete?: (asset: UploadedAsset) => void;
  className?: string;
}

export function CloudUpload({ onUploadComplete, className }: CloudUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isLoading, error } = useUpload();
  const { trackClick } = useAnalytics();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const result = await uploadFile(file);
        if (result) {
          setUploadedAssets((prev) => [...prev, result]);
          onUploadComplete?.(result);
        }
      }
    }
  }, [uploadFile, onUploadComplete]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const result = await uploadFile(file);
        if (result) {
          setUploadedAssets((prev) => [...prev, result]);
          onUploadComplete?.(result);
        }
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadFile, onUploadComplete]);

  const copyToClipboard = useCallback(async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const removeAsset = (id: string) => {
    setUploadedAssets((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 ${className}`}
              >
                <Upload className="h-5 w-5" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Загрузить в Moonely Cloud</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <Upload className="h-5 w-5 text-indigo-400" />
            Moonely Cloud
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => { trackClick("cloud_upload_open"); fileInputRef.current?.click(); }}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${dragActive 
                ? "border-indigo-500 bg-indigo-500/10" 
                : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                <p className="text-zinc-400">Загрузка...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-zinc-800">
                  <ImageIcon className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-zinc-300 font-medium">
                  Перетащите изображения сюда
                </p>
                <p className="text-zinc-500 text-sm">
                  или нажмите для выбора файлов
                </p>
                <p className="text-zinc-600 text-xs mt-2">
                  JPG, PNG, WebP, SVG • Макс. 5MB
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Uploaded Assets */}
          {uploadedAssets.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-zinc-400 font-medium">Загруженные файлы</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {uploadedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 group"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0">
                      <img
                        src={asset.url}
                        alt={asset.fileName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">
                        {asset.fileName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatFileSize(asset.size)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
                              onClick={() => { trackClick("cloud_copy_url"); copyToClipboard(asset.url, asset.id); }}
                            >
                              {copiedId === asset.id ? (
                                <Check className="h-4 w-4 text-green-400" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Скопировать URL</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { trackClick("cloud_remove_asset"); removeAsset(asset.id); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage Hint */}
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-xs text-indigo-300">
              💡 <strong>Совет:</strong> Скопируйте URL и вставьте его в чат, чтобы ИИ использовал ваше изображение на сайте.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
