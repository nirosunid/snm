# Private beta launch (Issue #19)

How to take SMN from "App Review approved" to a small set of paying-or-free
users actively generating + publishing carousels, with a feedback loop
that drives prompt-tuning iterations until the founder-quality bar is met.

## Prerequisites

- ✅ Meta App Review approved + App Mode = Live (#18)
- ✅ All `launch-prerequisites.md` items green (#17)
- ✅ Production deploy stable (#16)
- ✅ Stripe test or live mode wired up (`STRIPE_BYPASS=0` for live)
- ✅ Feedback collection live (this slice — `apps/web/src/collections/Feedback.ts`)
- ✅ Founder dashboard at `/dev/feedback` (this slice)

## Beta cohort: 5–10 users

Hand-pick. Mix of:

- **2–3 in your founder niche** (you can judge the output's brand-voice fit).
- **2–3 outside the niche but Business-account IG users** (validates the platform isn't over-fit).
- **1–2 affiliate-promo creators** (exercises the #14 promo flow).
- **0–1 large-volume user** (stress-test cost + reviewer signal).

## Onboarding script (per user, ~20 min)

1. **Send signup link** with a personalized one-liner explaining the closed beta.
2. **Watch them sign up + create a brand** over a screen share. Note where they get stuck — it's almost always the brand brief (audience, tone, do/don't). Help them with examples.
3. **Show voice samples** — paste 3–5 of their past posts. Explain that this is what the writer mimics.
4. **Show asset library** — upload 2–3 photos. Tag them.
5. **Connect Instagram** — must be a Business or Creator account. If they're on Personal, walk them through the conversion (link in the conversion-required alert).
6. **Generate the first carousel** — pick a topic together. Watch the planner → writer → reviewer pipeline run.
7. **Show the editor** — let them edit one slide's copy, save, approve.
8. **Show Publish** — pick the connected IG account. Hit publish. Open the post on IG to confirm.
9. **Show the Feedback card** — explain that you read every rating + note personally. Ask them to leave one as soon as they have an opinion.
10. **Calendar a follow-up** for ~1 week out.

## Feedback loop cadence

- **Daily** — open `/dev/feedback`. Read every new note. Flag anything that smells like a recurring pattern (multiple users hitting the same issue).
- **Weekly** — synthesize the week's notes into 1–3 prompt-tuning hypotheses. Implement, deploy, observe. Log the iteration in [`docs/ops/prompt-tuning-log.md`](./prompt-tuning-log.md) (create on first iteration).
- **Per-user weekly check-in** — 15 min, async via email or sync via Loom. Ask:
  - How many drafts have you generated? Approved? Published?
  - Of the rejected drafts, what was the issue?
  - What's missing that would make you publish more?

## Founder-quality bar

The acceptance criterion (#19) is concrete:

> Founder publishes ≥50% of generated drafts on their own brand without edits, the rest with only minor edits.

**The founder is user #0 of the beta**. Run their own brand through SMN every week. Track:

| Drafts generated | Drafts published as-is | Drafts published with minor edits | Drafts discarded |
|------------------|------------------------|-----------------------------------|------------------|
| | | | |

If the founder isn't shipping ≥50% as-is, the beta does NOT expand. Iterate the planner / writer / reviewer prompts and brand-template designs until the bar is met. Then onboard the next batch.

## What the code surface gives you

- **`POST /api/customer/generate`** writes to `content-jobs` with `provider`, `model`, `costCents`, `voiceSamplesUsed`, `review.{verdict,issues,revisionsRun}`. Every generation is durably tracked.
- **`feedback` collection** — one row per (user, job) with rating 1-5 + free-form notes. Idempotent: re-saving updates the same row, doesn't append.
- **`/dev/feedback`** (staff-gated) — aggregate count, average, distribution, recent feedback table. Cap of 100 most recent entries (paginate later if needed).
- **`content-jobs` admin view** in `/admin` — every generation is browsable end-to-end with the draft, the reviewer issues, and the cost. Use this when triangulating a feedback note against the actual draft.

## When to expand the beta

- **All of**: founder-quality bar met for ≥2 consecutive weeks; ≥80% of beta users have generated ≥3 carousels each; ≥60% have published ≥1; no critical bugs in the past 7 days.
- **None of**: planner / writer / reviewer prompts have changed in the past 3 days (let signal stabilize before expanding).

## Common failure modes + fixes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Drafts read flat / off-brand | Voice samples thin or generic | Ask for 5+ samples that *show* the brand voice (not just any post). |
| CTA always says "link in bio" even when promo isn't on | Writer prompt too aggressive | Tighten the planner promo-detection branch in `apps/web/src/lib/agents/planner.ts`. |
| Reviewer says "ship" but draft has obvious issue | Reviewer prompt doesn't cover that issue kind | Add a kind to `REVIEW_ISSUE_KINDS` in `schemas.ts` and update the reviewer prompt. |
| Cost > $0.10 per carousel | Stage models too expensive | Drop to Gemini Flash for planner/reviewer; keep Sonnet/Opus only for writer. Set per-stage env vars (`LLM_PLANNER_PROVIDER`, etc.). |
| Image-caption slides have wrong asset | Asset query keyword mismatch | Improve asset tagging during onboarding; longer-term: tighten the planner's `asset_query` prompt. |

## Exit criteria → public beta

- ≥2 weeks at the founder-quality bar with no regressions
- ≥10 users active for ≥3 weeks
- Average customer rating ≥4.0 / 5
- Cost per carousel < $0.05 average
- Zero unresolved critical bugs

When all are met, expand to public beta (open signup, soft launch).
