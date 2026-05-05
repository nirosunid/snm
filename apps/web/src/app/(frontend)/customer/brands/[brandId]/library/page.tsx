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
import { Input } from "@/components/ui/input";
import { AssetUploader } from "@/components/customer/asset-uploader";
import { searchAssets } from "@/lib/assets/search";
import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import type { Brand } from "@/payload-types";

type Props = {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function BrandLibraryPage({ params, searchParams }: Props) {
  const { brandId } = await params;
  const { q } = await searchParams;
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
    })) as Brand;
  } catch {
    notFound();
  }

  const assets = await searchAssets({
    brandId: brand.id,
    query: q,
    user,
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
        <h1 className="text-3xl font-semibold tracking-tight">Asset library</h1>
        <p className="mt-1 text-muted-foreground">
          Photos the AI can use as carousel slides instead of templated text.
          Tag them so the agent can find the right shot.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
          <CardDescription>Drag files in, or click the box.</CardDescription>
        </CardHeader>
        <CardContent>
          <AssetUploader brandId={brand.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Library</CardTitle>
              <CardDescription>
                {assets.length} asset{assets.length === 1 ? "" : "s"}
                {q ? ` matching "${q}"` : ""}.
              </CardDescription>
            </div>
            <form className="flex gap-2" action="" method="GET">
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Filter by tag or name"
                className="w-64"
              />
              <Button type="submit" variant="outline">
                Filter
              </Button>
              {q && (
                <Button asChild type="button" variant="ghost">
                  <Link href={routes.customer.brands.library(brand.id)}>Clear</Link>
                </Button>
              )}
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {q ? "No matches." : "No assets yet — upload your first one above."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {assets.map((a) => (
                <li
                  key={a.id}
                  className="space-y-2 overflow-hidden rounded-md border bg-muted/30"
                >
                  <div className="aspect-square w-full bg-muted">
                    {a.thumbnailURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.thumbnailURL}
                        alt={a.name}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-1 p-2">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    {a.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {a.tags.slice(0, 6).map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
