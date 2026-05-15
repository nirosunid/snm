# Meta App Review submission (Issue #18)

Step-by-step for getting the SMN Meta App from Development to Live mode.
Most of this is operator work — the code surface is already in place
(see "What's already built" below).

## Prerequisites

All items in [`launch-prerequisites.md`](./launch-prerequisites.md) must
be green:

- ✅ Real privacy + terms (lawyer-reviewed) live at `/privacy` + `/terms`
- ✅ Business entity registered + Meta Business Manager verified
- ✅ Domain pointing to prod, TLS valid (see [`deploy.md`](./deploy.md))
- ✅ `support@<domain>` reachable
- ✅ `apps/web/public/icon-1024.png` is the real branded icon, not the placeholder

## What's already built (Issue #18 code surface)

| Endpoint | Purpose | Notes |
|----------|---------|-------|
| `POST /api/meta/data-deletion` | Meta Data Deletion Callback | Verifies signed_request with `META_APP_SECRET`, deletes all `accounts` rows keyed by `platformUserId`, returns `{ url, confirmation_code }`. |
| `GET /api/health` | Liveness + readiness probe | Returns 200 with `{ ok, uptime_seconds, checks: { database } }`; 503 if any check fails. |
| `POST /api/oauth/instagram/start` | Connect Instagram CTA | Already in #12. |
| `GET /api/oauth/instagram/callback` | OAuth return URL | Already in #12. |

## Required permissions (justifications)

| Permission | Why we need it | Where it's used |
|------------|----------------|-----------------|
| `instagram_business_basic` | Read the connected IG account's profile (id, username, account_type) so the customer sees which account they connected, and so we can refuse Personal accounts. | OAuth callback ([apps/web/src/app/(frontend)/api/oauth/instagram/callback/route.ts](../../apps/web/src/app/(frontend)/api/oauth/instagram/callback/route.ts)). |
| `instagram_business_content_publish` | Post the approved carousel to the customer's IG account on their behalf. | Publish flow ([apps/web/src/lib/instagram/publish.ts](../../apps/web/src/lib/instagram/publish.ts)). |

> Note: The legacy `instagram_basic`, `pages_show_list`, `business_management` permissions belong to the Facebook-Login-for-Business flow we don't use. SMN uses the standalone Instagram Login API (post-Dec-2024) so a customer connects an IG Business or Creator account directly without a Facebook Page link.

## Meta App Dashboard fields

When configuring the App in [developers.facebook.com](https://developers.facebook.com):

| Field | Value |
|-------|-------|
| App Name | SMN |
| App Type | Business |
| Privacy Policy URL | `https://<domain>/privacy` |
| Terms of Service URL | `https://<domain>/terms` |
| Data Deletion Instructions URL | `https://<domain>/privacy#data-retention--deletion` |
| Data Deletion Callback URL | `https://<domain>/api/meta/data-deletion` (optional but recommended) |
| Valid OAuth Redirect URIs | `https://<domain>/api/oauth/instagram/callback` |
| App Icon | `apps/web/public/icon-1024.png` |
| App Domain | `<domain>` |
| Category | Business / Productivity |
| Business Use Case | "Allow content creators to publish carousels to their connected Instagram Business or Creator accounts." |

## Screencast script (5–8 minutes)

Required permissions must each be demonstrated. Suggested order:

1. **Sign-up** (~30s) — visit `https://<domain>`, click "Get started", create account with a real email.
2. **Brand creation** (~1 min) — `/customer/brands/new`, fill out brand wizard with name, niche, audience, tone, do/don't, vocabulary, palette, font, logo upload.
3. **Voice samples** (~30s) — paste 3–5 past posts on the brand detail page; show the count badge update.
4. **Asset upload** (~30s) — visit `/customer/brands/<id>/library`, upload 2–3 photos, tag them.
5. **Connect Instagram** (~1 min) — click "Connect Instagram" on the brand page → OAuth round-trip → return with `?ig=connected`. **Show the Personal-account refusal path too** if you have a test Personal account: connect it, see the conversion-required alert with the link to Meta's docs. Permission demonstrated: `instagram_business_basic`.
6. **Generate carousel** (~1 min) — `/customer/generate`, type a topic, click Generate, watch the planner → writer → reviewer pipeline complete in ~5–10s, see the draft preview.
7. **Edit + approve** (~30s) — open the draft from the queue, edit one slide's copy, save, click Approve.
8. **Publish to Instagram** (~1 min) — pick the connected IG account, click Publish, watch the success Alert appear with the `mediaId` and "View on Instagram ↗" link, click through to confirm the post is live on the test IG account. Permission demonstrated: `instagram_business_content_publish`.
9. **Disconnect** (~15s) — back on the brand page, click Disconnect on the connected account, see the row disappear.
10. **Data deletion** (~30s) — show the dashboard's Danger zone card, type the email, click Delete forever. Show the redirect to `/sign-in?deleted=1`.

Record at 1080p, 30fps, no music, voice-over narrating each step. Cursor visible. Aim for 6 minutes; pad with the Personal-account refusal screen if you finish under 5.

## Submission

1. In the Meta App Dashboard, **App Review → Permissions and Features**.
2. For each permission listed in the table above, click **Get advanced access**, paste the justification text, and attach the screencast.
3. **App Review → Verification → Business Verification** must show green before submission.
4. Click **Submit for Review**. Meta typically responds in 5–10 business days.

## Common rejections + how to address them

| Reason | Fix |
|--------|-----|
| "Test user flow incomplete" | The screencast didn't show every permission's use end-to-end. Re-record covering the missing step. |
| "Privacy policy doesn't address data retention" | Confirm `/privacy` section 5 ("Data retention & deletion") is intact and the deletion path is described. |
| "App icon is placeholder" | Replace `apps/web/public/icon-1024.png` with the final branded asset — no "TBD" or stock-photo iconography. |
| "Data deletion callback returned 4xx" | Meta tested `POST /api/meta/data-deletion` with a fixture signed_request. Verify `META_APP_SECRET` matches the App Dashboard's secret; verify the route is publicly reachable (try `curl -X POST -d 'signed_request=invalid' https://<domain>/api/meta/data-deletion` — should return 400 with a structured error). |
| "Instagram Login redirect URI mismatch" | The redirect URI registered in the App Dashboard MUST match `INSTAGRAM_REDIRECT_URI` in production exactly, including protocol and trailing slash. |
| "App is in Development mode" | After approval, **Settings → Basic → App Mode** → switch to Live. |

## After approval

1. **Switch to Live mode** in the App Dashboard.
2. **`STRIPE_BYPASS=0`** in production (if not already) — paywall enforces.
3. **`INSTAGRAM_OAUTH_MOCK` unset** in production — real OAuth round-trip.
4. **Verify a non-test user can connect an IG account** — sign up from a fresh email with no association to the Meta App's test users; complete OAuth; confirm the `accounts` row writes.
5. **Move to Issue #19** — private beta launch.

## Rollback if something goes wrong

If the live IG OAuth flow misbehaves after approval:

- Quick mitigation: **set `INSTAGRAM_OAUTH_MOCK=1`** in production .env to bypass the real Meta round-trip while you debug. Customers won't be able to connect new accounts but the rest of the app stays up.
- Logs: server-side `console.warn`s in the OAuth callback + webhook handlers carry the error context.
- Worst case: **App Mode back to Development** in the App Dashboard. Stops new live-mode connections; existing tokens keep working until they expire.
