import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { currentUser, isStaff } from "@/lib/auth/session";
import type {
  Brand,
  ContentJob,
  Feedback,
  User,
} from "@/payload-types";

export default async function FeedbackDashboardPage() {
  const user = await currentUser();
  if (!user || !isStaff(user)) notFound();

  const payload = await getPayload({ config });
  const { docs: rows } = await payload.find({
    collection: "feedback",
    overrideAccess: true,
    sort: "-updatedAt",
    limit: 100,
    depth: 2,
  });

  const total = rows.length;
  const avg =
    total > 0
      ? rows.reduce((acc, r) => acc + Number(r.rating ?? 0), 0) / total
      : 0;
  const distribution = [1, 2, 3, 4, 5].reduce<Record<number, number>>(
    (acc, n) => {
      acc[n] = rows.filter((r) => Number(r.rating) === n).length;
      return acc;
    },
    {},
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Feedback dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-job ratings and notes from beta users. Newest first; capped at
          100. Use to drive prompt-tuning iterations during the private beta
          (Issue #19).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aggregate</CardTitle>
          <CardDescription>
            {total === 0
              ? "No feedback yet — onboard a beta user."
              : `${total} rating${total === 1 ? "" : "s"} · average ${avg.toFixed(2)} / 5`}
          </CardDescription>
        </CardHeader>
        {total > 0 && (
          <CardContent>
            <div className="space-y-1 text-sm">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = distribution[n] ?? 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={n} className="flex items-center gap-3">
                    <span className="w-6 font-mono text-xs">{n}★</span>
                    <div className="flex-1 overflow-hidden rounded-md bg-muted">
                      <div
                        className="h-2 bg-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs text-muted-foreground">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Recent feedback</CardTitle>
          <CardDescription>
            Click into a job from the queue to see the full draft + the
            reviewer&apos;s issues alongside the rating.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rating</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as Feedback[]).map((r) => {
                  const job =
                    typeof r.job === "object" && r.job
                      ? (r.job as ContentJob)
                      : null;
                  const brand =
                    job && typeof job.brand === "object" && job.brand
                      ? (job.brand as Brand)
                      : null;
                  const author =
                    typeof r.owner === "object" && r.owner
                      ? (r.owner as User)
                      : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant="default">{r.rating}★</Badge>
                      </TableCell>
                      <TableCell className="max-w-[24ch] truncate">
                        {job?.topic ?? `#${typeof r.job === "number" ? r.job : ""}`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {brand?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {author?.email ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[40ch] text-xs text-muted-foreground">
                        <span className="line-clamp-2 whitespace-pre-wrap">
                          {r.notes ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.updatedAt
                          ? new Date(r.updatedAt).toLocaleDateString()
                          : "—"}
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
