# Security and data boundaries

This alpha is a local, same-Windows-user automation tool, not a sandbox against a malicious program running as you or an administrator. Connect only trusted agents. The browser extension needs broad website/debugger permissions to automate pages. ABW authenticates its loopback bridge and protects its local control state with Windows ACLs; these controls do not make arbitrary local clients trustworthy.

The default shared profile stores website login and storage data locally under `.local/profiles/shared`. Every attached task can act with that shared website identity. Separate task names isolate tab ownership, not accounts. Use a temporary instance for work that does not need persistent identity. Login manually; do not export Cookies, passwords or local capabilities to an agent or bug report.

ABW does not call a model API itself. Text, snapshots, evaluated data and screenshots returned to an agent may be sent to that agent's model/provider according to its configuration. Screenshots explicitly saved by CLI go to `artifacts`; downloaded files and local profile data remain on the machine until the user manages them. Overview previews are held in memory, not a screenshot archive. Avoid selecting sensitive pages for preview when sharing your screen.

User takeover pauses the ABW channel only. It cannot pause OpenCLI or other software, cancel model reasoning, undo website actions, or guarantee a lost command did not run. An uncertain command is not automatically retried. OpenCLI is optional, separately connected and has its own privileges. Its fixed upstream files and license are listed in vendor/opencli-bridge/PROVENANCE.json.

Do not bypass website verification, risk controls or authorization. Site/Agent compatibility, unattended production use, power-loss recovery and data not yet written by a site are not guaranteed. Never stop a browser containing another user's unfinished work just to recover a test.

## Reporting

Optional local diagnostic events are bounded to about12MiB under the protected `.local/logs` directory. They record fixed lifecycle metadata only, not raw stderr, URLs, task names or credentials. Events are not automatically sent anywhere; use the bounded `diagnostics` command to review what you choose to share. Logging is best-effort and is not proof that an uncertain website action was rolled back. `diagnostics --off` disables new events for this installation without erasing existing records.

No dedicated private vulnerability reporting channel is configured in this source snapshot. Do not post exploitable details, credentials or personal pages publicly. You may open a minimal issue requesting a private contact route without sensitive details, then wait for the maintainer to establish one. There is no promised response SLA. Before attaching logs, remove personal paths and website data; prefer a local synthetic reproduction.
