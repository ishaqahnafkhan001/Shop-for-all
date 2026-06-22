# Incident Runbook

## Checkout Failure

1. Check API health.
2. Search logs by `x-request-id`.
3. Check MongoDB connectivity.
4. Check stock decrement errors and payment/courier failures.
5. Disable risky promotions if totals are wrong.

## Database Down

1. Confirm provider status.
2. Stop non-essential workers if they add load.
3. Preserve logs and request IDs.
4. Restore from latest verified backup only after confirming data loss.

## Email Failure

1. Check provider status and env variables.
2. Verify OTP/password-reset direct mail first.
3. Check queued vendor notification jobs.
4. Re-run failed jobs after provider recovery.

## Courier Failure

1. Check Pathao credentials and provider status.
2. Confirm `pathaoSyncStatus` on affected orders.
3. Retry failed courier jobs from the worker once the provider is healthy.

## Data Leak Suspicion

1. Freeze affected access paths.
2. Rotate exposed secrets.
3. Review `PlatformAuditLog` and request IDs.
4. Check NID document access logs.
5. Prepare customer/vendor notification with legal guidance.

## Store Suspension Mistake

1. Inspect shop `approvalStatus`, `isActive`, and `suspensionReason`.
2. Verify whether suspension was manual or verification-related.
3. Unsuspend only with a reasoned Super Admin action.
4. Confirm storefront loads after cache invalidation.
