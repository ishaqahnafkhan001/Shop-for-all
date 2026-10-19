# Email and SMS delivery cutover

1. Back up the production MongoDB database. Deploy the code to the API and the separate `npm run worker` process together. Do not start the worker until the new indexes below are present.
2. Set `PUBLIC_API_URL` to the public HTTPS backend origin. Set a stable, random `MARKETING_UNSUBSCRIBE_SECRET` of at least 32 characters. Set the Resend API key, sender, and `RESEND_WEBHOOK_SECRET` on the backend. Never put these in frontend variables. Configure SMS credentials and keep `SMS_MOCK_MODE=false` in production.
3. Run `npm run check:notifications` with the production environment loaded. This checks presence and URL shape without printing values. Confirm the worker is continuously running and using the same MongoDB deployment as the API.
4. Build the new MongoDB indexes before enabling campaigns: `node scripts/prepare-notification-indexes.js`. This script creates indexes; it does not drop or rewrite existing data.
5. Register `POST https://<backend>/api/webhooks/resend` in Resend for `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed`. Copy that endpoint's signing secret into `RESEND_WEBHOOK_SECRET`. A verified webhook updates recipient outcomes. The worker also polls accepted Resend messages by provider ID every minute.
6. Existing customers are **not** silently opted in. The optional checkout checkbox queues a confirmation email; marketing consent activates only after the customer confirms from that inbox within seven days. Campaign recipient counts include only confirmed, unsuppressed customers for that store. Existing queued campaigns without recipient snapshots are marked `needs_attention` and must be recreated; they are never blindly resent.
7. `accepted` means the provider accepted the API request, not that the recipient received the email. `delivered` is recorded only from a verified provider event or provider reconciliation. `uncertain` means the provider may have accepted a request but no safe automatic resend is possible. Resolve these from provider logs before any manual action.
8. SMTP campaigns retain existing sending support but cannot safely replay an interrupted submission. Resend campaigns retry with a stable idempotency key only within the provider's 24-hour retention window. After that, unresolved outcomes remain `uncertain`.
9. Check the Customers campaign modal for accepted, delivered, failed, skipped, and uncertain counts. Check the order list toast if a status changed but its transactional email was rejected. No test script sends a real email or SMS.

Rollback note: do not resume an old worker against the new campaign queue. Stop the worker and resolve queued or uncertain recipients before any rollback. Keep `MARKETING_UNSUBSCRIBE_SECRET` stable so links in already accepted emails remain valid.

## New shop welcome notifications

### Production configuration

Configure these on **both** the API and worker unless stated otherwise. Keep credentials in the deployment secret store, never in the admin build.

| Key | Required value and use |
| --- | --- |
| `MONGO_URI` | Same production MongoDB replica set for API and worker; transactions require replica-set support. |
| `EMAIL_PROVIDER` | `resend` for idempotent welcome email retries and provider reconciliation. |
| `RESEND_API_KEY` | Resend API key with permission to send from the verified domain. |
| `EMAIL_USER` / `RESEND_FROM` / `ADMIN_EMAIL_USER` | Welcome sender uses the first configured value in this order. The effective address must belong to a verified Resend domain. |
| `RESEND_WEBHOOK_SECRET` | `whsec_...` signing secret from the **specific** Resend webhook registered for this backend. An API key is not a webhook secret. |
| `SMS_API_BASE_URL`, `SMS_API_KEY` | HTTPS SMS gateway origin and its API token. The adapter posts to `/api/v1/send-sms`. |
| `SMS_SENDER_ID`, `SMS_INCLUDE_SID`, `SMS_PROVIDER_PHONE_FORMAT` | Match the gateway account and accepted payload/phone format (`local` or `normalized`). Confirm these with the provider. |
| `SMS_MOCK_MODE` | `false` in production. The adapter refuses mock delivery when `NODE_ENV=production`. |
| `ADMIN_APP_URL` | Public HTTPS **origin** of the admin app, without a path; welcome links append `/dashboard`. |
| `PLATFORM_ROOT_DOMAIN` | Public storefront root hostname only, without scheme, path, or port; a new shop link is `https://<subdomain>.<root>`. |
| `SUPPORT_EMAIL` | Working support mailbox displayed in the welcome email. |
| `PUBLIC_API_URL` | Public HTTPS backend origin used when registering `POST /api/webhooks/resend`. |

In the Resend dashboard, register `https://<public-backend-origin>/api/webhooks/resend` for `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed`; save that endpoint's signing secret as `RESEND_WEBHOOK_SECRET`. Confirm the endpoint is reachable publicly and inspect delivery attempts. A localhost URL needs a temporary HTTPS tunnel for development and cannot serve as the production webhook endpoint. Run `NODE_ENV=production npm run check:notifications` with the deployment environment loaded, then verify the actual worker process and Resend webhook in their respective dashboards; the checker cannot inspect either external process or account registration.

- Registration commits the shop, owner membership, two per-channel welcome records, and two jobs in one transaction. The worker sends only after commit. The old single-channel `registration.vendor_welcome` job is cancelled for manual review rather than replayed after this cutover.
- Set `ADMIN_APP_URL` to the public admin **origin**, `PLATFORM_ROOT_DOMAIN` to the storefront root domain, and `SUPPORT_EMAIL` to the support inbox. Production URLs must use HTTPS. Both `EMAIL_PROVIDER=resend` with its key and sender, and the SMS gateway credentials, are required for both welcome channels. Run `npm run check:notifications` in the deployed environment and confirm the separate worker runs continuously.
- Before starting the new worker, run `node scripts/prepare-notification-indexes.js` against the intended database. This creates the unique `(shopId, accountId, channel)` welcome index, the unique job idempotency-key index, and the webhook event ID index. It does not send messages. Confirm the script reports success; model declarations alone do not prove the indexes exist in the deployed database.
- The admin Notifications page shows each channel as queued, accepted, delivered, failed, uncertain, skipped, or mocked. Email delivery is confirmed by the signed Resend webhook or provider polling; SMS has provider acceptance only. `uncertain` requires checking provider history before any manual resend.
- For one controlled live test, register a test shop with an authorized test email and phone, inspect both welcome records and the provider dashboards, then verify the storefront and admin links. Do not use automated tests to send real messages. Confirm the email webhook produces a delivered or bounce event; do not interpret provider acceptance as inbox delivery.
