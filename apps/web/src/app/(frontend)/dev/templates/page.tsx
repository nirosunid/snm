import { notFound } from "next/navigation";

import { currentUser, isStaff } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { FIXTURE_BRANDS, FIXTURE_KEYS, fixtureBrandId } from "@/render/fixtures";
import { TEMPLATES } from "@/render/templates";
import type { TemplateType } from "@/collections/Templates";

const SAMPLE_BY_TYPE: Record<TemplateType, Record<string, string>> = {
  hook: { copy: "3 design details that change how a car feels at speed" },
  listicle_item: {
    copy: "Stitch density on the steering wheel — 7 stitches per inch tells your hands the car was designed for them",
  },
  cta: { copy: "Save this for the next test drive." },
  quote: {
    copy: "We don't sell cars. We sell years of feeling.",
    attribution: "an interior designer at Sindelfingen",
  },
  image_caption: {
    caption: "The cabin air filter is calibrated against pollen counts in 38 cities.",
    imageUrl: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200",
  },
};

export default async function DevTemplatesPage() {
  const user = await currentUser();
  if (!user || !isStaff(user)) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Slide templates
        </h1>
        <p className="mt-1 text-muted-foreground">
          Visual QA — every active template rendered against three fixture brand
          palettes. Snapshot tests can hook into the render endpoint these
          previews call.
        </p>
      </div>

      {TEMPLATES.filter((t) => t.active).map((tpl) => {
        const sample = SAMPLE_BY_TYPE[tpl.type] ?? {};
        return (
          <section key={tpl.key} className="space-y-3">
            <header className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">
                {tpl.name}{" "}
                <code className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                  {tpl.key}
                </code>
              </h2>
              <span className="text-sm text-muted-foreground">{tpl.type}</span>
            </header>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {FIXTURE_KEYS.map((key) => {
                const fixture = FIXTURE_BRANDS[key];
                const url = routes.api.customer.render({
                  templateKey: tpl.key,
                  ...sample,
                  brandId: fixtureBrandId(key),
                });
                return (
                  <figure
                    key={key}
                    className="overflow-hidden rounded-md border bg-muted/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${tpl.key} on ${key}`}
                      className="block aspect-square w-full object-contain"
                    />
                    <figcaption className="border-t px-3 py-2 text-sm">
                      <span className="font-medium">{fixture.name}</span>{" "}
                      <span className="text-muted-foreground">/ {fixture.font}</span>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Fixtures live in <code>src/render/fixtures.ts</code>. Numeric{" "}
        <code>brandId</code> values fetch from the Payload <code>brands</code>{" "}
        collection (auth-scoped); <code>fixture:&lt;key&gt;</code> ids resolve
        against the fixture map and skip auth — handy for snapshots.
      </p>
    </div>
  );
}
