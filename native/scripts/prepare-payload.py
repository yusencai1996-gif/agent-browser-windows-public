"""Build-only static whitelist staging. No installed browser state is inspected."""
from pathlib import Path
import hashlib,json,shutil,sys
root=Path(__file__).resolve().parent.parent
payload=root/'payload';payload.mkdir(exist_ok=True)
names=['LICENSE','README.md','INSTALL.zh-CN.md','package.json']
runtime=['alias.mjs','canary.mjs','cleanup.mjs','cli.mjs','connection-filter.mjs','dead-recovery.mjs','deployment.mjs','dom.mjs','exit-contract.mjs','fixture.mjs','input.mjs','mcp.mjs','native.mjs','observe-browser-exit.ps1','observer-policy.psm1','output.mjs','prepare-state.ps1','public-client.mjs','recover-dead-state.ps1','render-probe.mjs','scope.mjs','server.mjs','session.mjs','start-owner.ps1','startup-resources.mjs','tools.mjs','wire.mjs']
names += ['scripts/'+name for name in runtime]
names += [p.relative_to(root).as_posix() for folder in ['licenses','node_modules'] for p in (root/folder).rglob('*') if p.is_file()]
for name in names:
 src=root/name;assert not src.is_symlink();dst=payload/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst)
for name in ['abw19e-host.exe','pipe-gate.exe']:
 dst=payload/'dist'/name;dst.parent.mkdir(exist_ok=True);shutil.copyfile(root/'build'/name,dst)
node=root/'vendor/node.exe';digest=hashlib.sha256(node.read_bytes()).hexdigest();assert digest=='96f768b95e8e9d443f5eead1cb2d199744923320bb8240d2c3129362e7ae2a5d'
(payload/'runtime').mkdir(exist_ok=True);shutil.copyfile(node,payload/'runtime/node.exe')
(payload/'abw.cmd').write_bytes(b'@echo off\r\n"%~dp0abw.exe" %*\r\nexit /b %errorlevel%\r\n')
(payload/'overview.cmd').write_bytes(b'@echo off\r\n"%~dp0abw.exe" --overview\r\nexit /b %errorlevel%\r\n')
files=[]
for p in sorted(payload.rglob('*')):
 if p.is_file() and p.name not in ['abw.exe','PAYLOAD-MANIFEST.json']:
  allowed=set(names)|{'dist/abw19e-host.exe','dist/pipe-gate.exe','runtime/node.exe','abw.cmd','overview.cmd'}
  if p.relative_to(payload).as_posix() not in allowed:raise RuntimeError('STALE_PAYLOAD_FILE: '+p.relative_to(payload).as_posix())
  b=p.read_bytes();files.append({'path':p.relative_to(payload).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
manifest={'version':'0.10.0-alpha.2','files':files};(payload/'PAYLOAD-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
b=(payload/'PAYLOAD-MANIFEST.json').read_bytes();files.append({'path':'PAYLOAD-MANIFEST.json','bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
header='#pragma once\nnamespace payload { struct Pin {const wchar_t* path; const char* sha256;};\ninline constexpr char nodeSHA[]="'+digest+'";\ninline constexpr Pin files[]={\n'
for item in files:header+=' {L"'+item['path']+'","'+item['sha256']+'"},\n'
header+='};}\n';(root/'build/payload-pins.h').write_text(header,encoding='utf-8',newline='\n')
print(json.dumps({'payloadFiles':len(files),'nodeSHA256':digest}))
