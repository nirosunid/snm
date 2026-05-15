"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  approveJob,
  discardJob,
  publishJob,
  saveDraftEdits,
} from "@/lib/jobs/actions";
import { routes } from "@/lib/routes";
import type {
  DraftPayload,
  ReviewIssue,
  ReviewRecord,
} from "@/lib/agents/schemas";

export type AccountOption = {
  id: number;
  username: string;
  accountType: "business" | "media_creator";
};

type Props = {
  jobId: number;
  brandId: number;
  status: "queued" | "generating" | "ready" | "approved" | "published" | "failed";
  initialDraft: DraftPayload;
  review: ReviewRecord | null;
  accounts: AccountOption[];
  publishedMediaId: string | null;
};

export function JobEditor({
  jobId,
  brandId,
  status,
  initialDraft,
  review,
  accounts,
  publishedMediaId,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftPayload>(initialDraft);
  const [slideIdx, setSlideIdx] = useState(0);
  const [saving, startSave] = useTransition();
  const [approving, startApprove] = useTransition();
  const [discarding, startDiscard] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [publishResult, setPublishResult] = useState<{
    mediaId: string;
    permalink: string | null;
  } | null>(null);
  const [accountId, setAccountId] = useState<string>(
    accounts.length > 0 ? String(accounts[0].id) : "",
  );

  const editable = status === "ready";
  const canPublish =
    (status === "ready" || status === "approved") &&
    accounts.length > 0 &&
    !publishedMediaId;
  const alreadyPublished = status === "published" || Boolean(publishedMediaId);
  const slide = draft.slides[Math.min(slideIdx, draft.slides.length - 1)];
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialDraft),
    [draft, initialDraft],
  );

  // Per-slide and carousel-level issues from the reviewer (#10).
  const issuesBySlide = useMemo(() => {
    const map = new Map<number, ReviewIssue[]>();
    for (const issue of review?.issues ?? []) {
      const list = map.get(issue.slideIndex) ?? [];
      list.push(issue);
      map.set(issue.slideIndex, list);
    }
    return map;
  }, [review]);
  const slideIssues = issuesBySlide.get(slideIdx) ?? [];
  const carouselIssues = issuesBySlide.get(-1) ?? [];

  // Live preview: when the user edits copy, re-render the slide image with
  // the new copy by re-hitting the render endpoint. Asset slides keep their
  // resolved URL — copy edits don't change the image.
  const previewSrc =
    slide.imageUrl ??
    routes.api.customer.render({
      type: slide.type,
      copy: slide.copy,
      brandId,
    });

  function updateSlideCopy(copy: string) {
    setDraft((d) => {
      const slides = d.slides.slice();
      slides[slideIdx] = { ...slides[slideIdx], copy };
      return { ...d, slides };
    });
  }

  function updateCaption(caption: string) {
    setDraft((d) => ({ ...d, caption }));
  }

  function onSave() {
    setError(null);
    startSave(async () => {
      const res = await saveDraftEdits({ jobId, draft });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  function onApprove() {
    setError(null);
    if (dirty) {
      setError("Save your edits first, then approve.");
      return;
    }
    startApprove(async () => {
      const res = await approveJob({ jobId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onPublish() {
    setError(null);
    setPublishResult(null);
    if (dirty) {
      setError("Save your edits first, then publish.");
      return;
    }
    const id = Number(accountId);
    if (!Number.isInteger(id) || id <= 0) {
      setError("Pick an Instagram account first.");
      return;
    }
    startPublish(async () => {
      const res = await publishJob({ jobId, accountId: id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPublishResult({ mediaId: res.mediaId, permalink: res.permalink });
      router.refresh();
    });
  }

  function onDiscard() {
    setError(null);
    startDiscard(async () => {
      const res = await discardJob({ jobId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(routes.customer.brands.queue(brandId));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carousel</CardTitle>
        <CardDescription>
          {draft.slides.length} slide{draft.slides.length === 1 ? "" : "s"} ·
          edit copy below, then approve or discard. Image stays put — copy edits
          only re-render the templated overlay.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <figure className="mx-auto max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt={`${slide.type} slide`}
            className="block aspect-square w-full rounded-md border bg-muted object-contain"
          />
          <figcaption className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
              disabled={slideIdx === 0}
              aria-label="Previous slide"
            >
              ‹ Prev
            </Button>
            <span>
              <span className="mr-2 font-medium uppercase tracking-wide text-foreground">
                {slide.type}
              </span>
              {slideIdx + 1} / {draft.slides.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSlideIdx((i) => Math.min(draft.slides.length - 1, i + 1))
              }
              disabled={slideIdx === draft.slides.length - 1}
              aria-label="Next slide"
            >
              Next ›
            </Button>
          </figcaption>
        </figure>

        <div className="space-y-2">
          <label
            htmlFor="slide-copy"
            className="flex items-center justify-between text-sm font-medium"
          >
            <span>Slide {slideIdx + 1} copy</span>
            {slideIssues.length > 0 && (
              <Badge variant="destructive">
                {slideIssues.length} issue
                {slideIssues.length === 1 ? "" : "s"}
              </Badge>
            )}
          </label>
          <Textarea
            id="slide-copy"
            value={slide.copy}
            onChange={(e) => updateSlideCopy(e.target.value)}
            rows={4}
            disabled={!editable || saving}
          />
          {slideIssues.length > 0 && (
            <ul className="space-y-1 rounded-md border border-amber-500/50 bg-amber-500/5 p-3 text-xs text-muted-foreground">
              {slideIssues.map((iss, i) => (
                <li key={i}>
                  <span className="font-mono uppercase">{iss.kind}</span>:{" "}
                  {iss.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <label htmlFor="caption" className="text-sm font-medium">
            Caption
          </label>
          <Textarea
            id="caption"
            value={draft.caption}
            onChange={(e) => updateCaption(e.target.value)}
            rows={3}
            disabled={!editable || saving}
          />
          {draft.hashtags.length > 0 && (
            <p className="text-sm text-primary">
              {draft.hashtags
                .map((t) => `#${t.replace(/^#/, "")}`)
                .join(" ")}
            </p>
          )}
        </div>

        {carouselIssues.length > 0 && (
          <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/5 p-3 text-sm">
            <p className="font-medium text-amber-600">
              Carousel-level issues from the reviewer
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {carouselIssues.map((iss, i) => (
                <li key={i}>
                  <span className="font-mono text-xs uppercase">{iss.kind}</span>
                  : {iss.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription className="break-words whitespace-pre-wrap">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {alreadyPublished && (
          <Alert>
            <AlertTitle>Published to Instagram</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>
                Media id{" "}
                <code className="font-mono text-xs">
                  {publishResult?.mediaId ?? publishedMediaId}
                </code>
                .
              </p>
              {publishResult?.permalink && (
                <p>
                  <a
                    href={publishResult.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    View on Instagram ↗
                  </a>
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {!editable
                ? `Read-only — status is "${status}".`
                : dirty
                  ? "Unsaved changes."
                  : savedAt
                    ? "Saved."
                    : "No changes."}
            </div>
            <div className="flex flex-wrap gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={
                      discarding || approving || saving || publishing
                    }
                  >
                    Discard
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The job and its draft will be deleted. This can&apos;t
                      be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDiscard}>
                      {discarding ? "Discarding…" : "Discard"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="secondary"
                onClick={onSave}
                disabled={!editable || !dirty || saving}
              >
                {saving ? "Saving…" : "Save edits"}
              </Button>
              <Button
                variant="secondary"
                onClick={onApprove}
                disabled={!editable || dirty || approving}
              >
                {approving ? "Approving…" : "Approve"}
              </Button>
            </div>
          </div>

          {!alreadyPublished && (
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border bg-muted/30 p-3">
              <div className="flex-1 min-w-[200px] space-y-1">
                <label
                  htmlFor="publish-account"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Publish to
                </label>
                {accounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No Instagram accounts connected to this brand. Connect one
                    on the brand page first.
                  </p>
                ) : (
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger id="publish-account">
                      <SelectValue placeholder="Pick an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          @{a.username} ({a.accountType.replace("_", " ")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button
                onClick={onPublish}
                disabled={!canPublish || dirty || publishing}
              >
                {publishing ? "Publishing…" : "Publish"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
