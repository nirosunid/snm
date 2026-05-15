"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/lib/feedback/actions";

type Props = {
  jobId: number;
  initialRating?: number | null;
  initialNotes?: string | null;
};

export function FeedbackCard({
  jobId,
  initialRating = null,
  initialNotes = null,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [hover, setHover] = useState<number>(0);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function onSave() {
    setError(null);
    if (rating < 1 || rating > 5) {
      setError("Pick a rating from 1 to 5 stars.");
      return;
    }
    start(async () => {
      const res = await submitFeedback({ jobId, rating, notes });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  const display = hover > 0 ? hover : rating;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How was this draft?</CardTitle>
        <CardDescription>
          Quick rating drives the founder&apos;s prompt-tuning iteration during
          the private beta. Optional notes are read by hand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className="rounded p-1 hover:bg-muted"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              disabled={pending}
            >
              <Star
                className={
                  display >= n
                    ? "size-6 fill-amber-400 text-amber-400"
                    : "size-6 text-muted-foreground"
                }
              />
            </button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            {rating > 0 ? `${rating} / 5` : "Pick a rating"}
          </span>
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional — what worked, what didn't?"
          disabled={pending}
        />

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t save</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {savedAt
              ? "Saved — thanks."
              : initialRating
                ? "You can update your rating any time."
                : ""}
          </span>
          <Button onClick={onSave} disabled={pending || rating < 1}>
            {pending ? "Saving…" : initialRating ? "Update" : "Save feedback"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
