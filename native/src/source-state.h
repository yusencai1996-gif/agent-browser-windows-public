#pragma once
#include <windows.h>
#include <string>
namespace source_state {
inline bool accept(HRESULT hr,LPCWSTR source,std::wstring&uri,bool&known){known=SUCCEEDED(hr)&&source&&*source;if(known)uri=source;else uri.clear();return known;}
}
