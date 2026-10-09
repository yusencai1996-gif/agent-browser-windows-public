# Agent Browser Windows — Native SOURCE preview

`v0.10.0-alpha.1` is a Windows x64 **source preview**, requiring a trusted local build. It is not a portable executable download. The generated installation is bound to one exact directory, Node executable and the local system PowerShell hash. Do not move it or redistribute generated binaries, bindings, state or Profile. Windows servicing or changing runtime paths requires a fresh empty-root build.

The native WebView2 browser provides a task overview, two Agent owners with four pages each, and 11 CLI/MCP tools. Normal public HTTPS resources, APIs, frames and WSS are supported. Connection checks block representative local/private destinations and fail closed on proxy errors; this is not an operating-system sandbox. Login and account authorization belong to the user. No existing browser Profile is imported.

## Local build

Requirements: Windows x64, Microsoft WebView2 Evergreen Runtime, Visual Studio 2022 C++ Build Tools, WebView2 SDK `1.0.4258.31`, and official Node `26.2.0` Windows x64. Obtain dependencies from their official sources:

- [Node executable and checksums](https://nodejs.org/dist/v26.2.0/)
- [WebView2 SDK package](https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4258.31)
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)

Extract the SDK NuGet package to a dedicated directory. Run the trusted source build script with actual local paths, using a **new nonexistent installation root** whose parent already exists:

```powershell
.\build.ps1 -InstallRoot 'D:\Agent Browser Native' `
  -NodePath 'D:\Tools\Node\node.exe' `
  -SdkPath 'D:\Tools\WebView2SDK' `
  -DevCmdPath 'D:\Tools\VS2022\Common7\Tools\VsDevCmd.bat'
```

Paths are examples, not defaults. The script refuses an existing root and reparse-point ancestors, checks the official Node and SDK loader SHA, clears Node preload environment variables, compiles GUI/gate with `/MT`, and generates one shared exact binding for C++, Node and PowerShell. New Profile and run directories are beneath that root. System PowerShell 5.1 is bound to its measured local path/hash; it is the sole runtime file allowed to have servicing hardlinks. Build failures retain their new root and logs for inspection; nothing stops or replaces an existing installation.

The preview permits one native instance per user. Fixed local fixture ports and shared instance guards may conflict with another build or an older installation; conflicts fail closed. Do not stop an unrelated service to make a test pass. No claim of cross-machine portability or all Windows versions is made.

## Agent use

From the successfully built installation root:

```powershell
.\abw.cmd help
.\abw.cmd start
.\abw.cmd task MY_TASK --agent-name MY_AGENT --display-name PURPOSE
.\abw.cmd tools
.\abw.cmd schema tabs
'{"action":"new","url":"https://docs.python.org/"}' | .\abw.cmd call tabs --task MY_TASK --input -
.\abw.cmd mcp --task MY_TASK
.\abw.cmd end MY_TASK
```

For PowerShell stdin, set both `[Console]::OutputEncoding` and `$OutputEncoding` to UTF-8. Tool payloads use stdin only, followed by EOF. Use the generated `abw.cmd` launcher for CLI and MCP so preload variables are cleared before Node starts. An Agent owns and ends its own task. A shared host must only be stopped with its verified creation/instance identity and when no other task or human control remains; do not issue unbound stop against an unknown host.

Source-only tests: run `node --test test/*.test.mjs` with the verified Node 26.2.0 executable. Synthetic tests cover input framing, scope, connection filtering and startup rollback. They do not prove runtime rendering, login, every website or cross-machine compatibility.

## Distribution boundaries

This source tree contains only whitelisted product code, synthetic tests and required library/license files. `SOURCE-MANIFEST.json` records file hashes. The source ZIP excludes executables, Node runtime, generated local bindings, Profile, cookies, capabilities, service state, private Git/history and private verification evidence. The root repository retains the earlier Chromium source and releases as legacy history; this native source preview is a separate implementation.
