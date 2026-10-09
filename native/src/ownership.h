#pragma once
#include <windows.h>
#include "build-binding.h"
#include <filesystem>
#include <string>
#include <vector>
namespace owned {
namespace fs=std::filesystem;
inline std::wstring finalPath(HANDLE handle){wchar_t value[32768]{};const DWORD n=GetFinalPathNameByHandleW(handle,value,32768,FILE_NAME_NORMALIZED);if(!n||n>=32768)return {};std::wstring p=value;if(p.rfind(L"\\\\?\\",0)==0)p.erase(0,4);return fs::path(p).lexically_normal().wstring();}
inline bool samePath(const std::wstring&a,const std::wstring&b){return CompareStringOrdinal(a.c_str(),-1,b.c_str(),-1,TRUE)==CSTR_EQUAL;}
inline HANDLE openDirectory(const fs::path& p){return CreateFileW(p.c_str(),FILE_READ_ATTRIBUTES,FILE_SHARE_READ|FILE_SHARE_WRITE,nullptr,OPEN_EXISTING,FILE_FLAG_BACKUP_SEMANTICS|FILE_FLAG_OPEN_REPARSE_POINT,nullptr);}
inline bool plain(HANDLE h,const fs::path& p){BY_HANDLE_FILE_INFORMATION info{};return h!=INVALID_HANDLE_VALUE&&GetFileInformationByHandle(h,&info)&&!(info.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT)&&samePath(finalPath(h),p.lexically_normal().wstring());}
struct Directories {
    fs::path run,udf,artifacts,temp;std::vector<HANDLE> held;HANDLE state=INVALID_HANDLE_VALUE;
    ~Directories(){if(state!=INVALID_HANDLE_VALUE)CloseHandle(state);for(auto h:held)CloseHandle(h);}
    bool create(const fs::path& requestedUdf,const fs::path& requestedOutput){
        const auto base=fs::path(binding::runs);udf=requestedUdf.lexically_normal();artifacts=requestedOutput.lexically_normal();run=artifacts.parent_path();temp=run/L"temp";
        const auto fixed=fs::path(binding::profile);
        if(udf!=fixed||run.parent_path()!=base||artifacts.filename()!=L"artifacts"||run.filename().wstring().rfind(L"wv19-a-",0)!=0)return false;
        for(auto p=udf;!p.empty();p=p.parent_path()){const auto a=GetFileAttributesW(p.c_str());if(a==INVALID_FILE_ATTRIBUTES||(a&FILE_ATTRIBUTE_REPARSE_POINT))return false;if(p==p.root_path())break;}
        for(const auto& p:{run,artifacts,temp}){if(!CreateDirectoryW(p.c_str(),nullptr))return false;}
        for(const auto& p:{run,udf,artifacts,temp}){const HANDLE h=openDirectory(p);if(!plain(h,p)){if(h!=INVALID_HANDLE_VALUE)CloseHandle(h);return false;}held.push_back(h);}
        state=createNew(L"state.json");return state!=INVALID_HANDLE_VALUE;
    }
    bool valid()const{const fs::path paths[]={run,udf,artifacts,temp};if(held.size()!=4)return false;for(size_t i=0;i<4;i++)if(!plain(held[i],paths[i]))return false;return true;}
    HANDLE createNew(const wchar_t* leaf)const{
        if(!valid())return INVALID_HANDLE_VALUE;
        const fs::path p=artifacts/leaf;HANDLE h=CreateFileW(p.c_str(),GENERIC_READ|GENERIC_WRITE,FILE_SHARE_READ,nullptr,CREATE_NEW,FILE_ATTRIBUTE_NORMAL|FILE_FLAG_OPEN_REPARSE_POINT,nullptr);
        BY_HANDLE_FILE_INFORMATION info{};if(h==INVALID_HANDLE_VALUE)return h;
        if(!GetFileInformationByHandle(h,&info)||(info.dwFileAttributes&(FILE_ATTRIBUTE_REPARSE_POINT|FILE_ATTRIBUTE_DIRECTORY))||info.nNumberOfLinks!=1||!samePath(finalPath(h),p.wstring())){CloseHandle(h);return INVALID_HANDLE_VALUE;}return h;
    }
    bool writeState(const std::string& text){if(state==INVALID_HANDLE_VALUE||!valid())return false;LARGE_INTEGER start{};DWORD n=0;return SetFilePointerEx(state,start,nullptr,FILE_BEGIN)&&WriteFile(state,text.data(),static_cast<DWORD>(text.size()),&n,nullptr)&&n==text.size()&&SetEndOfFile(state);}
};
}
