import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { getPayload } from "payload";

import config from "@payload-config";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function BrandsListPage() {
  const user = await currentUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const { docs: brands } = await payload.find({
    collection: "brands",
    user,
    overrideAccess: false,
    sort: "-updatedAt",
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Brands</h1>
          <p className="mt-1 text-muted-foreground">
            A brand bundles a voice, palette, font, and logo. Carousels are drafted
            against one brand at a time.
          </p>
        </div>
        <Button asChild>
          <Link href={routes.customer.brands.new()}>
            <Plus className="size-4" />
            New brand
          </Link>
        </Button>
      </div>

      {brands.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No brands yet</CardTitle>
            <CardDescription>
              Create your first brand — it takes about a minute. You can add voice
              samples, assets, and connected accounts later.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href={routes.customer.brands.new()}>
                Create brand
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {brands.map((brand) => (
            <Card key={brand.id} className="transition-colors hover:border-primary">
              <Link
                href={routes.customer.brands.detail(brand.id)}
                className="block p-6"
              >
                <div className="flex items-center gap-3">
                  <PaletteSwatch palette={brand.palette} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{brand.name}</p>
                    {brand.niche ? (
                      <p className="truncate text-sm text-muted-foreground">
                        {brand.niche}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PaletteSwatch({
  palette,
}: {
  palette?: {
    primary?: string | null;
    secondary?: string | null;
    accent?: string | null;
    background?: string | null;
    text?: string | null;
  } | null;
}) {
  const colors = [
    palette?.primary,
    palette?.secondary,
    palette?.accent,
    palette?.background,
    palette?.text,
  ].filter((c): c is string => Boolean(c));

  if (colors.length === 0) {
    return <div className="size-10 rounded-md border bg-muted" aria-hidden />;
  }

  return (
    <div
      className="flex size-10 overflow-hidden rounded-md border"
      aria-hidden
    >
      {colors.map((color, i) => (
        <div key={i} className="flex-1" style={{ background: color }} />
      ))}
    </div>
  );
}
