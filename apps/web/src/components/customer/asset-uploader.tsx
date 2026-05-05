"use client";

import { Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadAsset } from "@/lib/assets/actions";

type Pending = {
  file: File;
  status: "queued" | "uploading" | "done" | "failed";
  error?: string;
};

export function AssetUploader({ brandId }: { brandId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [files, setFiles] = useState<Pending[]>([]);
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...arr.map((file) => ({ file, status: "queued" as const }))]);
  }

  function removeAt(i: number) {
    setFiles((prev) => prev.filter((_, j) => j !== i));
  }

  function submit() {
    if (files.length === 0) return;
    start(async () => {
      const next = [...files];
      for (let i = 0; i < next.length; i++) {
        if (next[i].status !== "queued") continue;
        next[i] = { ...next[i], status: "uploading" };
        setFiles([...next]);
        const fd = new FormData();
        fd.set("brandId", String(brandId));
        fd.set("file", next[i].file);
        fd.set("tags", tags);
        fd.set("description", description);
        const res = await uploadAsset(fd);
        if (res.ok) {
          next[i] = { ...next[i], status: "done" };
        } else {
          next[i] = { ...next[i], status: "failed", error: res.error };
        }
        setFiles([...next]);
      }
      router.refresh();
    });
  }

  function clearDone() {
    setFiles((prev) => prev.filter((f) => f.status !== "done"));
  }

  const anyDone = files.some((f) => f.status === "done");
  const anyQueued = files.some((f) => f.status === "queued");

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors " +
          (dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50")
        }
      >
        <Upload className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag images here, or click to choose. Tags below apply to every file
          in this batch.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="comma, separated, tags"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's in the photo?"
          />
        </div>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2 text-sm">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2"
            >
              <span className="truncate">{f.file.name}</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={f.status} error={f.error} />
                {f.status === "queued" && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeAt(i)}
                    aria-label={`Remove ${f.file.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          PNG, JPG, WEBP. One brand at a time.
        </p>
        <div className="flex gap-2">
          {anyDone && (
            <Button type="button" variant="outline" onClick={clearDone}>
              Clear uploaded
            </Button>
          )}
          <Button
            type="button"
            onClick={submit}
            disabled={pending || !anyQueued}
          >
            {pending ? "Uploading…" : `Upload ${files.filter((f) => f.status === "queued").length || ""}`.trim()}
          </Button>
        </div>
      </div>

      {files.some((f) => f.status === "failed") && (
        <Alert variant="destructive">
          <AlertTitle>Some uploads failed</AlertTitle>
          <AlertDescription className="break-words whitespace-pre-wrap">
            {files
              .filter((f) => f.status === "failed")
              .map((f) => `${f.file.name}: ${f.error ?? "unknown error"}`)
              .join("\n")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  error,
}: {
  status: Pending["status"];
  error?: string;
}) {
  const map: Record<Pending["status"], { label: string; cls: string }> = {
    queued: { label: "Queued", cls: "bg-muted text-foreground" },
    uploading: { label: "Uploading…", cls: "bg-primary/15 text-primary" },
    done: { label: "Uploaded", cls: "bg-emerald-500/15 text-emerald-600" },
    failed: { label: "Failed", cls: "bg-destructive/15 text-destructive" },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs ${cls}`}
      title={status === "failed" ? error : undefined}
    >
      {label}
    </span>
  );
}
