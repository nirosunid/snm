---
name: Customer UI uses Tailwind + shadcn (Vercel registry-starter)
description: Customer UI in apps/web is built on Tailwind v4 + shadcn primitives consumed from Vercel's registry-starter. Pull components on-demand, don't fork the starter repo.
type: feedback
---

For customer-facing UI work in `apps/web` (pages under `app/(frontend)/customer/...`, customer-shared components), the stack is **Tailwind v4 + shadcn/ui** with primitives + branded shell consumed from the **Vercel registry-starter** (`https://registry-starter.vercel.app/r/{name}.json`), namespaced as `@registry-starter` in `apps/web/components.json`.

**Why:** User explicitly chose this direction. The registry-starter gives us a coherent design system (theme tokens, ~50 shadcn primitives, branded shell components like `brand-header`/`brand-sidebar`/`logo`) without forking the starter app.

**How to apply:**

- Need a new shadcn primitive (form, dialog, select, popover, calendar, …)? Run inside docker, **not** on host pnpm:
  ```
  docker run --rm -v "$PWD/apps/web:/app" -w /app node:20-alpine sh -c "
    corepack enable && corepack prepare pnpm@9.15.0 --activate
    pnpm dlx shadcn@latest add --yes @registry-starter/<component>
  "
  ```
  Then regenerate lockfile in the same container with `pnpm install --lockfile-only`, then `./scripts/dev.sh up -d web` to rebuild.

- **shadcn writes some files at the registry's literal paths**, ignoring our `aliases.components: "@/components/customer"` for non-`registry:ui` items. After every add, audit for stray files that should NOT exist:
  - `src/app/{globals.css,layout.tsx,page.tsx}` ← starter's demo files; delete (would clobber `(frontend)/...` route group)
  - `src/{tsconfig.json,postcss.config.mjs,package.json}` ← starter's own root configs at wrong path; delete
  - `src/components/{logo,brand-*,login,...}.tsx` ← branded components; **move to `src/components/customer/`**
  - shadcn UI primitives in `src/components/ui/*.tsx` are fine where they are.

- **registry-starter declares zero `dependencies` on its component items** — it assumes you have its base package.json deps already installed. Required base deps in our `apps/web/package.json` (already added): `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `next-themes`, plus dev `tw-animate-css`. New components may need extra deps — check imports after `add`.

- **registry-starter sometimes omits `registryDependencies`** too — `sidebar.tsx` imports `Sheet`/`Skeleton`/`Tooltip` but the registry's `sidebar.json` declares no registry deps. After adding sidebar-style components, watch for "Module not found: Can't resolve '@/components/ui/...'" and pull the missing primitives explicitly.

- **Don't mass-pull primitives** — shadcn's value is on-demand. Only pull what code currently imports.

- **Don't fork the starter repo wholesale.** Its `next.config.ts`, `biome.json`, root `package.json`, `tsconfig.json`, `.github/workflows/`, demo routes under `src/app/demo/` are *the starter's own packaging*, not part of the design system. Our smn already has its own equivalents tuned for Payload + the deploy pipeline.

- **Theme provider:** `next-themes` is wired at the `(frontend)/layout.tsx` root so all customer + public pages get `class="dark"` toggling. Light/dark CSS tokens already live in globals.css.

- **Payload admin (`/admin`) is fully insulated.** The shadcn theme + components are scoped to the `(frontend)` route group via `globals.css` import gating; the `(payload)` route group has its own root layout and bundled CSS — touching customer UI does not affect admin.
