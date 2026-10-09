#pragma once
#include <windows.h>
#include <string>
// Used by both real launch and the no-browser inheritance sentinel.
inline bool createIsolatedServer(const wchar_t* executable,std::wstring& command,PROCESS_INFORMATION& child){STARTUPINFOW start{};start.cb=sizeof(start);return CreateProcessW(executable,command.data(),nullptr,nullptr,FALSE,CREATE_NO_WINDOW|CREATE_NEW_PROCESS_GROUP,nullptr,nullptr,&start,&child)!=FALSE;}
