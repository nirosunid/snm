"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addVoiceSamplesFromPaste } from "@/lib/voice/actions";
import { splitSamples } from "@/lib/voice/schemas";

export function VoiceSamplesForm({ brandId }: { brandId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const previewCount = splitSamples(paste).length;

  function submit() {
    setError(null);
    setSuccess(null);
    start(async () => {
      const res = await addVoiceSamplesFromPaste({ brandId, paste });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(`Added ${res.created} sample${res.created === 1 ? "" : "s"}.`);
      setPaste("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder={
          "Paste your past posts here.\n\nSeparate samples with a blank line. Aim for 10+ samples that represent how you actually write."
        }
        rows={10}
        disabled={pending}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {previewCount === 0
            ? "Nothing to ingest yet."
            : `${previewCount} sample${previewCount === 1 ? "" : "s"} detected.`}
        </p>
        <Button
          type="button"
          onClick={submit}
          disabled={pending || previewCount === 0}
        >
          {pending ? "Embedding…" : "Add samples"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not add samples</AlertTitle>
          <AlertDescription className="break-words whitespace-pre-wrap">
            {error}
          </AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
