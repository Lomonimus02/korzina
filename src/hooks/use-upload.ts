import { useState, useCallback } from "react";

interface Asset {
  id: string;
  userId: string;
  fileName: string;
  fileKey: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface UploadState {
  isLoading: boolean;
  error: string | null;
  asset: Asset | null;
}

interface UseUploadReturn extends UploadState {
  uploadFile: (file: File) => Promise<Asset | null>;
  reset: () => void;
}

export function useUpload(): UseUploadReturn {
  const [state, setState] = useState<UploadState>({
    isLoading: false,
    error: null,
    asset: null,
  });

  const uploadFile = useCallback(async (file: File): Promise<Asset | null> => {
    setState({ isLoading: true, error: null, asset: null });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка загрузки");
      }

      setState({ isLoading: false, error: null, asset: data });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      setState({ isLoading: false, error: errorMessage, asset: null });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, asset: null });
  }, []);

  return {
    ...state,
    uploadFile,
    reset,
  };
}
