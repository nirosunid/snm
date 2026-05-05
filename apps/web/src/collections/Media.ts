import type { CollectionConfig } from "payload";

// Generic media collection — backs brand logos, asset library uploads,
// and rendered slide PNGs in later issues.
export const Media: CollectionConfig = {
  slug: "media",
  upload: true,
  fields: [
    {
      name: "alt",
      type: "text",
    },
  ],
};
