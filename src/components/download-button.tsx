"use client";

import { Button } from "@/components/ui/button";
import { Download, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface DownloadButtonProps {
  files: Record<string, string>;
  canExport?: boolean; // false для FREE плана
}

export function DownloadButton({ files, canExport = true }: DownloadButtonProps) {
  const handleDownload = async () => {
    if (!canExport) {
      return;
    }
    
    const zip = new JSZip();

    // Add files to zip
    Object.entries(files).forEach(([path, content]) => {
      // Remove leading slash if present
      const fileName = path.startsWith("/") ? path.slice(1) : path;
      zip.file(fileName, content);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "project-export.zip");
  };

  if (!canExport) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              disabled
              title="Экспорт недоступен"
              className="h-7 w-7 text-zinc-600 cursor-not-allowed"
            >
              <Lock size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-zinc-900 border-zinc-800 text-zinc-300">
            <p>Экспорт в ZIP доступен на платных тарифах</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleDownload} 
      title="Экспорт в ZIP"
      className="h-7 w-7 text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
    >
      <Download size={14} />
    </Button>
  );
}
