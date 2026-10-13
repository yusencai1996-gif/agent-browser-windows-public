from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent.parent;payload=root/'payload';target=root/'installer';files=sorted(p.relative_to(payload)for p in payload.rglob('*')if p.is_file())
assert all(not p.is_absolute() and '..' not in p.parts for p in files)
directories=sorted({q for p in files for q in p.parents if q!=Path('.')},key=lambda p:(len(p.parts),str(p)))
lines=[]
for rel in files:
 parent=str(rel.parent).replace('/','\\');dest='$INSTDIR'+('\\'+parent if parent!='.' else '')
 lines+=['SetOutPath "'+dest+'"','File "..\\payload\\'+str(rel).replace('/','\\')+'"']
(target/'payload-files.nsh').write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
(target/'payload-hold-directories.nsh').write_text('\n'.join('StrCpy $LeasePath "$INSTDIR\\'+str(p).replace('/','\\')+'"\nCall un.HoldDirectory'for p in directories)+'\n',encoding='utf-8',newline='\n')
(target/'payload-delete-files.nsh').write_text('\n'.join('${If} ${FileExists} "$INSTDIR\\'+str(p).replace('/','\\')+'"\nClearErrors\nDelete "$INSTDIR\\'+str(p).replace('/','\\')+'"\n${If} ${Errors}\n MessageBox MB_ICONSTOP "A program file is locked or could not be removed. Uninstall stopped; user data remains." /SD IDOK\n SetErrorLevel 5\n Abort\n${EndIf}\n${EndIf}'for p in files)+'\n',encoding='utf-8',newline='\n')
(target/'payload-remove-empty-directories.nsh').write_text('\n'.join('RMDir "$INSTDIR\\'+str(p).replace('/','\\')+'"'for p in reversed(directories))+'\n',encoding='utf-8',newline='\n')
(root/'out').mkdir(exist_ok=True)
(root/'out/PACKAGE-MANIFEST.json').write_text(json.dumps({'version':'0.10.0-alpha.2','files':[{'path':p.as_posix(),'bytes':(payload/p).stat().st_size,'sha256':hashlib.sha256((payload/p).read_bytes()).hexdigest()}for p in files]},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'installerFiles':len(files),'programDirectories':len(directories),'dataDirectoriesInRemovalList':False}))
