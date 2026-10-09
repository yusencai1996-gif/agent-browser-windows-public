#pragma once
#include <windows.h>
#include <shobjidl.h>
#include <string>
#include <vector>
namespace startup {
constexpr wchar_t appId[]=L"AgentBrowser.WV19C.IsolatedCLI";
inline bool overridesInEnvironment(){LPWCH all=GetEnvironmentStringsW();if(!all)return true;bool blocked=false;for(auto p=all;*p;p+=wcslen(p)+1){const std::wstring entry=p;const auto end=entry.find(L'=');const auto name=entry.substr(0,end);if(_wcsnicmp(name.c_str(),L"WEBVIEW2_",9)==0||_wcsnicmp(name.c_str(),L"COREWEBVIEW2_",13)==0){blocked=true;break;}}FreeEnvironmentStringsW(all);return blocked;}
inline bool policyClear(const std::wstring& exe){
    const wchar_t* keys[]={L"BrowserExecutableFolder",L"UserDataFolder",L"AdditionalBrowserArguments",L"ChannelSearchKind",L"ReleaseChannels",L"ReleaseChannelPreference"};
    for(const auto hive:{HKEY_LOCAL_MACHINE,HKEY_CURRENT_USER})for(const auto view:{KEY_WOW64_64KEY,KEY_WOW64_32KEY})for(const auto key:keys){
        const std::wstring path=std::wstring(L"Software\\Policies\\Microsoft\\Edge\\WebView2\\")+key;HKEY opened=nullptr;const LSTATUS result=RegOpenKeyExW(hive,path.c_str(),0,KEY_QUERY_VALUE|view,&opened);
        if(result==ERROR_FILE_NOT_FOUND)continue;if(result!=ERROR_SUCCESS)return false;
        std::vector<std::wstring> names{appId,exe};if(wcscmp(key,L"UserDataFolder")!=0)names.push_back(L"*");
        for(const auto& name:names){DWORD type=0,bytes=0;const LSTATUS found=RegQueryValueExW(opened,name.c_str(),nullptr,&type,nullptr,&bytes);if(found!=ERROR_FILE_NOT_FOUND){RegCloseKey(opened);return false;}}
        RegCloseKey(opened);
    }return true;
}
inline bool preflight(){wchar_t path[32768]{};if(!GetModuleFileNameW(nullptr,path,32768))return false;const std::wstring full=path;const auto slash=full.find_last_of(L"\\/");return !overridesInEnvironment()&&policyClear(full.substr(slash==std::wstring::npos?0:slash+1))&&SUCCEEDED(SetCurrentProcessExplicitAppUserModelID(appId));}
}
