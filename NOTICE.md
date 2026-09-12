# Sources and licenses

New integration code, documentation and neutral code-generated branding are distributed under the root MIT license, copyright Agent Browser for Windows contributors. This does not relicense third-party components or claim all code is original.

The extension page automation engine derives from [huashu-chrome](https://github.com/alchaincyf/huashu-chrome), commit `b979984ebf0b4dc13b303c1c171823c7afab3e8f`. Its original MIT license and Copyright (c) 2026 花叔 (alchaincyf) remain byte-for-byte in `extension/LICENSE`. Modifications are described in `extension/CHANGES.md`. Upstream personal icons and downstream personal avatar are excluded; the public icon is generated from simple geometric shapes.

The unmodified official OpenCLI Browser Bridge 1.0.23 (OpenCLI 1.8.7), commit `87b60a36590c3e2a466c37266c3348d73d7f68fe`, is Apache-2.0. The original license is `vendor/opencli-bridge/LICENSE`; release source and per-file hashes are in `vendor/opencli-bridge/PROVENANCE.json`. No separate upstream NOTICE was present in that fixed source. The component remains Apache-2.0 alongside MIT project code.

ego-lite was a research reference only; no native browser binary or source from it is included.

This archive excludes node_modules and all browser binaries. `package-lock.json` pins npm dependencies and records package license metadata; THIRD-PARTY.json inventories these records without claiming a legal audit. Installed packages retain their own notices. Chromium is obtained separately by Playwright's installer and has its own distribution terms. No personal portrait, private profile or account content is licensed or included here.
