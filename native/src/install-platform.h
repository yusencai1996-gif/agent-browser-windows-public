#pragma once
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <sddl.h>
#include <aclapi.h>
#include <bcrypt.h>
#include <wintrust.h>
#include <softpub.h>
#include <mscat.h>
#include <wincrypt.h>
#include <filesystem>
#include <string>
#include <vector>
#include <stdexcept>
namespace install {
namespace fs=std::filesystem;
inline void require(bool ok,const char* code){if(!ok)throw std::runtime_error(code);}
struct Handle {HANDLE value=INVALID_HANDLE_VALUE;Handle()=default;explicit Handle(HANDLE h):value(h){}Handle(const Handle&)=delete;Handle&operator=(const Handle&)=delete;Handle(Handle&&other)noexcept:value(other.value){other.value=INVALID_HANDLE_VALUE;}Handle&operator=(Handle&&other)noexcept{if(this!=&other){if(value&&value!=INVALID_HANDLE_VALUE)CloseHandle(value);value=other.value;other.value=INVALID_HANDLE_VALUE;}return *this;}~Handle(){if(value&&value!=INVALID_HANDLE_VALUE)CloseHandle(value);}operator HANDLE()const{return value;}};
inline std::wstring finalPath(HANDLE h){wchar_t b[32768]{};DWORD n=GetFinalPathNameByHandleW(h,b,32768,FILE_NAME_NORMALIZED);require(n&&n<32768,"FINAL_PATH_UNKNOWN");std::wstring p=b;if(p.rfind(L"\\\\?\\",0)==0)p.erase(0,4);return fs::path(p).lexically_normal().wstring();}
inline bool equalPath(const fs::path&a,const fs::path&b){return CompareStringOrdinal(a.c_str(),-1,b.c_str(),-1,TRUE)==CSTR_EQUAL;}
inline Handle openPlain(const fs::path&p,bool directory=false,bool systemFile=false,DWORD access=GENERIC_READ){Handle h(CreateFileW(p.c_str(),directory?FILE_READ_ATTRIBUTES:access,FILE_SHARE_READ,nullptr,OPEN_EXISTING,FILE_FLAG_OPEN_REPARSE_POINT|(directory?FILE_FLAG_BACKUP_SEMANTICS:0),nullptr));require(h.value!=INVALID_HANDLE_VALUE,"PATH_OPEN");BY_HANDLE_FILE_INFORMATION i{};require(GetFileInformationByHandle(h,&i)&&!(i.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT)&&bool(i.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)==directory&&(directory||systemFile||i.nNumberOfLinks==1)&&equalPath(finalPath(h),p.lexically_normal()),"PATH_NOT_PLAIN");return h;}
inline std::vector<Handle> ancestors(const fs::path&p){std::vector<Handle> held;for(auto q=p;!q.empty();q=q.parent_path()){held.push_back(openPlain(q,true));if(q==q.root_path())break;}return held;}
inline fs::path modulePath(){
 wchar_t b[32768]{},expanded[32768]{};DWORD n=GetModuleFileNameW(nullptr,b,32768);require(n&&n<32768,"MODULE_PATH");
 // The loader may report an ordinary 8.3 spelling for NSIS's temporary exe.
 // Expand names, then use the existing physical/ancestor checks: a junction
 // still differs from its physical target, and hardlinks remain rejected.
 DWORD count=GetLongPathNameW(b,expanded,32768);require(count&&count<32768,"MODULE_LONG_PATH");
 const auto p=fs::path(expanded).lexically_normal();auto held=ancestors(p.parent_path());auto h=openPlain(p);
 return fs::path(finalPath(h));
}
inline fs::path moduleRoot(){auto p=modulePath();auto leaf=p.filename().wstring();if(leaf==L"abw.exe")return p.parent_path();require((leaf==L"pipe-gate.exe"||leaf==L"abw19e-host.exe")&&p.parent_path().filename()==L"dist","MODULE_LAYOUT");return p.parent_path().parent_path();}
inline std::wstring sid(){Handle t;require(OpenProcessToken(GetCurrentProcess(),TOKEN_QUERY,&t.value),"TOKEN");DWORD n=0;GetTokenInformation(t,TokenUser,nullptr,0,&n);std::vector<BYTE>b(n);require(GetTokenInformation(t,TokenUser,b.data(),n,&n),"TOKEN_USER");LPWSTR s=nullptr;require(ConvertSidToStringSidW(reinterpret_cast<TOKEN_USER*>(b.data())->User.Sid,&s),"SID");std::wstring out=s;LocalFree(s);return out;}
inline std::string hex(const BYTE*b,size_t n){static const char digits[]="0123456789abcdef";std::string s;for(size_t i=0;i<n;i++){s+=digits[b[i]>>4];s+=digits[b[i]&15];}return s;}
inline std::string sha256(HANDLE file){BCRYPT_ALG_HANDLE algorithm=nullptr;BCRYPT_HASH_HANDLE hash=nullptr;require(BCryptOpenAlgorithmProvider(&algorithm,BCRYPT_SHA256_ALGORITHM,nullptr,0)>=0,"SHA_PROVIDER");DWORD size=0,got=0;BCryptGetProperty(algorithm,BCRYPT_OBJECT_LENGTH,reinterpret_cast<PUCHAR>(&size),sizeof(size),&got,0);std::vector<BYTE>object(size),buffer(65536);BYTE digest[32]{};bool ok=BCryptCreateHash(algorithm,&hash,object.data(),size,nullptr,0,0)>=0;LARGE_INTEGER zero{};ok=ok&&SetFilePointerEx(file,zero,nullptr,FILE_BEGIN);DWORD read=0;while(ok){if(!ReadFile(file,buffer.data(),static_cast<DWORD>(buffer.size()),&read,nullptr)){ok=false;break;}if(!read)break;ok=BCryptHashData(hash,buffer.data(),read,0)>=0;}if(ok)ok=BCryptFinishHash(hash,digest,sizeof(digest),0)>=0;if(hash)BCryptDestroyHash(hash);BCryptCloseAlgorithmProvider(algorithm,0);require(ok,"SHA_FAILED");return hex(digest,32);}
inline std::string sha256(const fs::path&p,bool systemFile=false){auto h=openPlain(p,false,systemFile);return sha256(h);}
inline fs::path systemPowerShell(){wchar_t b[32768]{};UINT n=GetSystemDirectoryW(b,32768);require(n&&n<32768,"SYSTEM_DIRECTORY");return fs::path(b)/L"WindowsPowerShell"/L"v1.0"/L"powershell.exe";}
inline bool microsoftSigner(WINTRUST_DATA&data){auto provider=WTHelperProvDataFromStateData(data.hWVTStateData);auto signer=provider?WTHelperGetProvSignerFromChain(provider,0,FALSE,0):nullptr;if(!signer||!signer->csCertChain)return false;auto cert=signer->pasCertChain[0].pCert;wchar_t organization[256]{},name[256]{};CertGetNameStringW(cert,CERT_NAME_ATTR_TYPE,0,const_cast<char*>(szOID_ORGANIZATION_NAME),organization,256);CertGetNameStringW(cert,CERT_NAME_ATTR_TYPE,0,const_cast<char*>(szOID_COMMON_NAME),name,256);return wcscmp(organization,L"Microsoft Corporation")==0&&wcscmp(name,L"Microsoft Windows")==0;}
inline bool verifyTrust(WINTRUST_DATA&data){GUID action=WINTRUST_ACTION_GENERIC_VERIFY_V2;data.cbStruct=sizeof(data);data.dwUIChoice=WTD_UI_NONE;data.fdwRevocationChecks=WTD_REVOKE_NONE;data.dwProvFlags=WTD_CACHE_ONLY_URL_RETRIEVAL;data.dwStateAction=WTD_STATEACTION_VERIFY;bool ok=WinVerifyTrust(nullptr,&action,&data)==ERROR_SUCCESS&&microsoftSigner(data);data.dwStateAction=WTD_STATEACTION_CLOSE;WinVerifyTrust(nullptr,&action,&data);return ok;}
// Verify the actual system file before executing it; Windows PowerShell is
// commonly catalog-signed, so embedded-signature-only checks are insufficient.
inline void trustSystemPowerShell(const fs::path&p){require(equalPath(p,systemPowerShell()),"SYSTEM_PS_SCOPE");auto parents=ancestors(p.parent_path());auto file=openPlain(p,false,true);
 WINTRUST_FILE_INFO fi{sizeof(fi),p.c_str(),file,nullptr};WINTRUST_DATA wd{};wd.dwUnionChoice=WTD_CHOICE_FILE;wd.pFile=&fi;if(verifyTrust(wd))return;
 HCATADMIN admin=nullptr;require(CryptCATAdminAcquireContext2(&admin,nullptr,BCRYPT_SHA256_ALGORITHM,nullptr,0)!=FALSE,"CATALOG_CONTEXT");DWORD bytes=0;bool ok=CryptCATAdminCalcHashFromFileHandle2(admin,file,&bytes,nullptr,0)!=FALSE;std::vector<BYTE>hash(bytes);if(ok)ok=CryptCATAdminCalcHashFromFileHandle2(admin,file,&bytes,hash.data(),0)!=FALSE;bool trusted=false;
 if(ok){const auto tagText=hex(hash.data(),hash.size());std::wstring tag(tagText.begin(),tagText.end());for(auto& c:tag)c=towupper(c);HCATINFO catalog=nullptr;while((catalog=CryptCATAdminEnumCatalogFromHash(admin,hash.data(),bytes,0,&catalog))!=nullptr){CATALOG_INFO info{};info.cbStruct=sizeof(info);if(!CryptCATCatalogInfoFromContext(catalog,&info,0))continue;WINTRUST_CATALOG_INFO ci{};ci.cbStruct=sizeof(ci);ci.pcwszCatalogFilePath=info.wszCatalogFile;ci.pcwszMemberTag=tag.c_str();ci.pcwszMemberFilePath=p.c_str();ci.hMemberFile=file;ci.pbCalculatedFileHash=hash.data();ci.cbCalculatedFileHash=bytes;ci.hCatAdmin=admin;WINTRUST_DATA cw{};cw.dwUnionChoice=WTD_CHOICE_CATALOG;cw.pCatalog=&ci;if(verifyTrust(cw)){trusted=true;CryptCATAdminReleaseCatalogContext(admin,catalog,0);break;}}}
 CryptCATAdminReleaseContext(admin,0);require(trusted,"SYSTEM_PS_TRUST");
}
inline std::wstring ini(const fs::path&root,const wchar_t*key){const auto file=root/L"INSTALLATION.ini";auto h=openPlain(file);wchar_t b[32768]{};DWORD n=GetPrivateProfileStringW(L"Installation",key,L"",b,32768,file.c_str());require(n&&n<32767,"INSTALLATION_RECORD");return b;}
inline fs::path installedRoot(){const auto root=moduleRoot();auto held=ancestors(root);require(equalPath(root,fs::path(ini(root,L"Root")))&&ini(root,L"OwnerSid")==sid(),"INSTALLATION_IDENTITY");return root;}
}
