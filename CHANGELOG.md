# Changelog

## 0.9.1-alpha.1

- Restrict first-load and generation-reset default observation to active Agent tasks. Human, unassigned and ended rows remain visible but are not an automatic fallback; explicit user selection and same-generation reconnect remain supported.
- Creating a human window does not select it for observation. Auxiliary tab groups stay in the tab's work window; changes of window, group or ownership detected during lookup cancel decoration instead of reversing user actions.
- Retain 0.9.0's overview/window/preview boundaries. 0.9.0 source reached public CI but was not tagged or released before this correction.

## 0.9.0-alpha.1 (candidate)

- Isolate the management overview in a popup window. Fresh startup binds its initial blank target before reuse; existing unknown pages remain preserved in background windows.
- Add collapsible Agent/task groups with vertical webpage rows and explicit snapshot observation. Optional task display labels do not replace owner IDs or authenticate an Agent.
- Keep supported webpage creation in normal work windows, restore unintended background window state after readiness, and capture previews without viewport adjustment. Task-level takeover and the independent OpenCLI boundary remain explicit.

## 0.8.3-alpha.1 (candidate)

- Repair the first headed start when stale local host metadata overlaps a new host's pipe publication. Startup remains bounded and requires the existing authenticated channel plus matching launch ID and process ID before release.
- Carry forward 0.8.2's default management overview and updated Agent skill. No account migration, browser dependency upgrade or permission expansion.

## 0.8.2-alpha.1 (candidate)

- Headed start creates or reuses a minimized management overview; visible start and bare show bring it forward. An explicit window ID still selects that native webpage window.
- Repeated starts repair a closed overview without creating duplicates or focusing it; headless remains windowless. Agent pages continue in separate background tabs.
- Update the daily skill and quickstart to teach the overview as the default management surface. No change to task ownership or takeover permissions.

## 0.8.1-alpha.1 (candidate)

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
