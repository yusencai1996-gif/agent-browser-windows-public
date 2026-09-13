# Changelog

## 0.8.1-alpha.1

- Separate Windows caller pipe handles from the background host; bounded readiness and explicit same-mode reuse / mode-conflict / closed-instance results.
- Local whitelist diagnostics with correlation IDs, bounded retention and optional disabling; no telemetry or raw command/page data.
- Extension context/generation readiness checks and actionable startup phases. Release validation is recorded separately from implementation status.

## 0.8.0-alpha.1

First public-source candidate, based on the 0.8.0 implementation. Adds neutral code-generated branding, portable writable Windows installation/npm lookup, isolated public tests, documentation and synthetic application screenshots. No private Git history, runtime state, browser binaries or personal avatar is included.

Inherited behavior from verified implementation milestones:

- 0.8.0: real overview, memory-only exact-target previews, user takeover/return barrier and protected human windows; protected URL normalization and removal of visible-tab screenshot fallback.
- 0.7.0: optional pinned official OpenCLI Bridge compatibility. No cross-bridge global mutex.
- 0.6.1: tab readiness/disappearance and argument/encoding diagnostics.
- 0.6.0: dedicated shared persistent profile, retained across normal stop/restart.
- 0.5.x: Windows CLI/MCP host, explicit task/tab ownership, packaging and minimized headed startup.

These entries describe available behavior, not earlier public releases or universal client/site acceptance.
