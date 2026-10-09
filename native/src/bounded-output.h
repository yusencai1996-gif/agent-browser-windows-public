#pragma once
#include <windows.h>
#include <thread>
#include <algorithm>
// Actual stdout writes use the remaining transaction budget. The synchronous
// worker is cancelled and joined before returning. No detached output thread.
inline bool outputUntil(HANDLE pipe,const char* bytes,DWORD length,ULONGLONG deadline){
 DWORD offset=0;while(offset<length){const auto now=GetTickCount64();if(now>=deadline)return false;DWORD done=0;bool ok=false;
  std::thread writer([&]{ok=WriteFile(pipe,bytes+offset,length-offset,&done,nullptr)!=FALSE;});
  if(WaitForSingleObject(writer.native_handle(),static_cast<DWORD>(deadline-now))!=WAIT_OBJECT_0){CancelSynchronousIo(writer.native_handle());if(WaitForSingleObject(writer.native_handle(),1000)!=WAIT_OBJECT_0)ExitProcess(74);writer.join();return false;}
  writer.join();if(!ok||!done)return false;offset+=done;
 }return GetTickCount64()<=deadline;
}
