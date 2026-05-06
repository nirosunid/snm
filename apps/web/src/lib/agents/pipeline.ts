/**
 * Multi-stage carousel pipeline.
 *
 * Stages: planner → writer. Reviewer (#10) and async/Celery (deferred per
 * CLAUDE.md) come later. Each generation persists a `content-jobs` row
 * and walks a status state machine: queued → generating → ready | failed.
 */

import { getPayload } from "payload";

import config from "@payload-config";

import { searchAssets } from "@/lib/assets/search";
import { getBrandVoice } from "@/lib/voice/retrieval";
import type { ContentJob, User } from "@/payload-types";

import {
  brandLikeFromRecord,
  HARDCODED_BRAND,
  type BrandLike,
} from "./brand";
import { planCarousel } from "./planner";
import { writeCarousel } from "./writer";
import type { GenerateResponse } from "./schemas";

export type RunPipelineInput = {
  topic: string;
  brandId?: number;
  user: User;
  voiceK?: number;
};

export async function runPipeline(
  input: RunPipelineInput,
): Promise<GenerateResponse> {
  const payload = await getPayload({ config });

  // Resolve brand. A real brandId means the customer owns it (access-scoped
  // load); falling back to HARDCODED_BRAND for the playground keeps the
  // tracer working pre-brand. content-jobs requires a real brand row, so
  // we error early if neither is available.
  let brand: BrandLike = HARDCODED_BRAND;
  if (input.brandId) {
    try {
      const record = await payload.findByID({
        collection: "brands",
        id: input.brandId,
        user: input.user,
        overrideAccess: false,
      });
      brand = brandLikeFromRecord(record);
    } catch {
      throw new Error("Brand not found or not owned by you.");
    }
  } else {
    throw new Error(
      "brandId is required — content-jobs are scoped to a real brand. Create one at /customer/brands/new.",
    );
  }

  // Persist queued state up front so failures still leave a row to inspect.
  const job = (await payload.create({
    collection: "content-jobs",
    data: {
      brand: input.brandId,
      owner: input.user.id,
      topic: input.topic,
      status: "queued",
      inputPayload: { topic: input.topic, brandId: input.brandId },
    },
    overrideAccess: false,
    user: input.user,
  })) as ContentJob;

  const setStatus = async (data: Partial<ContentJob>) => {
    await payload.update({
      collection: "content-jobs",
      id: job.id,
      data,
      overrideAccess: true,
    });
  };

  try {
    await setStatus({ status: "generating" });

    // Pre-fetch voice samples (top-K against the topic) so the planner has
    // context. The planner-stage tool exposure (getBrandVoiceTool) is
    // wired in #8 — here we pre-fetch instead of letting the planner
    // round-trip, because synchronous-pipeline latency matters for MVP-1.
    const voiceSamples = await getBrandVoice(
      input.brandId,
      input.topic,
      input.voiceK ?? 5,
    );

    // Pre-check whether the brand has any assets — affects the planner's
    // image_source choice.
    const someAssets = await searchAssets({
      brandId: input.brandId,
      user: input.user,
      limit: 1,
    });
    const assetsAvailable = someAssets.length > 0;

    let stageTag = "planner";
    let planResult;
    try {
      planResult = await planCarousel({
        brand,
        topic: input.topic,
        voiceSamples,
        assetsAvailable,
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      throw new Error(`[${stageTag}] ${m}`);
    }

    stageTag = "writer";
    let writeResult;
    try {
      writeResult = await writeCarousel({
        brand,
        brandId: input.brandId,
        plan: planResult.plan,
        user: input.user,
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      throw new Error(`[${stageTag}] ${m}`);
    }

    await setStatus({
      status: "ready",
      draftPayload: writeResult.draft,
      provider: writeResult.provider,
      model: writeResult.model,
      voiceSamplesUsed: voiceSamples.length,
    });

    return {
      jobId: job.id,
      status: "ready",
      brand: brand.name,
      topic: input.topic,
      provider: writeResult.provider,
      model: writeResult.model,
      draft: writeResult.draft,
      voiceSamplesUsed: voiceSamples.length,
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await setStatus({ status: "failed", error: message });
    return {
      jobId: job.id,
      status: "failed",
      brand: brand.name,
      topic: input.topic,
      provider: null,
      model: null,
      draft: null,
      voiceSamplesUsed: 0,
      error: message,
    };
  }
}
