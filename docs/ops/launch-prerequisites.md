# Launch prerequisites (Issue #17)

Non-code work that gates Meta App Review (#18) and the private beta (#19).
Most items are human/operator work — track status here as it changes.

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Lawyer-reviewed `/privacy` | founder | ⏳ pending | Working draft lives at `/privacy` with a "pending legal review" alert at the top. Lawyer edits in place. |
| 2 | Lawyer-reviewed `/terms` | founder | ⏳ pending | Same shape as privacy. |
| 3 | Business entity registered | founder | ⏳ pending | LLC paperwork in {jurisdiction}. Required for the Meta App Review business verification step. |
| 4 | Meta Business Manager created | founder | ⏳ pending | Tied to the registered entity. |
| 5 | Meta business verification submitted | founder | ⏳ pending | Can take 5–10 business days. Submit before the App Review request. |
| 6 | Domain registered + DNS pointing to prod host | founder | ⏳ pending | Required for `support@<domain>`, OAuth redirect URI, App Review review URL. |
| 7 | `support@<domain>` mailbox working | founder | ⏳ pending | Inbound + outbound. Used in the privacy policy + terms + Meta App Review. |
| 8 | App icon (1024×1024 PNG) | designer | ⏳ pending | Drop into `apps/web/public/icon-1024.png`. Square, no transparency, no text. |
| 9 | Branded logo SVGs | designer | ⏳ pending | `apps/web/public/{logo,logo-mark}.svg`. |
| 10 | OG share image (1200×630 PNG) | designer | ⏳ pending | `apps/web/public/og-image.png`. Used for link previews. |
| 11 | Favicon + apple-touch-icon | designer | ⏳ pending | Drop into `apps/web/public/`. |

Replace `⏳ pending` with `✅ done` as items land. The whole table should be
green before submitting to Meta App Review.

## Code surface that's already done (Issue #17, step 1)

- **`/privacy` and `/terms`** render at the live URLs with the substance
  Meta App Review looks for — collected data, third-party processors,
  retention/deletion process, security, contact, governing law. Each
  page leads with a destructive Alert flagging the lawyer-review gap so
  no operator confuses the placeholder for the final.
- **Data deletion**: customers can self-serve from the dashboard's
  Danger zone card (email-match-confirmation gate, then cascade-delete
  brands / accounts / voice samples / assets / content jobs /
  subscriptions / media / user). The same path is exposed at
  `POST /api/data-deletion` for support-driven deletions.
- **`apps/web/public/`** scaffolded with a `README.md` enumerating the
  brand-asset files Meta App Review and our own UI need.

## Meta App Review URLs (declare in Meta App Dashboard)

| Field | Value |
|-------|-------|
| Privacy Policy URL | `https://<domain>/privacy` |
| Terms of Service URL | `https://<domain>/terms` |
| Data Deletion Instructions URL | `https://<domain>/privacy#data-retention--deletion` (anchors into section 5 of the privacy policy) |
| App Icon | `apps/web/public/icon-1024.png` once supplied |
| Valid OAuth Redirect URIs | `https://<domain>/api/oauth/instagram/callback` |
| Webhook URL (optional) | `https://<domain>/api/stripe/webhook` (Stripe), `https://<domain>/api/meta/webhook` (Meta — not built yet) |

### Meta Data Deletion Callback (separate from user-initiated)

Meta also offers an *optional* signed-request callback URL that fires when
a user removes the FB app from their account. We have not built that
endpoint yet (`/api/meta/data-deletion`); add it when App Review
requires it (the **Data Deletion Instructions URL** above is enough for
basic compliance). Spec:

- POST receives a `signed_request` body field (URL-encoded).
- Verify the signature with `META_APP_SECRET` (HMAC-SHA256).
- Decode the JSON payload to get `user_id` (the IG-user id).
- Delete the matching `accounts` row(s) keyed by `platformUserId`. Do
  **not** delete the SMN user — they may have other connected accounts.
- Respond `{ url: "<status URL>", confirmation_code: "<code>" }`.

## Once everything above is green

1. Move to **Issue #18** — Meta App Review submission.
2. Then **Issue #19** — private beta launch (5–10 users).
