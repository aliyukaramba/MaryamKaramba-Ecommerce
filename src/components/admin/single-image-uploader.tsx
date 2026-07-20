"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface SingleImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
}

export function SingleImageUploader({ value, onChange, label }: SingleImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please choose an image file.");
        return;
      }

      setUploading(true);
      try {
        const signRes = await fetch("/api/cloudinary/sign", { method: "POST" });
        if (!signRes.ok) throw new Error("Failed to get upload signature");
        const { signature, timestamp, folder, cloudName, apiKey } = await signRes.json();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", apiKey);
        formData.append("timestamp", String(timestamp));
        formData.append("signature", signature);
        formData.append("folder", folder);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: formData }
        );
        if (!uploadRes.ok) throw new Error("Upload failed");
        const data = await uploadRes.json();

        onChange(data.secure_url);
        toast.success(`${label} uploaded.`);
      } catch (error) {
        console.error(error);
        toast.error(`${label} upload failed. Please try again.`);
      } finally {
        setUploading(false);
      }
    },
    [onChange, label]
  );

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/40">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-full w-full object-contain" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
