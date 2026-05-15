import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

import { Accounts } from "./collections/Accounts";
import { Assets } from "./collections/Assets";
import { Brands } from "./collections/Brands";
import { ContentJobs } from "./collections/ContentJobs";
import { Feedback } from "./collections/Feedback";
import { Media } from "./collections/Media";
import { Subscriptions } from "./collections/Subscriptions";
import { Templates } from "./collections/Templates";
import { Users } from "./collections/Users";
import { VoiceSamples } from "./collections/VoiceSamples";
import { seedTemplates } from "./render/templates/seed";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  editor: lexicalEditor(),
  collections: [
    Users,
    Media,
    Brands,
    VoiceSamples,
    Assets,
    Templates,
    ContentJobs,
    Accounts,
    Subscriptions,
    Feedback,
  ],
  onInit: async (payload) => {
    await seedTemplates(payload);
  },
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    // Always use migrations — never db.push(). Push regenerates the schema
    // from the collection definitions and would drop the manually-managed
    // pgvector column on voice_samples.embedding_vec on every hot reload.
    push: false,
  }),
});
