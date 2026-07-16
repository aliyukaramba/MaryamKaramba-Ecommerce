"use client";

import { useCallback, useRef, useState } from "react";
import { X, Upload, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  featuredImage?: string;
  onFeaturedChange?: (url: string) => void;
  maxImages?: number;
}

export function ImageUploader({
  images,
  onChange,
  featuredImage,
  onFeaturedChange,
  maxImages = 12,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (fileArray.length === 0) return;

      if (images.length + fileArray.length > maxImages) {
        toast.error(`You can upload up to ${maxImages} images.`);
        return;
      }

      setUploading(true);
      try {
        const signRes = await fetch("/api/cloudinary/sign", { method: "POST" });
        if (!signRes.ok) throw new Error("Failed to get upload signature");
        const { signature, timestamp, folder, cloudName, apiKey } = await signRes.json();

        const uploaded: string[] = [];
        for (const file of fileArray) {
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
          uploaded.push(data.secure_url);
        }

        const next = [...images, ...uploaded];
        onChange(next);
        if (onFeaturedChange && !featuredImage && next.length > 0) {
          onFeaturedChange(next[0]);
        }
        toast.success(`${uploaded.length} image(s) uploaded.`);
      } catch (error) {
        console.error(error);
        toast.error("Image upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [images, onChange, featuredImage, onFeaturedChange, maxImages]
  );

  function removeImage(url: string) {
    onChange(images.filter((i) => i !== url));
    if (featuredImage === url && onFeaturedChange) {
      onFeaturedChange(images.find((i) => i !== url) ?? "");
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-secondary" : "border-border hover:bg-secondary/50"
        )}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {uploading ? "Uploading…" : "Drag & drop images, or click to browse"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {images.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {onFeaturedChange && (
                  <button
                    type="button"
                    onClick={() => onFeaturedChange(url)}
                    className={cn(
                      "rounded-full p-1.5",
                      featuredImage === url ? "bg-accent text-accent-foreground" : "bg-white/90 text-foreground"
                    )}
                    title="Set as featured image"
                  >
                    <Star className="h-3.5 w-3.5" fill={featuredImage === url ? "currentColor" : "none"} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="rounded-full bg-white/90 p-1.5 text-destructive"
                  title="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {featuredImage === url && (
                <span className="absolute left-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">
                  Featured
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
