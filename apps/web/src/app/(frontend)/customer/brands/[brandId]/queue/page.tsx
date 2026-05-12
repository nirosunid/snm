import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import type { Brand, ContentJob } from "@/payload-types";

type Props = { params: Promise<{ brandId: string }> };

const STATUS_VARIANT: Record<
  NonNullable<ContentJob["status"]>,
  "default" | "secondary" | "destructive" | "outline"
> = {
  queued: "outline",
  generating: "outline",
  ready: "default",
  approved: "secondary",
  published: "secondary",
  failed: "destructive",
};

export default async function BrandQueuePage({ params }: Props) {
  const { brandId } = await params;
  const id = Number(brandId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const user = await currentUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  let brand: Brand;
  try {
    brand = (await payload.findByID({
      collection: "brands",
      id,
      user,
      overrideAccess: false,
      depth: 0,
    })) as Brand;
  } catch {
    notFound();
  }

  const { docs: jobs } = await payload.find({
    collection: "content-jobs",
    user,
    overrideAccess: false,
    where: { brand: { equals: brand.id } },
    sort: "-createdAt",
    limit: 100,
    depth: 0,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href={routes.customer.brands.detail(brand.id)}>
            <ArrowLeft className="size-4" />
            Back to {brand.name}
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">Queue</h1>
        <p className="mt-1 text-muted-foreground">
          Drafts waiting on your approval. Open one to edit slide copy, then
          Approve or Discard.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drafts</CardTitle>
          <CardDescription>
            {jobs.length === 0
              ? "No jobs yet — generate one from the playground."
              : `${jobs.length} job${jobs.length === 1 ? "" : "s"} (newest first).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <Button asChild>
              <Link href={routes.customer.generate()}>Open generate playground</Link>
            </Button>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const review = parseReview(job.review);
                  const cost =
                    typeof job.costCents === "number"
                      ? `$${(job.costCents / 100).toFixed(4)}`
                      : "—";
                  return (
                    <TableRow key={job.id}>
                      <TableCell className="max-w-[28ch] truncate font-medium">
                        {job.topic}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[job.status]}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {review ? (
                          <span className="flex items-center gap-2 text-xs">
                            <Badge
                              variant={
                                review.verdict === "ship"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {review.verdict}
                            </Badge>
                            {review.issues.length > 0 && (
                              <span className="text-muted-foreground">
                                {review.issues.length} issue
                                {review.issues.length === 1 ? "" : "s"}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{cost}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(job.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={routes.customer.brands.queueJob(brand.id, job.id)}
                          >
                            Open
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function parseReview(
  value: ContentJob["review"],
): { verdict: "ship" | "revise"; issues: unknown[] } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = (value as { verdict?: unknown }).verdict;
  const issues = (value as { issues?: unknown }).issues;
  if (v !== "ship" && v !== "revise") return null;
  return {
    verdict: v,
    issues: Array.isArray(issues) ? issues : [],
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
