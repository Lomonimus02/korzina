"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface DownloadButtonProps {
  files: Record<string, string>;
}

export function DownloadButton({ files }: DownloadButtonProps) {
  const handleDownload = async () => {
    const zip = new JSZip();

    // Add files to zip
    Object.entries(files).forEach(([path, content]) => {
      // Remove leading slash if present
      const fileName = path.startsWith("/") ? path.slice(1) : path;
      zip.file(fileName, content);
    });

    // Add a basic index.html to run the app (optional, but good for preview)
    // Since we are using Sandpack/React, a simple HTML might not work without build step.
    // But we can at least provide the source code.
    // Let's just save the source files.

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "project-export.zip");
  };

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
