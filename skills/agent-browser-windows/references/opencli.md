# OpenCLI在Agent浏览器中的固定接入

本实现仅接受固定官方Browser Bridge 1.0.23（OpenCLI v1.8.7发布物，Apache-2.0），本机CLI实测1.8.7；不支持任意扩展安装，不运行全局安装器，不改其他Agent技能、Edge或全局profile默认。扩展含debugger、cookies、tabs、storage及全站权限，和ABW桥是两个独立通道。

部署入口以本安装的abw.cmd为准，版本见package.json。首次配置由维护者在宿主停止时执行`abw opencli-config --extension <固定扩展绝对目录>`，只写本安装的路径配置；之后普通start自动重载。临时探针可用`start --temporary --opencli-extension <目录>`，不改变保存的配置。目录文件不匹配官方固定hash会拒绝启动，不能绕过检查改manifest或追加插件。每次启动从status重新取contextId，临时profile会换ID；绝不照抄日常Edge的ID。

```powershell
$abw=(Resolve-Path .\abw.cmd).Path
$status=& $abw status | ConvertFrom-Json
if(-not $status.ok) { throw '先按主技能启动宿主' }
$instance=$status.data.instances | Where-Object { $_.id -eq 'main' -and $_.online }
$ctx=$instance.opencli.contextId
if(-not $ctx) { throw '此实例未确认OpenCLI扩展上下文，不能回落到Edge' }
$session='abw-opencli-'+[Guid]::NewGuid().ToString('N').Substring(0,10)
# 本机1.8.7的doctor从环境变量选profile，且失败也可能exit 0；看MISSING/FAIL文本。
$previous=$env:OPENCLI_PROFILE
try { $env:OPENCLI_PROFILE=$ctx; opencli doctor }
finally { $env:OPENCLI_PROFILE=$previous }
# 普通浏览器和平台命令仍逐条显式--profile，不调用profile use/rename。
try {
    opencli --profile $ctx browser $session open https://example.com --window background
    if($LASTEXITCODE -ne 0) { throw '打开失败，停止，不能切到其他profile' }
    opencli --profile $ctx browser $session state
} finally {
    opencli --profile $ctx browser $session close
}
```

doctor连通不代表平台登录或取得业务数据，exit 0也不是本版本doctor健康保证。必须有定向命令的数据/目标页对应证据。目标不存在会硬失败，不能省略--profile重试、改默认或关闭Edge来凑通过。

平台调用先`opencli <平台> --help`核对当前适配器，只做已授权只读命令；例如51job search限制少量结果，使用`--window background --site-session ephemeral --keep-tab false --trace off -f json`。每平台最多30条，命令间隔3–10秒；验证码/认证失败/风险提示立即停止，由用户手动处理，不循环探测。禁止登录、消息、投递、收藏或发布等操作，除非另有明确业务授权。不要输出/导出Cookie、账号资料、扩展内部状态或签名URL。

只用自己创建的OpenCLI窗口/标签，不使用bind或--tab指定ABW/用户页面。不要让两通道同时操作一页；跨扩展debugger可以共同附着，不能当锁。若碰到调试器冲突，停止当前操作并等持有者结束，不detach对方。完成关闭自己的session后才考虑结束自己启动的浏览器；ABW status不能证明OpenCLI已空闲。此限制是使用约定，不是统一锁或对外部直接命令的强制封锁。
