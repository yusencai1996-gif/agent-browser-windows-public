#pragma once
#include <windows.h>
// An inherited console belongs to its caller. Unknown/truncated membership is
// not permission to hide it, even when this program was invoked as overview.
inline bool hideOwnConsole(){HWND window=GetConsoleWindow();if(!window)return false;DWORD processes[2]{};DWORD count=GetConsoleProcessList(processes,2);if(count!=1||processes[0]!=GetCurrentProcessId())return false;ShowWindow(window,SW_HIDE);return true;}
