"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ImagePlus, X, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Attachment type for uploaded files
export interface Attachment {
  id: string;
  url: string;
  name: string;
  previewUrl?: string; // Local blob URL for immediate preview
  status: "uploading" | "success" | "error";
  error?: string;
}

interface ImageUploadProps {
  attachments: Attachment[];
  onAttachmentAdd: (attachment: Attachment) => void;
  onAttachmentUpdate: (id: string, updates: Partial<Attachment>) => void;
  onAttachmentRemove: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

const MAX_SIZE = 1024; // Max dimension for resize
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max file size

// Generate unique ID for attachments
function generateId(): string {
  return `attachment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Resize image and return as Blob (for upload)
function resizeImageToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = (height / width) * MAX_SIZE;
            width = MAX_SIZE;
          } else {
            width = (width / height) * MAX_SIZE;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to convert canvas to blob"));
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Upload file to cloud storage
async function uploadToCloud(file: File | Blob, fileName: string): Promise<{ url: string; name: string }> {
  const formData = new FormData();
  
  // If it's a Blob, convert to File with proper name
  if (file instanceof Blob && !(file instanceof File)) {
    file = new File([file], fileName, { type: file.type || "image/jpeg" });
  }
  
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Ошибка загрузки");
  }

  return { url: data.url, name: data.fileName || fileName };
}

// Hook for handling paste events - now uploads to cloud
export function useAttachmentPaste(
  onAttachmentAdd: (attachment: Attachment) => void,
  onAttachmentUpdate: (id: string, updates: Partial<Attachment>) => void,
  disabled: boolean = false
) {
  useEffect(() => {
    if (disabled) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault(); // Prevent default paste behavior for images
        
        for (const file of imageFiles) {
          // Validate file size
          if (file.size > MAX_FILE_SIZE) {
            console.warn("File too large:", file.name);
            continue;
          }

          const id = generateId();
          const previewUrl = URL.createObjectURL(file);
          
          // Add attachment with uploading status
          onAttachmentAdd({
            id,
            url: "",
            name: file.name || "pasted-image.png",
            previewUrl,
            status: "uploading",
          });

          // Upload to cloud
          try {
            const resizedBlob = await resizeImageToBlob(file);
            const result = await uploadToCloud(resizedBlob, file.name || "pasted-image.png");
            
            onAttachmentUpdate(id, {
              url: result.url,
              name: result.name,
              status: "success",
            });
          } catch (error) {
            console.error("Failed to upload pasted image:", error);
            onAttachmentUpdate(id, {
              status: "error",
              error: error instanceof Error ? error.message : "Ошибка загрузки",
            });
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [onAttachmentAdd, onAttachmentUpdate, disabled]);
}

export function ImageUpload({ 
  attachments, 
  onAttachmentAdd, 
  onAttachmentUpdate, 
  onAttachmentRemove, 
  disabled = false, 
  className = "" 
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          console.warn("Skipping non-image file:", file.name);
          continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          console.warn("File too large:", file.name);
          continue;
        }

        const id = generateId();
        const previewUrl = URL.createObjectURL(file);
        
        // Add attachment with uploading status immediately
        onAttachmentAdd({
          id,
          url: "",
          name: file.name,
          previewUrl,
          status: "uploading",
        });

        // Resize and upload to cloud
        try {
          const resizedBlob = await resizeImageToBlob(file);
          const result = await uploadToCloud(resizedBlob, file.name);
          
          onAttachmentUpdate(id, {
            url: result.url,
            name: result.name,
            status: "success",
          });
        } catch (error) {
          console.error("Failed to upload image:", error);
          onAttachmentUpdate(id, {
            status: "error",
            error: error instanceof Error ? error.message : "Ошибка загрузки",
          });
        }
      }
    } finally {
      setIsProcessing(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [onAttachmentAdd, onAttachmentUpdate]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      {/* Upload button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClick}
              disabled={disabled || isProcessing}
              className="h-8 w-8 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <ImagePlus className={`h-4 w-4 ${isProcessing ? "animate-pulse" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Прикрепить изображение</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove, onRetry }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex gap-2 p-2 flex-wrap">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="relative group rounded-lg overflow-hidden border border-white/10 bg-zinc-900"
        >
          {/* Image thumbnail */}
          <img
            src={attachment.previewUrl || attachment.url}
            alt={attachment.name}
            className={`h-16 w-16 object-cover ${attachment.status === "uploading" ? "opacity-50" : ""} ${attachment.status === "error" ? "opacity-30" : ""}`}
          />
          
          {/* Upload progress overlay */}
          {attachment.status === "uploading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            </div>
          )}
          
          {/* Error overlay */}
          {attachment.status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-1">
              <AlertCircle className="h-4 w-4 text-red-400" />
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(attachment.id)}
                  className="p-1 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-all"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          
          {/* Remove button */}
          <button
            type="button"
            onClick={() => onRemove(attachment.id)}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
          >
            <X className="h-3 w-3" />
          </button>
          
          {/* Success indicator */}
          {attachment.status === "success" && (
            <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
          )}
        </div>
      ))}
    </div>
  );
}

// Legacy exports for backward compatibility during migration
interface ImagePreviewProps {
  images: string[];
  onRemove: (index: number) => void;
}

export function ImagePreview({ images, onRemove }: ImagePreviewProps) {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-2 p-2 flex-wrap">
      {images.map((image, index) => (
        <div
          key={index}
          className="relative group rounded-lg overflow-hidden border border-white/10 bg-zinc-900"
        >
          <img
            src={image}
            alt={`Uploaded ${index + 1}`}
            className="h-16 w-16 object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Legacy hook for backward compatibility
export function useImagePaste(
  onImagesAdd: (images: string[]) => void,
  disabled: boolean = false
) {
  // This is kept for backward compatibility but is deprecated
  // Use useAttachmentPaste instead
  useEffect(() => {
    // No-op - legacy hook is deprecated
  }, [onImagesAdd, disabled]);
}
