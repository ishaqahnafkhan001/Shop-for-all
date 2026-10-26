# Decisions, blockers and unavailable evidence

No question below was silently decided by the audit. Proposed safeguards are engineering recommendations; destructive policies require explicit approval during implementation planning.

## Decisions required before irreversible implementation

| Priority | Decision / blocker | Evidence and reason | Required decision owner |
|---|---|---|---|
| P0 | What is the authoritative shop-owner binding? Can multiple VendorAdmins delete, and how do legacy ownerModel/User records reconcile? | Shop lacks ownerAccountId; registration stores verification owner; model permits multiple administrators but normal staff flow does not create co-owners. | Product/security/operations; owner approval. |
| P0 | Does “delete account and shop” mean one current shop, all owned shops, or a separate account request? | Global Account can have independent customer/staff/platform relationships. Registration limitation does not prove single-shop data. | Product/owner; no automatic all-shop cascade. |
| P0 | What happens to an owner's other memberships and an Account with platform/support authority? | Shared Account deletion changes login/password access everywhere. | Product/security; require explicit relationship scope. |
| P0 | Which active orders, COD deliveries, refunds, POs, reservations and financial reviews block acceptance/purge? | Current state enums are not settlement proof; there is no consolidated obligation ledger. | Commerce/finance/operations. |
| P0 | Does request acceptance close new sales immediately even while obligations remain? | Ordinary suspension also blocks tracking/history/returns and recovery paths differ. | Product/operations with customer-rights review. |
| P0 | Who serves required receipts/history/refunds after closure, and under which authentication and data-minimization boundary? | Current customer routes rely on an available tenant and often live parent records. | Product/security/operations/legal. |
| P0 | What are the approved field-level retention periods, triggers, lawful/business bases and legal-hold procedures? | App TTLs and NID retention fields are not a comprehensive legal schedule. | Qualified current Bangladesh legal/tax advice plus finance/privacy owner. |
| P0 | Are there offline commission/payout/chargeback/tax obligations absent from the repository? | No dedicated commission, payout or dispute model/API was found; absent code is not proof of no debt. | Owner/finance/provider account owners. |
| P0 | Can URL-only and legacy Cloudinary resources be proven exclusively owned? | Product/banner shared folders and arbitrary external URLs lack a complete persisted asset ledger. | Storage/operations; authorized read-only provider inventory. |
| P0 | Where is the current anti-resurrection ledger kept independently of the data-backup rollback window? | No tenant-deletion ledger or restore reconciliation exists. Same-database restored copies may predate deletion. | Operations/security/legal. |
| P0 | What actual Mongo/provider/log backup policies and compliance locks exist? | Repository backup instructions are recommended minimums, not deployed configuration. | Infrastructure/operator evidence. |
| P1 | What subdomain/custom-domain quarantine and reuse rules apply? | Shared routing/localStorage/history identities can survive closure and a new tenant can reuse a released name. | Product/security/hosting operations. |
| P1 | How long should the purpose-bound read-only acceptance receipt remain valid, how is it stored, and what recovery follows expiry? | Immediate session/account removal plus a lost response needs a separate minimal proof. Request IDs alone are insufficient. | Product/security. |
| P1 | Is cancellation permitted before irreversible work and when does it end? Is any cooling-off period required? | No current lifecycle exists; a delay is a policy choice, not an excuse to keep data indefinitely. | Product/legal/operations. |
| P1 | Which retained evidence/status can the former owner see versus only platform operators? | Shared customer/finance/support records must not be exposed wholesale to an erased vendor session. | Security/privacy/product. |
| P1 | Completion terms, SLA and provider/backups exceptions | Live erasure, records held and backup expiry are different outcomes. | Product/legal/operations. |
| P1 | Who owns dead/held deletion requests, provider ambiguity and retention review? | Existing dead Jobs are not a final deletion outcome. | Support/operations with named escalation. |

## Operational facts still unknown

- Actual production database/cluster version/tier, replica topology, collections/indexes, orphaned legacy records, identity migration coverage, shop/record/media volumes and write traffic. This audit did not connect to a database.
- Whether a deployed gateway/auth integration issues tokens unlike the inspected code, historical token lifetime/claims and any external identity/MFA/session provider. No refresh/session/MFA collection or endpoint was found in the source examined.
- Cloudinary environment/account/folder mode, immutable asset IDs, external/shared assets, hidden old originals, authenticated/private delivery, backups/versions, deletion permissions, rate limits and account-specific invalidation behavior. No provider account was accessed.
- Pathao/RedX parcel cancellation, COD/fee settlement, retention/erasure and token revocation capabilities and actual merchant/platform credential ownership.
- Actual payment processors beyond manual billing and order payment fields; finance exports, banks, accounting software, tax invoices and externally managed disputes.
- Email/SMS provider account retention, scheduled sends already accepted externally, mailbox logs, suppression policy and processor erasure mechanisms. No claim that delivered messages can be recalled.
- OpenAI organization/project data controls, DPA and other provider processors. `store:false` in the adapter alone does not resolve provider retention.
- Redis persistence/replicas/backups, app process count, frontend hosting/CDN/domain certificate bindings, edge/image caches and out-of-repository scripts/trackers.
- Hosting/log aggregation/export retention and redaction. The logger writes structured stdout; requestContext logs the original path, so token-bearing query URLs require explicit log-policy review. This audit did not inspect logs or secret values.
- Backup snapshots/PITR/oplogs, exports, Cloudinary external backups, staging copies, immutable retention and current restore drills. Selective tenant erasure from those copies is unverified.

## Implementation-time investigations that must remain read-only until approved

1. Reconcile owners, memberships, Accounts, legacy/guest Users and verification ownerModel values for representative shops; report conflicts without silently repairing them.
2. Compare actual collection names/indexes with all 67 model entries and enumerate stale/unregistered collections. Inventory rows lacking tenant keys and foreign links to another tenant.
3. Enumerate provider assets with read-only permissions, map exact identities/types to every current/historical/retained reference, and list ambiguous assets. Do not use folder delete to “clean up” discovery discrepancies.
4. Gather actual backup/export/log/DNS/provider settings and contracts. Do not change credentials, policies or infrastructure to make the audit appear complete.
5. Establish a new test baseline on the implementation branch and resource-registry coverage; the audit's 39 tests are not deletion coverage.

## Ready / not ready

**Ready for implementation design after policy decisions:** the existing monolith, transaction/outbox and worker primitives can support the proposed staged architecture without new infrastructure.

**Not ready to enable irreversible deletion:** canonical ownership/combined account scope, legal and financial treatment, retained customer access, proven media ownership, database/external write fencing and actual backup restoration suppression remain required gates. Unknowns must be made explicit in any user-facing deletion promise; they are not permission to destroy or retain arbitrary data.
