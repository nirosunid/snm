import type { Payload } from "payload";

import { TEMPLATES } from ".";

/**
 * Idempotent seed: ensure a `templates` row exists for every TemplateDef in
 * the registry. Updates `name` and `type` if they drift; never touches
 * `active` (admins toggle that; we mustn't override their choice).
 *
 * Called from payload.config onInit on every boot.
 */
export async function seedTemplates(payload: Payload): Promise<void> {
  for (const def of TEMPLATES) {
    try {
      const existing = await payload.find({
        collection: "templates",
        where: { key: { equals: def.key } },
        limit: 1,
        overrideAccess: true,
      });
      if (existing.docs.length === 0) {
        await payload.create({
          collection: "templates",
          data: {
            key: def.key,
            name: def.name,
            type: def.type,
            active: def.active,
          },
          overrideAccess: true,
        });
        payload.logger.info(`[templates seed] created ${def.key}`);
        continue;
      }
      const row = existing.docs[0];
      if (row.name !== def.name || row.type !== def.type) {
        await payload.update({
          collection: "templates",
          id: row.id,
          data: { name: def.name, type: def.type },
          overrideAccess: true,
        });
        payload.logger.info(`[templates seed] updated ${def.key}`);
      }
    } catch (e) {
      payload.logger.error(
        `[templates seed] failed for ${def.key}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
