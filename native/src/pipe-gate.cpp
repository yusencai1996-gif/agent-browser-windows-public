// Current-user-only named pipe. Relay framing is length-prefixed UTF-8 JSON.
#define NOMINMAX
#include <windows.h>
#include <sddl.h>
#include <aclapi.h>
#include <string>
#include <vector>
#include <thread>
#include <algorithm>
#include "bounded-output.h"
#include "ownership.h"
#include "isolated-server-launch.h"
constexpr DWORD INPUT_MAX=65536,OUTPUT_MAX=12000000;
std::wstring sid(){HANDLE token=nullptr;if(!OpenProcessToken(GetCurrentProcess(),TOKEN_QUERY,&token))return {};DWORD n=0;GetTokenInformation(token,TokenUser,nullptr,0,&n);std::vector<BYTE>b(n);if(!GetTokenInformation(token,TokenUser,b.data(),n,&n)){CloseHandle(token);return {};}LPWSTR s=nullptr;ConvertSidToStringSidW(reinterpret_cast<TOKEN_USER*>(b.data())->User.Sid,&s);std::wstring out=s?s:L"";if(s)LocalFree(s);CloseHandle(token);return out;}
DWORD remaining(ULONGLONG deadline){const auto now=GetTickCount64();return now<deadline?static_cast<DWORD>(deadline-now):0;}
bool io(HANDLE h,void*data,DWORD n,bool write,ULONGLONG deadline,bool overlapped){
 DWORD offset=0;while(offset<n){DWORD done=0;bool ok=false;
  if(overlapped){OVERLAPPED o{};o.hEvent=CreateEventW(nullptr,TRUE,FALSE,nullptr);if(!o.hEvent)return false;ok=(write?WriteFile(h,static_cast<char*>(data)+offset,n-offset,&done,&o):ReadFile(h,static_cast<char*>(data)+offset,n-offset,&done,&o))!=FALSE;
   if(!ok&&GetLastError()==ERROR_IO_PENDING){if(WaitForSingleObject(o.hEvent,remaining(deadline))==WAIT_OBJECT_0)ok=GetOverlappedResult(h,&o,&done,FALSE)!=FALSE;else{CancelIoEx(h,&o);GetOverlappedResult(h,&o,&done,TRUE);}}CloseHandle(o.hEvent);
  }else{std::thread worker([&]{ok=(write?WriteFile(h,static_cast<char*>(data)+offset,n-offset,&done,nullptr):ReadFile(h,static_cast<char*>(data)+offset,n-offset,&done,nullptr))!=FALSE;});const auto wait=WaitForSingleObject(worker.native_handle(),remaining(deadline));if(wait!=WAIT_OBJECT_0){CancelSynchronousIo(worker.native_handle());worker.join();return false;}worker.join();}
  if(!ok||!done||!remaining(deadline))return false;offset+=done;
 }return true;
}
bool receive(HANDLE h,std::vector<char>&b,DWORD max,ULONGLONG d,bool ov){DWORD n=0;if(!io(h,&n,4,false,d,ov)||!n||n>max)return false;b.resize(n);return io(h,b.data(),n,false,d,ov);}
bool send(HANDLE h,std::vector<char>&b,ULONGLONG d,bool ov){DWORD n=static_cast<DWORD>(b.size());return n&&io(h,&n,4,true,d,ov)&&io(h,b.data(),n,true,d,ov);}
int wmain(int argc,wchar_t**argv){
 const auto user=sid();if(user.empty())return 3;const auto name=L"\\\\.\\pipe\\AgentBrowserNative."+user;
 if(argc==4&&std::wstring(argv[1])==L"launch"){
  // Short-lived bridge only. The detached long-running server must not receive
  // ANY ambient inheritable handles from Node/PowerShell/cmd (including extra
  // copies of the outer stdout writer not named in the standard-handle slots).
  wchar_t self[32768]{};const DWORD n=GetModuleFileNameW(nullptr,self,32768);if(!n||n>=32768)return 25;
  std::wstring command=L"\""+std::wstring(self)+L"\" server \""+argv[2]+L"\" \""+argv[3]+L"\"";
  PROCESS_INFORMATION created{};
  if(!createIsolatedServer(self,command,created))return 26;
  FILETIME born{},ended{},kernel{},userTime{};if(!GetProcessTimes(created.hProcess,&born,&ended,&kernel,&userTime)){CloseHandle(created.hThread);CloseHandle(created.hProcess);return 27;}
  const auto pid=created.dwProcessId;CloseHandle(created.hThread);CloseHandle(created.hProcess);
  char hex[17]{};sprintf_s(hex,"%08lx%08lx",born.dwHighDateTime,born.dwLowDateTime);
  const auto output=std::string("{\"gatePid\":")+std::to_string(pid)+",\"launcherPid\":"+std::to_string(GetCurrentProcessId())+",\"gateCreationHex\":\""+hex+"\",\"handlesInherited\":false,\"processKilled\":false}\n";
  return outputUntil(GetStdHandle(STD_OUTPUT_HANDLE),output.data(),static_cast<DWORD>(output.size()),GetTickCount64()+3000)?0:28;
 }
 if(argc==2&&std::wstring(argv[1])==L"audit"){
  HANDLE p=CreateFileW(name.c_str(),READ_CONTROL,0,nullptr,OPEN_EXISTING,0,nullptr);if(p==INVALID_HANDLE_VALUE)return 20;PACL acl=nullptr;PSECURITY_DESCRIPTOR sd=nullptr;const auto code=GetSecurityInfo(p,SE_KERNEL_OBJECT,DACL_SECURITY_INFORMATION,nullptr,nullptr,&acl,nullptr,&sd);CloseHandle(p);bool ok=code==ERROR_SUCCESS&&acl&&acl->AceCount==1;PVOID ace=nullptr;if(ok)ok=GetAce(acl,0,&ace)!=FALSE;LPWSTR a=nullptr;if(ok){auto rule=reinterpret_cast<ACCESS_ALLOWED_ACE*>(ace);ok=rule->Header.AceType==ACCESS_ALLOWED_ACE_TYPE&&ConvertSidToStringSidW(&rule->SidStart,&a)&&user==a;}if(a)LocalFree(a);SECURITY_DESCRIPTOR_CONTROL control{};DWORD revision=0;if(ok)ok=GetSecurityDescriptorControl(sd,&control,&revision)&&(control&SE_DACL_PROTECTED);if(sd)LocalFree(sd);DWORD n=0;const char*output=ok?"{\"pipeCurrentUserOnly\":true,\"protectedDacl\":true}\n":"{\"pipeCurrentUserOnly\":false}\n";WriteFile(GetStdHandle(STD_OUTPUT_HANDLE),output,static_cast<DWORD>(strlen(output)),&n,nullptr);return ok?0:21;
 }
 if(argc==2&&std::wstring(argv[1])==L"self-test"){
  HANDLE r=nullptr,w=nullptr;if(!CreatePipe(&r,&w,nullptr,4096))return 22;std::vector<char> b(262144,'x');const auto start=GetTickCount64();const bool writeRejected=!io(w,b.data(),static_cast<DWORD>(b.size()),true,start+100,false);const auto elapsed=GetTickCount64()-start;char byte=0;HANDLE r2=nullptr,w2=nullptr;CreatePipe(&r2,&w2,nullptr,4096);const auto readStart=GetTickCount64();const bool readRejected=!io(r2,&byte,1,false,readStart+100,false);const auto readElapsed=GetTickCount64()-readStart;CloseHandle(r);CloseHandle(w);CloseHandle(r2);CloseHandle(w2);const bool ok=writeRejected&&readRejected&&elapsed<1500&&readElapsed<1500;DWORD n=0;const auto output=std::string("{\"blockedWriteCancelled\":")+(writeRejected?"true":"false")+",\"blockedReadCancelled\":"+(readRejected?"true":"false")+",\"writeMs\":"+std::to_string(elapsed)+",\"readMs\":"+std::to_string(readElapsed)+"}\n";WriteFile(GetStdHandle(STD_OUTPUT_HANDLE),output.data(),static_cast<DWORD>(output.size()),&n,nullptr);return ok?0:23;
 }
 if(argc==3&&std::wstring(argv[1])==L"stdout"){
  unsigned budget=0;try{budget=std::stoul(argv[2]);}catch(...){return 2;}if(!budget||budget>3000)return 2;const auto deadline=GetTickCount64()+budget;std::vector<char> data;char b[4096];DWORD n=0;
  while(true){bool read=false;std::thread reader([&]{read=ReadFile(GetStdHandle(STD_INPUT_HANDLE),b,sizeof(b),&n,nullptr)!=FALSE;});if(WaitForSingleObject(reader.native_handle(),remaining(deadline))!=WAIT_OBJECT_0){CancelSynchronousIo(reader.native_handle());if(WaitForSingleObject(reader.native_handle(),1000)!=WAIT_OBJECT_0)ExitProcess(74);reader.join();return 4;}reader.join();if(!read||!n)break;if(data.size()+n>OUTPUT_MAX)return 4;data.insert(data.end(),b,b+n);}
  return outputUntil(GetStdHandle(STD_OUTPUT_HANDLE),data.data(),static_cast<DWORD>(data.size()),deadline)?0:7;
 }
 if((argc==2||argc==3)&&std::wstring(argv[1])==L"client"){
  unsigned budget=30000;if(argc==3){try{budget=std::stoul(argv[2]);}catch(...){return 2;}if(!budget||budget>30000)return 2;}const auto deadline=GetTickCount64()+budget,inputDeadline=std::min<ULONGLONG>(deadline,GetTickCount64()+5000);
  std::vector<char> data;char b[4096];DWORD n=0;while(true){bool read=false;std::thread reader([&]{read=ReadFile(GetStdHandle(STD_INPUT_HANDLE),b,sizeof(b),&n,nullptr)!=FALSE;});if(WaitForSingleObject(reader.native_handle(),remaining(inputDeadline))!=WAIT_OBJECT_0){CancelSynchronousIo(reader.native_handle());reader.join();return 4;}reader.join();if(!read||!n)break;if(data.size()+n>INPUT_MAX)return 4;data.insert(data.end(),b,b+n);}if(data.empty())return 4;
  HANDLE pipe=INVALID_HANDLE_VALUE;
  do{pipe=CreateFileW(name.c_str(),GENERIC_READ|GENERIC_WRITE,0,nullptr,OPEN_EXISTING,FILE_FLAG_OVERLAPPED,nullptr);if(pipe!=INVALID_HANDLE_VALUE)break;if(GetLastError()!=ERROR_PIPE_BUSY||!WaitNamedPipeW(name.c_str(),std::min<DWORD>(remaining(deadline),1000)))break;}while(remaining(deadline));
  if(pipe==INVALID_HANDLE_VALUE)return 5;const bool ok=send(pipe,data,deadline,true)&&receive(pipe,data,OUTPUT_MAX,deadline,true);char ack=1;if(ok)io(pipe,&ack,1,true,deadline,true);CloseHandle(pipe);if(!ok)return 6;
  return outputUntil(GetStdHandle(STD_OUTPUT_HANDLE),data.data(),static_cast<DWORD>(data.size()),deadline)?0:7;
 }
 if(argc!=4||std::wstring(argv[1])!=L"server")return 2;
 // Hold candidate/state ancestors without FILE_SHARE_DELETE. Exit receipts
 // cannot follow a replaced directory or target the frozen E state.
 const owned::fs::path candidateRoot=binding::root,stateRoot=candidateRoot/L".state";
 std::vector<HANDLE> receiptDirectories;
 struct HeldDirectories {std::vector<HANDLE>& handles;~HeldDirectories(){for(auto h:handles)CloseHandle(h);}} receiptHeld{receiptDirectories};
 for(auto p=stateRoot;!p.empty();p=p.parent_path()){
  const auto h=owned::openDirectory(p);if(!owned::plain(h,p)){if(h!=INVALID_HANDLE_VALUE)CloseHandle(h);return 24;}receiptDirectories.push_back(h);if(p==p.root_path())break;
 }
 PSECURITY_DESCRIPTOR sd=nullptr;const auto sddl=L"D:P(A;;GA;;;"+user+L")";if(!ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl.c_str(),SDDL_REVISION_1,&sd,nullptr))return 8;SECURITY_ATTRIBUTES secured{sizeof(SECURITY_ATTRIBUTES),sd,FALSE};
 // FIRST_PIPE_INSTANCE prevents replacing an existing current-user service.
 HANDLE pipe=CreateNamedPipeW(name.c_str(),PIPE_ACCESS_DUPLEX|FILE_FLAG_OVERLAPPED|FILE_FLAG_FIRST_PIPE_INSTANCE,PIPE_TYPE_BYTE|PIPE_READMODE_BYTE|PIPE_WAIT|PIPE_REJECT_REMOTE_CLIENTS,1,65536,65536,0,&secured);LocalFree(sd);if(pipe==INVALID_HANDLE_VALUE)return 9;
 SECURITY_ATTRIBUTES inherit{sizeof(SECURITY_ATTRIBUTES),nullptr,TRUE};HANDLE inR=nullptr,inW=nullptr,outR=nullptr,outW=nullptr;
 if(!CreatePipe(&inR,&inW,&inherit,65536)||!CreatePipe(&outR,&outW,&inherit,65536))return 10;SetHandleInformation(inW,HANDLE_FLAG_INHERIT,0);SetHandleInformation(outR,HANDLE_FLAG_INHERIT,0);SetHandleInformation(pipe,HANDLE_FLAG_INHERIT,0);
 STARTUPINFOW startup{};startup.cb=sizeof(startup);startup.dwFlags=STARTF_USESTDHANDLES;startup.hStdInput=inR;startup.hStdOutput=outW;startup.hStdError=CreateFileW(L"NUL",GENERIC_WRITE,FILE_SHARE_READ|FILE_SHARE_WRITE,&inherit,OPEN_EXISTING,0,nullptr);
 PROCESS_INFORMATION child{};std::wstring cmd=L"\""+std::wstring(argv[2])+L"\" \""+std::wstring(argv[3])+L"\"";
 if(!CreateProcessW(argv[2],cmd.data(),nullptr,nullptr,TRUE,CREATE_NO_WINDOW,nullptr,nullptr,&startup,&child))return 11;CloseHandle(child.hThread);CloseHandle(inR);CloseHandle(outW);CloseHandle(startup.hStdError);
 int exit=0;while(WaitForSingleObject(child.hProcess,0)==WAIT_TIMEOUT){
  OVERLAPPED connection{};connection.hEvent=CreateEventW(nullptr,TRUE,FALSE,nullptr);BOOL connected=ConnectNamedPipe(pipe,&connection);const auto err=GetLastError();if(!connected&&err==ERROR_PIPE_CONNECTED)SetEvent(connection.hEvent);else if(!connected&&err!=ERROR_IO_PENDING){CloseHandle(connection.hEvent);exit=12;break;}
  HANDLE waits[]={connection.hEvent,child.hProcess};const DWORD w=WaitForMultipleObjects(2,waits,FALSE,INFINITE);if(w!=WAIT_OBJECT_0){CancelIoEx(pipe,&connection);DWORD done;GetOverlappedResult(pipe,&connection,&done,TRUE);CloseHandle(connection.hEvent);break;}CloseHandle(connection.hEvent);
  const auto d=GetTickCount64()+30000;std::vector<char> request,response;
  if(!receive(pipe,request,INPUT_MAX,d,true)){DisconnectNamedPipe(pipe);continue;}
  if(!send(inW,request,d,false)||!receive(outR,response,OUTPUT_MAX,d,false)){exit=13;DisconnectNamedPipe(pipe);break;}
  // Timeout/disconnect has an unknown result; do not replay the request.
  // DisconnectNamedPipe discards unread buffered output. A bounded read receipt
  // avoids both that race and an unbounded FlushFileBuffers wait.
  if(send(pipe,response,d,true)){char ack=0;io(pipe,&ack,1,false,d,true);}DisconnectNamedPipe(pipe);
 }
 CloseHandle(pipe);CloseHandle(inW);CloseHandle(outR);DWORD childExit=STILL_ACTIVE;if(WaitForSingleObject(child.hProcess,25000)!=WAIT_OBJECT_0)exit=14;else{GetExitCodeProcess(child.hProcess,&childExit);if(childExit)exit=static_cast<int>(childExit);}CloseHandle(child.hProcess);
 const auto leaf=(stateRoot/(L"gate-exit-"+std::to_wstring(GetCurrentProcessId())+L".json")).wstring();HANDLE receipt=CreateFileW(leaf.c_str(),GENERIC_WRITE,FILE_SHARE_READ,nullptr,CREATE_NEW,FILE_ATTRIBUTE_NORMAL|FILE_FLAG_OPEN_REPARSE_POINT,nullptr);if(receipt!=INVALID_HANDLE_VALUE){BY_HANDLE_FILE_INFORMATION info{};if(GetFileInformationByHandle(receipt,&info)&&!(info.dwFileAttributes&(FILE_ATTRIBUTE_REPARSE_POINT|FILE_ATTRIBUTE_DIRECTORY))&&info.nNumberOfLinks==1&&owned::samePath(owned::finalPath(receipt),leaf)){const auto text=std::string("{\"gatePid\":")+std::to_string(GetCurrentProcessId())+",\"servicePid\":"+std::to_string(child.dwProcessId)+",\"serviceExitCode\":"+std::to_string(childExit)+",\"gateExitCode\":"+std::to_string(exit)+",\"processKilled\":false}";DWORD n=0;WriteFile(receipt,text.data(),static_cast<DWORD>(text.size()),&n,nullptr);}CloseHandle(receipt);}return exit;
}
