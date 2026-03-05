import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, Image, Video } from "lucide-react";
import { toast } from "sonner";

interface MediaUploadProps {
  bucket: string;
  folder?: string;
  accept: string;
  value: string;
  onChange: (url: string) => void;
  label: string;
  type: "image" | "video";
}

const MediaUpload = ({ bucket, folder = "", accept, value, onChange, label, type }: MediaUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = type === "video" ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${type === "video" ? "50MB" : "5MB"}`);
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${folder ? folder + "/" : ""}${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(urlData.publicUrl);
    toast.success(`${label} uploaded`);
    setUploading(false);
  };

  const handleRemove = () => {
    onChange("");
  };

  const Icon = type === "image" ? Image : Video;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleUpload}
      />

      {value ? (
        <div className="relative rounded-lg border border-border overflow-hidden bg-secondary/30">
          {type === "image" ? (
            <img src={value} alt="Preview" className="h-32 w-full object-cover" />
          ) : (
            <video src={value} className="h-32 w-full object-cover" controls />
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7"
            onClick={handleRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/20 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary/40"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Icon className="h-6 w-6" />
              <span className="text-sm">Click to upload {label.toLowerCase()}</span>
            </>
          )}
        </button>
      )}

      {/* Manual URL fallback */}
      <Input
        placeholder={`Or paste ${label.toLowerCase()} URL`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs"
      />
    </div>
  );
};

export default MediaUpload;
