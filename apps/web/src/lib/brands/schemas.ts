import { z } from "zod";

import { FONT_OPTIONS } from "@/collections/Brands";

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const HexOrEmpty = z
  .string()
  .trim()
  .refine((v) => v === "" || HEX.test(v), "Must be a hex color (e.g. #1A2B3C)")
  .transform((v) => (v === "" ? undefined : v));

const StringList = z.array(z.string().trim().min(1)).default([]);

export const CreateBrandInput = z.object({
  name: z.string().trim().min(1, "Name is required"),
  niche: z.string().trim().max(280).optional().or(z.literal("")),
  audience: z.string().trim().max(2000).optional().or(z.literal("")),
  tone: z.string().trim().max(2000).optional().or(z.literal("")),
  dos: StringList,
  donts: StringList,
  vocabulary: StringList,
  palette: z
    .object({
      primary: HexOrEmpty.optional(),
      secondary: HexOrEmpty.optional(),
      accent: HexOrEmpty.optional(),
      background: HexOrEmpty.optional(),
      text: HexOrEmpty.optional(),
    })
    .optional(),
  font: z.enum(FONT_OPTIONS).default("Inter"),
});

export type CreateBrandInputType = z.infer<typeof CreateBrandInput>;
