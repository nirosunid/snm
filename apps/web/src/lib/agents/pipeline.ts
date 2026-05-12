/**
 * Multi-stage carousel pipeline.
 *
 * Stages: planner → writer → reviewer (with at most one writer revision).
 * Each generation persists a `content-jobs` row and walks a status state
 * machine: queued → generating → ready | failed.
 *
 * Async (Celery) reactivation is deferred per CLAUDE.md.
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
import { estimateStageCost, sumCosts, type StageCost } from "./cost";
import { planCarousel } from "./planner";
import { formatIssuesForWriter, reviewDraft } from "./reviewer";
import type { GenerateResponse, ReviewRecord } from "./schemas";
import { writeCarousel } from "./writer";

const MAX_REVISIONS = 1;

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

    const voiceSamples = await getBrandVoice(
      input.brandId,
      input.topic,
      input.voiceK ?? 5,
    );

    const someAssets = await searchAssets({
      brandId: input.brandId,
      user: input.user,
      limit: 1,
    });
    const assetsAvailable = someAssets.length > 0;

    let stageTag: "planner" | "writer" | "reviewer" = "planner";
    const stageCosts: StageCost[] = [];

    let planResult;
    try {
      planResult = await planCarousel({
        brand,
        topic: input.topic,
        voiceSamples,
        assetsAvailable,
      });
      stageCosts.push(
        estimateStageCost({
          provider: planResult.provider,
          model: planResult.model,
          usage: planResult.usage,
        }),
      );
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
      stageCosts.push(
        estimateStageCost({
          provider: writeResult.provider,
          model: writeResult.model,
          usage: writeResult.usage,
        }),
      );
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      throw new Error(`[${stageTag}] ${m}`);
    }

    stageTag = "reviewer";
    let reviewResult;
    try {
      reviewResult = await reviewDraft({
        brand,
        draft: writeResult.draft,
        voiceSamples,
      });
      stageCosts.push(
        estimateStageCost({
          provider: reviewResult.provider,
          model: reviewResult.model,
          usage: reviewResult.usage,
        }),
      );
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      throw new Error(`[${stageTag}] ${m}`);
    }

    // Single revision loop. If the reviewer says "revise" and we have
    // budget, hand the issues back to the writer for one more pass. The
    // second draft ships regardless of whether the reviewer is happy —
    // the queue UI (#11) surfaces lingering issues to the customer.
    let revisionsRun = 0;
    let finalDraft = writeResult.draft;
    if (reviewResult.review.verdict === "revise" && MAX_REVISIONS > 0) {
      revisionsRun = 1;
      stageTag = "writer";
      try {
        const revised = await writeCarousel({
          brand,
          brandId: input.brandId,
          plan: planResult.plan,
          user: input.user,
          feedback: formatIssuesForWriter(reviewResult.review.issues),
        });
        finalDraft = revised.draft;
        stageCosts.push(
          estimateStageCost({
            provider: revised.provider,
            model: revised.model,
            usage: revised.usage,
          }),
        );
        writeResult = revised;
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        throw new Error(`[${stageTag} revision] ${m}`);
      }
    }

    const reviewRecord: ReviewRecord = {
      ...reviewResult.review,
      revisionsRun,
    };
    const costCents = sumCosts(stageCosts);

    await setStatus({
      status: "ready",
      draftPayload: finalDraft,
      provider: writeResult.provider,
      model: writeResult.model,
      voiceSamplesUsed: voiceSamples.length,
      review: reviewRecord,
      costCents,
    });

    return {
      jobId: job.id,
      status: "ready",
      brand: brand.name,
      topic: input.topic,
      provider: writeResult.provider,
      model: writeResult.model,
      draft: finalDraft,
      voiceSamplesUsed: voiceSamples.length,
      review: reviewRecord,
      costCents,
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
      review: null,
      costCents: null,
      error: message,
    };
  }
}
