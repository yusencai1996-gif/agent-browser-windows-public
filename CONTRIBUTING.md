# Contributing

Use Windows and Node.js 26+. Install with `npm ci --ignore-scripts --no-audit --no-fund`; run `npm test` before proposing changes. Browser integration is separate (`npm run test:browser`, requires `setup`). Tests create unique owned directories and reject links; never point a test at an existing browser profile. Set `ABW_TEST_TMP` to an existing writable temporary parent if needed.

Keep changes focused and include a synthetic regression case for behavior changes. Preserve task ownership, fail-closed unknown outcomes, user-only handback, exact-target capture and profile retention. Do not introduce credential logging, blanket process termination, shared-profile cleanup or fallback to a user's default browser. Do not run public-site business actions in CI.

This repository is a source snapshot with explicit upstream attribution (see NOTICE.md and SOURCE.json). It does not contain earlier private Git history. Normal development can continue here; when maintaining another downstream copy, exchange reviewed commits or explicit patches and regenerate snapshots from the agreed source. Avoid manually maintaining diverging copies of runtime modules.

The source ZIP has a SHA-256 sidecar and MANIFEST.json. Check each payload entry using its SHA-256 before installation. MANIFEST excludes itself; the ZIP sidecar covers the whole archive. No browser or npm dependency binaries are bundled. File paths in provenance are repository-relative.

Changes derived from third-party code must retain its license and copyright. Contributions to new project code are under the root MIT license; third-party files retain their original terms. Report a minimal reproducible issue with OS/Node versions and error codes, not real account data.
