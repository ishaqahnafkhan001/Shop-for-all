# Phase 0 evidence — Atelier Editorial

Gate: PASS for implementation; database integration remains BLOCKED, not passed.

- Revision: 40515d4f6a01f5460451613efbe592b51df692c3. Initial state and 869 tracked-file hashes: git-state.txt and source-hashes.json. Four pre-existing untracked reports preserved.
- Existing focused suite: 200 passed, zero failed/skipped; exact command/output in focused-tests.txt. No source changes preceded this run.
- Original nine complete definitions, fixed-time raw snapshots, normalized output, full/limited/none effective output and capability restrictions: backend tests/fixtures/atelier-legacy/contracts.json and capture.cjs.
- Browser: IAB via CUA; isolated Vite 5203; no authenticated merchant/customer API. All nine homepages captured at 1440x1000 and 390x900; markup, selected computed styles and JPEG screenshots under browser/. Product/cart/checkout/policy mobile previews also captured. Fonts reported loaded. Fixture uses one synthetic product and configured merchant copy.
- Browser network access from sandbox was denied; the same loopback-only fixture server was started through approved elevated execution. No network policy changes.
- Disposable test MongoDB: Docker daemon unavailable (docker info cannot reach DockerDesktopLinuxEngine). Existing destructive harness was inspected but NOT executed; no shared database fallback.
- Figma file sZlr7zuW8dDLDQ0ESGXSf5 nodes2:2/2:3 refreshed, screenshot and full context inspected. Desktop title93px, mobile54px; container1272px; paper#f7f5ee, ink#202721, accent#606cf0, lime#dbec8b, rule#dadbd1. Small accent text uses darker#4653c9, muted#5f655e; reference derivatives preserve 4.5:1 for normal copy. Mobile wraps and stacks with18px gutters.
- DM Sans absent locally; official Google Fonts metadata/OFL inspected: https://github.com/google/fonts/tree/main/ofl/dmsans (SIL OFL1.1 permits embedded redistribution with license). Phase1 may fetch only official font+license; retain Inter/system fallback for unavailable glyphs, including Bengali.
- Rollout: server mode off by default; allowlist IDs only through server configuration; preserve normal plan capabilities. General on requires explicitly approved plan keys, empty by default. No env/live tenant selection changed. Ordinary gallery remains nine.
- Rollback: export trusted published theme/revision before authorized pilot, retaining a secure copy beyond20revision retention; restore under current capability/ownership rules (legacy switchaway always allowed); then disable adoption. Deploy compatible contract readers/backend first, Admin+storefront next; restore legacy before downgrading contract readers. No live pilot authorized in this task.

Next: Phase1 optional identity, hidden registry entry, narrow server gate and additive tests.
