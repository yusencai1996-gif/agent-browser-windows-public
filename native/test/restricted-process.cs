// Test harness only: same-user deprivileging, never credential acquisition.
using System;using System.Runtime.InteropServices;using System.Text;
public static class RestrictedProcess {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]struct SI {public int cb;public IntPtr reserved;public string desktop,title;public int x,y,xSize,ySize,xChars,yChars,fill,flags;public short show,reserved2;public IntPtr bytes,input,output,error;}
 [StructLayout(LayoutKind.Sequential)]struct PI {public IntPtr process,thread;public uint pid,tid;}
 [StructLayout(LayoutKind.Sequential)]struct SA {public int length;public IntPtr descriptor;public int inherit;}
 [StructLayout(LayoutKind.Sequential)]struct LABEL {public IntPtr sid;public uint attributes;}
 [DllImport("kernel32.dll")]static extern IntPtr GetCurrentProcess();
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool CloseHandle(IntPtr h);
 [DllImport("advapi32.dll",SetLastError=true)]static extern bool OpenProcessToken(IntPtr p,uint access,out IntPtr token);
 [DllImport("advapi32.dll",SetLastError=true)]static extern bool CreateRestrictedToken(IntPtr token,uint flags,uint disable,IntPtr sids,uint delete,IntPtr privileges,uint restrict,IntPtr restricted,out IntPtr result);
 [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool ConvertStringSidToSid(string text,out IntPtr sid);
 [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool ConvertStringSecurityDescriptorToSecurityDescriptor(string text,uint version,out IntPtr descriptor,out uint size);
 [DllImport("advapi32.dll",SetLastError=true)]static extern bool GetSecurityDescriptorDacl(IntPtr descriptor,out bool present,out IntPtr dacl,out bool defaulted);
 [DllImport("advapi32.dll")]static extern uint GetLengthSid(IntPtr sid);
 [DllImport("advapi32.dll",SetLastError=true)]static extern bool SetTokenInformation(IntPtr token,int info,IntPtr value,uint size);
 [DllImport("advapi32.dll",SetLastError=true)]static extern bool GetTokenInformation(IntPtr token,int info,IntPtr value,uint size,out uint need);
 [DllImport("advapi32.dll",SetLastError=true)]static extern bool CheckTokenMembership(IntPtr token,IntPtr sid,out bool member);
 [DllImport("advapi32.dll",SetLastError=true)]static extern bool DuplicateToken(IntPtr token,int level,out IntPtr duplicate);
 [DllImport("advapi32.dll",SetLastError=true)]static extern bool IsTokenRestricted(IntPtr token);
 [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcessAsUser(IntPtr token,string exe,StringBuilder command,IntPtr processSec,IntPtr threadSec,bool inherit,uint flags,IntPtr env,string cwd,ref SI startup,out PI process);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CreateFile(string p,uint access,uint share,ref SA security,uint create,uint flags,IntPtr template);
 [DllImport("kernel32.dll")]static extern uint WaitForSingleObject(IntPtr p,uint ms);
 [DllImport("kernel32.dll")]static extern bool GetExitCodeProcess(IntPtr p,out uint code);
 [DllImport("kernel32.dll")]static extern IntPtr LocalFree(IntPtr p);
 [DllImport("user32.dll")]static extern IntPtr GetProcessWindowStation();
 [DllImport("user32.dll",SetLastError=true)]static extern bool SetProcessWindowStation(IntPtr station);
 [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CreateWindowStation(string name,uint flags,uint access,ref SA security);
 [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CreateDesktop(string name,IntPtr device,IntPtr mode,uint flags,uint access,ref SA security);
 [DllImport("user32.dll")]static extern bool CloseDesktop(IntPtr desktop);
 [DllImport("user32.dll")]static extern bool CloseWindowStation(IntPtr station);
 public sealed class Result {public uint pid,exit;public bool restrictedTokenCreated=true,restrictingSids,administratorMember,elevated;public bool timeout;}
 static void Check(bool ok,string code){if(!ok)throw new Exception(code+"_"+Marshal.GetLastWin32Error());}
 public static Result Run(string exe,string arguments,string cwd,string output,uint waitMs){IntPtr original=IntPtr.Zero,token=IntPtr.Zero,medium=IntPtr.Zero,admin=IntPtr.Zero,label=IntPtr.Zero,elevation=IntPtr.Zero,stdout=new IntPtr(-1),stdin=new IntPtr(-1),oldStation=IntPtr.Zero,station=IntPtr.Zero,desktop=IntPtr.Zero;PI pi=new PI();try{
  Check(OpenProcessToken(GetCurrentProcess(),0xF01FF,out original),"TOKEN_OPEN");Check(CreateRestrictedToken(original,0x5,0,IntPtr.Zero,0,IntPtr.Zero,0,IntPtr.Zero,out token),"TOKEN_RESTRICT");Check(ConvertStringSidToSid("S-1-16-8192",out medium),"MEDIUM_SID");LABEL l=new LABEL();l.sid=medium;l.attributes=0x20;label=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(LABEL)));Marshal.StructureToPtr(l,label,false);Check(SetTokenInformation(token,25,label,(uint)Marshal.SizeOf(typeof(LABEL))+GetLengthSid(medium)),"MEDIUM_TOKEN");
  // Built-in Administrator tokens may have an Administrators-only default
  // object DACL. The cloned non-admin child must retain access to its own
  // newly created process/thread objects; this changes only the cloned token.
  IntPtr descriptor;uint descriptorSize;string self=System.Security.Principal.WindowsIdentity.GetCurrent().User.Value;Check(ConvertStringSecurityDescriptorToSecurityDescriptor("D:(A;;GA;;;"+self+")(A;;GA;;;SY)",1,out descriptor,out descriptorSize),"TOKEN_DACL");try{bool present,defaulted;IntPtr acl;Check(GetSecurityDescriptorDacl(descriptor,out present,out acl,out defaulted)&&present,"TOKEN_DACL");IntPtr td=Marshal.AllocHGlobal(IntPtr.Size);try{Marshal.WriteIntPtr(td,acl);Check(SetTokenInformation(token,6,td,(uint)IntPtr.Size),"TOKEN_DEFAULT_DACL");}finally{Marshal.FreeHGlobal(td);}}finally{LocalFree(descriptor);}
  Result result=new Result();result.restrictingSids=IsTokenRestricted(token);Check(ConvertStringSidToSid("S-1-5-32-544",out admin),"ADMIN_SID");bool member;IntPtr impersonation;Check(DuplicateToken(token,2,out impersonation),"TOKEN_DUPLICATE");try{Check(CheckTokenMembership(impersonation,admin,out member),"ADMIN_MEMBERSHIP");}finally{CloseHandle(impersonation);}result.administratorMember=member;elevation=Marshal.AllocHGlobal(4);uint need;Check(GetTokenInformation(token,20,elevation,4,out need),"TOKEN_ELEVATION");result.elevated=Marshal.ReadInt32(elevation)!=0;if(member||result.elevated)throw new Exception("TOKEN_NOT_NONADMIN");
  // Use only new test-owned GUI objects. Never change winsta0/default's ACL.
  string stationName="abw-test-"+Guid.NewGuid().ToString("N");IntPtr uiSd;uint uiSize;Check(ConvertStringSecurityDescriptorToSecurityDescriptor("D:P(A;;GA;;;"+self+")(A;;GA;;;SY)S:(ML;;NW;;;ME)",1,out uiSd,out uiSize),"TEST_DESKTOP_SECURITY");try{SA ui=new SA();ui.length=Marshal.SizeOf(typeof(SA));ui.descriptor=uiSd;oldStation=GetProcessWindowStation();station=CreateWindowStation(stationName,0,0xF037F,ref ui);Check(station!=IntPtr.Zero,"TEST_WINDOW_STATION");Check(SetProcessWindowStation(station),"TEST_STATION_SELECT");desktop=CreateDesktop("default",IntPtr.Zero,IntPtr.Zero,0,0x10000000,ref ui);Check(desktop!=IntPtr.Zero,"TEST_DESKTOP");}finally{LocalFree(uiSd);}
  SA sa=new SA();sa.length=Marshal.SizeOf(typeof(SA));sa.inherit=1;stdout=CreateFile(output,0x40000000,1,ref sa,1,0x80,IntPtr.Zero);stdin=CreateFile("NUL",0x80000000,3,ref sa,3,0,IntPtr.Zero);Check(stdout!=new IntPtr(-1)&&stdin!=new IntPtr(-1),"OUTPUT_HANDLE");SI si=new SI();si.cb=Marshal.SizeOf(typeof(SI));si.desktop=stationName+"\\default";si.flags=0x100;si.input=stdin;si.output=stdout;si.error=stdout;Check(CreateProcessAsUser(token,exe,new StringBuilder("\""+exe+"\" "+arguments),IntPtr.Zero,IntPtr.Zero,true,0x08000000,IntPtr.Zero,cwd,ref si,out pi),"RESTRICTED_CREATE");result.pid=pi.pid;uint waited=WaitForSingleObject(pi.process,waitMs);if(waited!=0){result.timeout=true;result.exit=259;return result;}uint exit;Check(GetExitCodeProcess(pi.process,out exit),"CHILD_EXIT");result.exit=exit;return result;
 }finally{if(oldStation!=IntPtr.Zero)SetProcessWindowStation(oldStation);if(desktop!=IntPtr.Zero)CloseDesktop(desktop);if(station!=IntPtr.Zero)CloseWindowStation(station);if(pi.thread!=IntPtr.Zero)CloseHandle(pi.thread);if(pi.process!=IntPtr.Zero)CloseHandle(pi.process);if(stdout!=new IntPtr(-1))CloseHandle(stdout);if(stdin!=new IntPtr(-1))CloseHandle(stdin);if(elevation!=IntPtr.Zero)Marshal.FreeHGlobal(elevation);if(label!=IntPtr.Zero)Marshal.FreeHGlobal(label);if(admin!=IntPtr.Zero)LocalFree(admin);if(medium!=IntPtr.Zero)LocalFree(medium);if(token!=IntPtr.Zero)CloseHandle(token);if(original!=IntPtr.Zero)CloseHandle(original);}}
}
