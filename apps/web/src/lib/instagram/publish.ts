/**
 * Carousel publish flow for Instagram Graph API.
 *
 * Three-step Meta sequence:
 *   1. POST /{ig_user_id}/media per slide with image_url + is_carousel_item=true
 *      → returns a creation_id (the media container).
 *   2. POST /{ig_user_id}/media with media_type=CAROUSEL + children=<csv>
 *      + caption → returns the carousel container id.
 *   3. POST /{ig_user_id}/media_publish with creation_id → returns the
 *      published media id.
 *
 * Containers are async — between steps 1 and 2, and between 2 and 3, we
 * poll GET /{container_id}?fields=status_code until it returns FINISHED.
 *
 * INSTAGRAM_OAUTH_MOCK=1 short-circuits all of this and returns a synthetic
 * media id so the UI flow runs end-to-end without real Meta credentials.
 */

import { isMockMode } from "./oauth";

const GRAPH_BASE = "https://graph.instagram.com/v21.0";

/** Polling tuned for Meta's typical container-build times (a few seconds for
 *  small carousels). Caller is responsible for surfacing timeout errors. */
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;

export type PublishSlideInput = {
  /** Publicly-reachable PNG/JPEG URL the IG fetcher can resolve. */
  imageUrl: string;
};

export type PublishCarouselInput = {
  igUserId: string;
  accessToken: string;
  caption: string;
  slides: PublishSlideInput[];
};

export type PublishCarouselResult = {
  mediaId: string;
  /** Optional permalink — the publish step doesn't always return one; we
   *  fetch it best-effort for the UI deep-link. */
  permalink: string | null;
};

export async function publishCarousel(
  input: PublishCarouselInput,
): Promise<PublishCarouselResult> {
  if (isMockMode()) {
    return {
      mediaId: `mock-media-${Date.now()}`,
      permalink: "https://www.instagram.com/p/mock-permalink/",
    };
  }
  if (input.slides.length < 2 || input.slides.length > 10) {
    // IG requires 2–10 children for a carousel. Single-image posts use a
    // different media_type and we don't ship that path in MVP-1.
    throw new Error(
      `Instagram carousels require 2–10 slides; got ${input.slides.length}.`,
    );
  }

  const childIds: string[] = [];
  for (const slide of input.slides) {
    const id = await createCarouselChild({
      igUserId: input.igUserId,
      accessToken: input.accessToken,
      imageUrl: slide.imageUrl,
    });
    await waitForContainerFinished(id, input.accessToken);
    childIds.push(id);
  }

  const carouselId = await createCarouselContainer({
    igUserId: input.igUserId,
    accessToken: input.accessToken,
    caption: input.caption,
    childIds,
  });
  await waitForContainerFinished(carouselId, input.accessToken);

  const mediaId = await mediaPublish({
    igUserId: input.igUserId,
    accessToken: input.accessToken,
    creationId: carouselId,
  });

  const permalink = await fetchPermalink(mediaId, input.accessToken).catch(
    () => null,
  );
  return { mediaId, permalink };
}

async function createCarouselChild(args: {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
}): Promise<string> {
  const url = new URL(`${GRAPH_BASE}/${args.igUserId}/media`);
  const body = new URLSearchParams({
    image_url: args.imageUrl,
    is_carousel_item: "true",
    access_token: args.accessToken,
  });
  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) {
    throw new Error(
      `Failed to create carousel child (HTTP ${res.status}): ${await safeText(res)}`,
    );
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error("Carousel child create returned no id.");
  return json.id;
}

async function createCarouselContainer(args: {
  igUserId: string;
  accessToken: string;
  caption: string;
  childIds: string[];
}): Promise<string> {
  const url = new URL(`${GRAPH_BASE}/${args.igUserId}/media`);
  const body = new URLSearchParams({
    media_type: "CAROUSEL",
    children: args.childIds.join(","),
    caption: args.caption,
    access_token: args.accessToken,
  });
  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) {
    throw new Error(
      `Failed to create carousel container (HTTP ${res.status}): ${await safeText(res)}`,
    );
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error("Carousel container create returned no id.");
  return json.id;
}

async function mediaPublish(args: {
  igUserId: string;
  accessToken: string;
  creationId: string;
}): Promise<string> {
  const url = new URL(`${GRAPH_BASE}/${args.igUserId}/media_publish`);
  const body = new URLSearchParams({
    creation_id: args.creationId,
    access_token: args.accessToken,
  });
  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) {
    throw new Error(
      `media_publish failed (HTTP ${res.status}): ${await safeText(res)}`,
    );
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error("media_publish returned no id.");
  return json.id;
}

async function waitForContainerFinished(
  containerId: string,
  accessToken: string,
): Promise<void> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const url = new URL(`${GRAPH_BASE}/${containerId}`);
    url.searchParams.set("fields", "status_code");
    url.searchParams.set("access_token", accessToken);
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      throw new Error(
        `Container status check failed (HTTP ${res.status}): ${await safeText(res)}`,
      );
    }
    const json = (await res.json()) as { status_code?: string };
    const code = json.status_code;
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(
        `Container ${containerId} ended in status ${code}; cannot publish.`,
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(
    `Container ${containerId} did not reach FINISHED within ${POLL_TIMEOUT_MS}ms — try again later.`,
  );
}

async function fetchPermalink(
  mediaId: string,
  accessToken: string,
): Promise<string | null> {
  const url = new URL(`${GRAPH_BASE}/${mediaId}`);
  url.searchParams.set("fields", "permalink");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) return null;
  const json = (await res.json()) as { permalink?: string };
  return json.permalink ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
