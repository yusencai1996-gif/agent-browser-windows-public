# Agent Browser Native 0.10.0-alpha.2

首个 Windows x64 EXE 安装版预览。安装包自带 Node 和已编译的原生程序，使用者不需要安装 Visual Studio、SDK 或 Node。

下载 Setup.exe，按随附 `.sha256` 核对文件，以普通用户安装到一个尚不存在的新目录。需要 Windows PowerShell 5.1 和 [WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)。安装后让 Agent 使用安装目录中的 `abw.exe`；`help`、`tools`、`schema TOOL` 提供准确用法，MCP 为 `abw.exe mcp --task MY_TASK`。详细步骤见随附中文安装说明。

支持任务总览、两个任务各四页、11 个 CLI/MCP 工具及正常公网 HTTPS 页面和配套资源。卸载按清单移除程序，保留专用 Profile、截图、状态归档和未知文件。首版仅全新安装，不做原地升级、资料迁移、自动更新或多安装根并行运行。

## 验证范围

选定安装包为 25,432,094 字节，SHA256：

```text
817a5f374cacc3a72c34fd9c2aca8023c0a4fd3e187c70271786f513af18bf1b
```

- Windows Server 2025 独立 CI：该候选的非管理员安装、包内 Node 运行、覆盖拒绝、后段文件占用拒卸且程序保留、释放占用后的同步卸载及合成 Profile 保留通过。
- Windows 11 x64：同一 EXE 非管理员安装、实际公网网页/正常 PNG、CLI/MCP 11工具、版本一致、EOF、本人任务结束及四层正常退出通过。系统盘变量修补后没有再生成字面 `%SystemDrive%` 目录。
- 非管理员旧 claim 恢复在其它高权限 WebView 信息不可读时安全拒绝，按下述限制披露。此前同一恢复/卸载算法的 Windows 11 管理员重启、非管理员同步卸载已验证；最终候选的本机对应复验因另一个 Agent 的共享实例占用未完成，未中断他人实例。最终候选的完整卸载证据来自上述独立 CI。
- 安装/解包183个静态载荷与清单逐项匹配，188个解包文件完成 UTF-8/UTF-16 私人路径及密钥标记检查；Node、WebView2 和生产依赖许可证保留。

## 已知限制

- 未购买代码签名证书，Windows 可能显示信誉提示。
- Windows 10 尚未实测，不保证所有 Windows 版本、网站或第三方 Agent 客户端均兼容。
- 非管理员模式遇到其它高权限 WebView 身份/命令行不可读时，恢复或旧 claim 重启可能以 `RECOVERY_PROFILE_BROWSER_UNKNOWN` 安全拒绝。首次启动、普通网页操作通过不等于所有环境下自动恢复都通过。不要提权、强杀、删除状态或换 claim 绕过这条保护。
- 网站账号共用本安装的专用 Profile；任务隔离页面归属，不隔离网站账号。未验证真实登录迁移，不读取或搬运现有浏览器密码/Cookie。
- 公网连接过滤不是 OS 全协议沙盒；旧 Chromium 版的14工具、OpenCLI与文件输入协议不适用于本版。

旧标签和下载资产保持不变。
