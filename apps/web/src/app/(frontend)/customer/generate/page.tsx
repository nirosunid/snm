import { getPayload } from "payload";

import config from "@payload-config";

import {
  GeneratePlayground,
  type BrandOption,
} from "@/components/customer/generate-playground";
import { currentUser } from "@/lib/auth/session";

export default async function GeneratePage() {
  const user = await currentUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "brands",
    user,
    overrideAccess: false,
    sort: "-updatedAt",
    limit: 50,
  });

  const brands: BrandOption[] = docs.map((b) => ({ id: b.id, name: b.name }));
  return <GeneratePlayground brands={brands} />;
}
