import {
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Instagram,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DisconnectAccountButton } from "@/components/customer/disconnect-account-button";
import { VoiceSamplesForm } from "@/components/customer/voice-samples-form";
import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import type { Account, Brand } from "@/payload-types";

type Props = {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<{ ig?: string; ig_message?: string }>;
};

export default async function BrandDetailPage({ params, searchParams }: Props) {
  const { brandId } = await params;
  const { ig, ig_message: igMessage } = await searchParams;
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
      depth: 1,
    })) as Brand;
  } catch {
    notFound();
  }

  const { totalDocs: sampleCount, docs: recentSamples } = await payload.find({
    collection: "voice-samples",
    user,
    overrideAccess: false,
    where: { brand: { equals: brand.id } },
    sort: "-createdAt",
    limit: 3,
  });

  const { totalDocs: assetCount } = await payload.find({
    collection: "assets",
    user,
    overrideAccess: false,
    where: { brand: { equals: brand.id } },
    limit: 0,
  });

  const { totalDocs: queueCount } = await payload.find({
    collection: "content-jobs",
    user,
    overrideAccess: false,
    where: {
      brand: { equals: brand.id },
      status: { in: ["queued", "generating", "ready"] },
    },
    limit: 0,
    depth: 0,
  });

  const { docs: accounts } = await payload.find({
    collection: "accounts",
    user,
    overrideAccess: false,
    where: { brand: { equals: brand.id } },
    sort: "-connectedAt",
    limit: 20,
    depth: 0,
  });

  const palette = brand.palette ?? {};
  const swatches = (
    [
      ["primary", palette.primary],
      ["secondary", palette.secondary],
      ["accent", palette.accent],
      ["background", palette.background],
      ["text", palette.text],
    ] as const
  ).filter(([, v]) => Boolean(v));

  const banner = oauthBanner(ig, igMessage);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href={routes.customer.brands.list()}>
            <ArrowLeft className="size-4" />
            All brands
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">{brand.name}</h1>
        {brand.niche ? (
          <p className="mt-1 text-muted-foreground">{brand.niche}</p>
        ) : null}
      </div>

      {banner}

      <Card>
        <CardHeader>
          <CardTitle>Brief</CardTitle>
          <CardDescription>Identity and voice.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Field label="Audience" value={brand.audience ?? "—"} />
          <Field label="Tone" value={brand.tone ?? "—"} />
          <ListField label="Do" items={(brand.dos ?? []).map((d) => d.item)} />
          <ListField label="Don't" items={(brand.donts ?? []).map((d) => d.item)} />
          <ListField
            label="Vocabulary"
            items={(brand.vocabulary ?? []).map((v) => v.item)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Voice samples</CardTitle>
              <CardDescription>
                Past posts the agent retrieves by similarity to draft on-brand copy.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {sampleCount} sample{sampleCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <VoiceSamplesForm brandId={brand.id} />

          {recentSamples.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium">Most recent</p>
                <ul className="space-y-2 text-sm">
                  {recentSamples.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-md border bg-muted/40 p-3 text-muted-foreground"
                    >
                      <span className="line-clamp-3 whitespace-pre-wrap">
                        {s.content}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Asset library</CardTitle>
              <CardDescription>
                Photos the agent can pick as carousel slides instead of
                templated text.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <ImageIcon className="mr-1 size-3" />
              {assetCount} asset{assetCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href={routes.customer.brands.library(brand.id)}>
              Manage library
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Approval queue</CardTitle>
              <CardDescription>
                Drafts waiting on your review. Edit slide copy, then approve or
                discard.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <ListChecks className="mr-1 size-3" />
              {queueCount} open
            </Badge>
          </div>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href={routes.customer.brands.queue(brand.id)}>
              Open queue
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Connected accounts</CardTitle>
              <CardDescription>
                Instagram accounts this brand publishes to. Business or Creator
                only — Personal accounts are refused at connect time.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <Instagram className="mr-1 size-3" />
              {accounts.length} connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accounts yet — connect Instagram to enable publishing.
            </p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm"
                >
                  <div className="space-y-1">
                    <p className="font-medium">@{a.username}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="uppercase">
                        {a.accountType.replace("_", " ")}
                      </Badge>
                      <span>id {a.platformUserId}</span>
                      <span>
                        {formatExpiry(a.tokenExpiresAt ?? null)}
                      </span>
                    </div>
                  </div>
                  <DisconnectAccountButton
                    accountId={a.id}
                    username={a.username}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href={routes.api.oauth.instagram.start(brand.id)}>
              <Instagram className="size-4" />
              Connect Instagram
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Palette &amp; font</CardTitle>
          <CardDescription>Applied to every generated slide.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {swatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No palette set.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {swatches.map(([name, color]) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <div
                    className="size-14 rounded-md border"
                    style={{ background: color as string }}
                  />
                  <div className="text-center">
                    <p className="text-xs font-medium uppercase tracking-wide">
                      {name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {color}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Font</p>
            <Badge variant="secondary" className="text-base">
              {brand.font ?? "Inter"}
            </Badge>
            <p
              className="mt-2 text-2xl"
              style={{ fontFamily: `"${brand.font ?? "Inter"}", sans-serif` }}
            >
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function oauthBanner(ig: string | undefined, message: string | undefined) {
  if (!ig) return null;
  if (ig === "connected") {
    return (
      <Alert>
        <AlertTitle>Instagram connected</AlertTitle>
        <AlertDescription>
          The account is ready to publish to. You can disconnect anytime below.
        </AlertDescription>
      </Alert>
    );
  }
  if (ig === "personal_account_refused") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Personal Instagram accounts aren&apos;t supported</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            {message ??
              "Convert this account to Business or Creator in the Instagram app, then reconnect."}
          </p>
          <p>
            <a
              href="https://help.instagram.com/502981923235522"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:underline"
            >
              How to switch to a Business or Creator account
            </a>
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive">
      <AlertTitle>Couldn&apos;t connect Instagram</AlertTitle>
      <AlertDescription className="break-words whitespace-pre-wrap">
        {message ?? "Try again from the Connect button below."}
      </AlertDescription>
    </Alert>
  );
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "no expiry recorded";
  const d = new Date(iso);
  const days = Math.round((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "expired — reconnect";
  if (days <= 14) return `expires in ${days} day${days === 1 ? "" : "s"}`;
  return `expires ${d.toLocaleDateString()}`;
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p>—</p>
      ) : (
        <ul className="list-inside list-disc space-y-1">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
