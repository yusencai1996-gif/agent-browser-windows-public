# Windows 安装版预览

下载本次发布的 Setup.exe 并核对旁边的 SHA256。以自己的普通用户运行，选择一个尚不存在的新目录。首版不覆盖旧版本、不迁移旧资料；不需要另装 Node、Visual Studio 或 SDK。具体测试过的 Windows 版本以发布说明为准。

需要系统 PowerShell 5.1 和 WebView2 Evergreen。若安装器提示 WebView2 缺失，打开微软官方页面 https://developer.microsoft.com/microsoft-edge/webview2/ 安装运行时，再重新运行 Setup。程序不会替你登录账号或配置其它 Agent。未购买签名证书的预览包可能显示 Windows 信誉提示，不承诺免提示。

开始菜单“Agent Browser”打开空任务总览。Agent 使用安装目录里的 `abw.exe`（或 `abw.cmd`）；`help` 看用法，`tools` 看11工具，`schema 工具名` 看参数。正常 `start --claim-id 新UUID` 后注册 `task 我的ID`；CLI工具只收 UTF-8 stdin 并以 EOF 结束。MCP命令为 `abw.exe mcp --task 我的ID`。只结束本人的 task；不要停止别人的实例，也不要重放结果未知的操作。

正常退出后旧 claim 可再次使用；旧状态只在死亡、无占用和归属证明齐全时私有归档，Profile原位保留。未知/权限/占用仍报错，不能手删状态或强杀绕过。

Windows更新使系统PowerShell哈希变化时，先正常结束本人实例，然后使用开始菜单修复入口或 `abw.exe --repair-runtime`。修复会重新核对系统签名与路径，不接受随意换来的PowerShell程序。

卸载前正常结束本人任务与实例，运行 Uninstall.exe。卸载只删除校验通过的自有程序文件；Profile、截图、状态/故障档和未知文件保留。若文件被占用或已改变，卸载会拒绝或停止。首版没有原地升级和保留数据的自动迁入，新装仍需另选新目录。不要为重装而随意删除登录资料。

默认目录直接位于已有的 %LOCALAPPDATA%\AgentBrowserNative，不要求先有 Programs 父目录。卸载保留绑定/归属记录与私有进度标记，后段文件被占用时可释放占用后重试；未被清单记录或内容已改变的文件仍不能强删。

Alpha限制：其它高权限WebView进程身份/命令行不可读时，非管理员恢复或旧claim重启可能安全拒绝（RECOVERY_PROFILE_BROWSER_UNKNOWN）。这不代表所有环境都能恢复；不要通过提权、强杀、删状态或换claim绕过保护。
