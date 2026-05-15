import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { FeedbackCard } from "@/components/customer/feedback-card";
import { JobEditor } from "@/components/customer/job-editor";
import {
  DraftPayloadSchema,
  ReviewRecordSchema,
} from "@/lib/agents/schemas";
import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import type { Brand, ContentJob, Feedback } from "@/payload-types";

type Props = { params: Promise<{ brandId: string; jobId: string }> };

export default async function JobDetailPage({ params }: Props) {
  const { brandId, jobId } = await params;
  const bId = Number(brandId);
  const jId = Number(jobId);
  if (
    !Number.isInteger(bId) ||
    bId <= 0 ||
    !Number.isInteger(jId) ||
    jId <= 0
  ) {
    notFound();
  }

  const user = await currentUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  let brand: Brand;
  let job: ContentJob;
  try {
    [brand, job] = await Promise.all([
      payload.findByID({
        collection: "brands",
        id: bId,
        user,
        overrideAccess: false,
        depth: 0,
      }) as Promise<Brand>,
      payload.findByID({
        collection: "content-jobs",
        id: jId,
        user,
        overrideAccess: false,
        depth: 0,
      }) as Promise<ContentJob>,
    ]);
  } catch {
    notFound();
  }

  // Cross-check: refuse to render a job that doesn't belong to this brand,
  // even when the customer owns both.
  const jobBrandId =
    typeof job.brand === "object" && job.brand
      ? (job.brand as { id: number }).id
      : job.brand;
  if (jobBrandId !== brand.id) notFound();

  const { docs: accounts } = await payload.find({
    collection: "accounts",
    user,
    overrideAccess: false,
    where: {
      brand: { equals: brand.id },
      platform: { equals: "instagram" },
    },
    sort: "-connectedAt",
    limit: 20,
    depth: 0,
  });
  const accountOptions = accounts.map((a) => ({
    id: a.id,
    username: a.username,
    accountType: a.accountType,
  }));

  const draftParse = DraftPayloadSchema.safeParse(job.draftPayload);
  const reviewParse = ReviewRecordSchema.safeParse(job.review);
  const draft = draftParse.success ? draftParse.data : null;
  const review = reviewParse.success ? reviewParse.data : null;

  const { docs: existingFeedback } = await payload.find({
    collection: "feedback",
    user,
    overrideAccess: false,
    where: { job: { equals: job.id } },
    limit: 1,
    depth: 0,
  });
  const myFeedback = (existingFeedback[0] as Feedback | undefined) ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href={routes.customer.brands.queue(brand.id)}>
            <ArrowLeft className="size-4" />
            Back to queue
          </Link>
        </Button>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {job.topic}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {brand.name} · job #{job.id}
              {job.provider ? ` · ${job.provider}/${job.model}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{job.status}</Badge>
            {review && (
              <Badge
                variant={review.verdict === "ship" ? "default" : "destructive"}
              >
                {review.verdict}
                {review.revisionsRun > 0
                  ? ` (after ${review.revisionsRun} revision)`
                  : ""}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {job.status === "failed" && (
        <Alert variant="destructive">
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription className="break-words whitespace-pre-wrap">
            {job.error ?? "Unknown error."}
          </AlertDescription>
        </Alert>
      )}

      {!draft ? (
        <Alert>
          <AlertTitle>No draft yet</AlertTitle>
          <AlertDescription>
            This job has not produced a draft. Status: {job.status}.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <JobEditor
            jobId={job.id}
            brandId={brand.id}
            status={job.status}
            initialDraft={draft}
            review={review}
            accounts={accountOptions}
            publishedMediaId={job.publishedMediaId ?? null}
          />
          <FeedbackCard
            jobId={job.id}
            initialRating={myFeedback?.rating ?? null}
            initialNotes={myFeedback?.notes ?? null}
          />
        </>
      )}
    </div>
  );
}
