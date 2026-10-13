# Agent Browser Native — Windows x64 installer preview

Version 0.10.0-alpha.2 is a fresh-install Setup.exe candidate. Consult release validation for the Windows environments actually tested; an x64 build does not prove every Windows version works.

Setup runs for the current user and requires a new local directory. It checks Windows PowerShell 5.1 and WebView2 Evergreen before installation. For missing WebView2 use https://developer.microsoft.com/microsoft-edge/webview2/ and retry. Node 26.2.0 is bundled and hash-verified. End users do not need Node, Visual Studio or the WebView2 SDK installed.

Use the installed abw.exe for CLI and MCP; abw.cmd forwards to it. The native launcher verifies program/runtime hashes before Node executes and limits inherited handles to stdin/stdout/stderr. Node preload settings are not passed to the child. Start Menu opens the normal empty overview. The installation is bound to its selected physical root and Windows user; manual relocation, parallel installation roots and in-place upgrade are unsupported.

Commands: abw.exe help; start --claim-id NEW_UUID; task MY_TASK --agent-name MY_AGENT --display-name PURPOSE; tools; schema tabs; call TOOL --task MY_TASK --input -; mcp --task MY_TASK; end MY_TASK. Tool inputs use UTF-8 stdin and EOF. Preserve the existing ownership rules: only end your task, and stop only your verified created instance after checking other tasks/human ownership. The 11 tools and public HTTPS connection checks remain; they are not an OS sandbox.

Normal start reuses live services. IPC exit5 is not proof of death. Confirmed dead registrations or colliding old claim receipts can be privately archived only after the existing process/pipe/mutex/Profile/ACL/snapshot checks. Old evidence is retained, tasks need registration again, and unknown tool outcomes are not replayed. Never force-kill or delete state to bypass refusal.

If Windows servicing changes PowerShell, use the explicit repair entry or abw.exe --repair-runtime after closing owned instances. Repair verifies the actual system file's Windows signature, including catalog signatures, before updating the local hash. It does not accept arbitrary replacement executable paths.

Uninstall.exe checks that programs are unchanged and inactive, then removes only enumerated program files. No recursive data deletion is used. Profile, runs, private state/recovery archives, screenshots and unknown files remain. Fresh-only Setup will still refuse an existing retained-data directory. Failed installation leaves an inspectable partial directory, not a verified working installation.

Publisher builds use scripts/build-installer.ps1, scripts/prepare-payload.py and scripts/make-nsis.py with a project-local NSIS compiler. No global PATH/tool installation is required. Preserve official Node/SDK and third-party notices. Real Setup, non-administrator/restricted-token behavior, CLI/MCP/EOF, GUI recovery and uninstall retention require separate installation evidence; source tests or successful compilation do not establish them. Unsigned previews may show Windows reputation prompts. Auto-update, migration, offline WebView2 distribution and multiple parallel roots are outside this preview.

The default root is %LOCALAPPDATA%\AgentBrowserNative, directly beneath the existing per-user local application-data directory. Uninstall retains binding/ownership records and a private progress marker, so an interrupted removal can retry with its embedded same-version checker; only listed missing files are accepted on retry, and remaining files must still pass checks.

Alpha limitation: when another higher-privilege WebView process identity/command line is unreadable, non-administrator recovery or a reused claim may safely refuse with RECOVERY_PROFILE_BROWSER_UNKNOWN. This is not a claim that recovery works in every environment. Do not elevate, force-kill, delete state or switch claims to bypass the safety refusal.
