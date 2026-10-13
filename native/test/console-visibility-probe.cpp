#include "../src/console-visibility.h"
#include <string>
#include <fstream>
int wmain(int argc,wchar_t**argv){if(argc>1&&std::wstring(argv[1])==L"stay"){Sleep(3000);return 0;}if(argc!=3)return 2;HWND window=GetConsoleWindow();if(!window)return 3;bool shared=std::wstring(argv[1])==L"shared";PROCESS_INFORMATION child{};
 if(shared){wchar_t exe[32768]{};GetModuleFileNameW(nullptr,exe,32768);std::wstring command=L"\""+std::wstring(exe)+L"\" stay";STARTUPINFOW startup{};startup.cb=sizeof(startup);if(!CreateProcessW(exe,command.data(),nullptr,nullptr,FALSE,0,nullptr,nullptr,&startup,&child))return 4;DWORD pids[3]{};for(int i=0;i<20&&GetConsoleProcessList(pids,3)<2;i++)Sleep(25);}
 bool before=IsWindowVisible(window)!=FALSE;bool changed=hideOwnConsole();bool after=IsWindowVisible(window)!=FALSE;if(changed)ShowWindow(window,SW_SHOW);bool ok=shared?(!changed&&before==after):changed;
 std::ofstream out(argv[2]);out<<"{\"shared\":"<<(shared?"true":"false")<<",\"hiddenByHelper\":"<<(changed?"true":"false")<<",\"passed\":"<<(ok?"true":"false")<<"}\n";out.close();if(child.hProcess){WaitForSingleObject(child.hProcess,5000);CloseHandle(child.hThread);CloseHandle(child.hProcess);}return ok?0:5;}
