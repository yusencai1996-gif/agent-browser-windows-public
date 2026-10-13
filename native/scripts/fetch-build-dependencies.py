"""Official build inputs, confined to this native source tree. No system install."""
from pathlib import Path
import urllib.request,urllib.parse,hashlib,json,zipfile,html,re,shutil,time,threading,queue
root=Path(__file__).resolve().parent.parent
downloads=root/'tools/downloads';downloads.mkdir(parents=True,exist_ok=True)
CONNECT_READ_TIMEOUT=30
REQUEST_DEADLINE=180
def get(url,dest,stage,max_bytes):
 # Fixed labels only: URL/header/exception text can contain redirect tickets.
 assert stage in {'NODE','WEBVIEW2_SDK','NSIS','NSIS_REDIRECT'}
 print('DOWNLOAD_START '+stage,flush=True)
 started=time.monotonic();result=queue.Queue(maxsize=1)
 def read_request():
  try:
   parts=[];count=0
   with urllib.request.urlopen(url,timeout=CONNECT_READ_TIMEOUT)as response:
    while True:
     if time.monotonic()-started>=REQUEST_DEADLINE:raise TimeoutError()
     chunk=response.read1(65536)
     if time.monotonic()-started>=REQUEST_DEADLINE:raise TimeoutError()
     if not chunk:break
     count+=len(chunk)
     if count>max_bytes:result.put(('error','BYTE_LIMIT'));return
     parts.append(chunk)
   result.put(('ok',b''.join(parts)))
  except Exception as error:
   kind=('TIMEOUT' if isinstance(error,TimeoutError) else
         'HTTP_ERROR' if isinstance(error,urllib.error.HTTPError) else
         'NETWORK_ERROR' if isinstance(error,urllib.error.URLError) else
         'IO_ERROR' if isinstance(error,OSError) else 'READ_ERROR')
   result.put(('error',kind))
 # A daemon reader makes the wall limit also cover DNS/open/redirect waits;
 # only the parent writes the destination, after a complete bounded response.
 worker=threading.Thread(target=read_request,daemon=True);worker.start()
 try:kind,value=result.get(timeout=max(0.001,REQUEST_DEADLINE-(time.monotonic()-started)))
 except queue.Empty:kind,value='error','TOTAL_DEADLINE'
 if kind!='ok':
  print('DOWNLOAD_FAIL '+stage+' '+value,flush=True)
  raise RuntimeError('DOWNLOAD_'+stage+'_'+value) from None
 dest.write_bytes(value)
 print('DOWNLOAD_DONE '+stage+' bytes='+str(len(value)),flush=True)
 return value
def extract(dataPath,dest):
 with zipfile.ZipFile(dataPath)as z:
  assert z.testzip() is None
  for item in z.infolist():
   p=Path(item.filename);assert not p.is_absolute() and '..' not in p.parts and (item.external_attr>>16)&0o170000!=0o120000
  z.extractall(dest)
nodeHash='96f768b95e8e9d443f5eead1cb2d199744923320bb8240d2c3129362e7ae2a5d'
(root/'vendor').mkdir(exist_ok=True)
node=root/'vendor/node.exe'
if not node.exists():
 existing=shutil.which('node.exe')
 if existing and Path(existing).is_file() and Path(existing).stat().st_size<=110*1024*1024 and hashlib.sha256(Path(existing).read_bytes()).hexdigest()==nodeHash:
  shutil.copyfile(existing,node);print('BUILD_INPUT_REUSED NODE HASH_MATCH',flush=True)
 else:get('https://nodejs.org/dist/v26.2.0/win-x64/node.exe',node,'NODE',110*1024*1024)
assert hashlib.sha256(node.read_bytes()).hexdigest()==nodeHash
print('DEPENDENCY_VERIFIED NODE',flush=True)
sdk=root/'tools/webview2-1.0.4258.31'
if not sdk.exists():
 archive=downloads/'webview2-1.0.4258.31.nupkg';get('https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.4258.31/microsoft.web.webview2.1.0.4258.31.nupkg',archive,'WEBVIEW2_SDK',32*1024*1024);extract(archive,sdk)
assert hashlib.sha256((sdk/'build/native/x64/WebView2LoaderStatic.lib').read_bytes()).hexdigest()=='e66284970876a616c82e7dcda75a17fd46d04827f9de81d4299b8862d34d25d6'
print('DEPENDENCY_VERIFIED WEBVIEW2_SDK',flush=True)
nsis=root/'tools/nsis-3.13';nsisHash='ba63dffc4410ee89193e1cb5a41989991bd77c61068da17e3156d136b7b0b3d8'
if not nsis.exists():
 archive=downloads/'nsis-3.13.zip';url='https://sourceforge.net/projects/nsis/files/NSIS%203/3.13/nsis-3.13.zip/download';data=get(url,archive,'NSIS',16*1024*1024)
 if not data.startswith(b'PK'):
  match=re.search(r'content="5; url=([^"]+)"',data.decode('utf-8'));assert match
  target=html.unescape(match[1]);parsed=urllib.parse.urlparse(target);assert parsed.scheme=='https' and parsed.hostname=='downloads.sourceforge.net' and parsed.path.startswith('/project/nsis/')
  data=get(target,archive,'NSIS_REDIRECT',16*1024*1024)
 assert hashlib.sha256(data).hexdigest()==nsisHash;extract(archive,root/'tools')
print('DEPENDENCY_READY NSIS',flush=True)
print(json.dumps({'node':'official version pin matched','sdkLoader':'version pin matched','nsis':'previously measured official-download pin','sdkPath':str(sdk),'nsisPath':str(nsis/'makensis.exe')}))
