#pragma once
#include <winsock2.h>
#include <ws2tcpip.h>
#include <winhttp.h>
#include <map>
#include <array>
#include <vector>
#include <algorithm>
#include <string>
namespace network {
inline bool public4(const unsigned char*a){return a[0]!=0&&a[0]!=10&&a[0]!=127&&a[0]<224&&!(a[0]==198&&(a[1]==18||a[1]==19||a[1]==51&&a[2]==100))&&!(a[0]==192&&a[1]==0&&(a[2]==0||a[2]==2))&&!(a[0]==203&&a[1]==0&&a[2]==113)&&!(a[0]==169&&a[1]==254)&&!(a[0]==172&&a[1]>=16&&a[1]<=31)&&!(a[0]==192&&a[1]==168)&&!(a[0]==100&&a[1]>=64&&a[1]<=127);}
// Conservative ordinary global-unicast classification. Special translation,
// mapped, protocol-assignment and documentation ranges are not authorized.
inline bool public6(const unsigned char*a){if((a[0]&0xe0)!=0x20)return false;if(a[0]==0x20&&a[1]==1&&a[2]<2)return false;if(a[0]==0x20&&a[1]==1&&a[2]==0x0d&&a[3]==0xb8)return false;if(a[0]==0x20&&a[1]==2)return false;if(a[0]==0x3f&&a[1]==0xff)return false;return true;}

struct Policy {
 std::wstring fixture;std::array<std::vector<std::wstring>,2> scopes;std::array<bool,2> publicMode{};std::array<unsigned,2> generations{};std::map<std::wstring,std::pair<ULONGLONG,bool>> cache;
 bool publicDns(const std::wstring&host){const auto now=GetTickCount64();auto cached=cache.find(host);if(cached!=cache.end()&&now-cached->second.first<10000)return cached->second.second;
  ADDRINFOEXW hints{};hints.ai_family=AF_UNSPEC;hints.ai_socktype=SOCK_STREAM;PADDRINFOEXW addresses=nullptr;OVERLAPPED o{};o.hEvent=CreateEventW(nullptr,TRUE,FALSE,nullptr);if(!o.hEvent)return false;HANDLE cancel=nullptr;TIMEVAL timeout{1,0};INT code=GetAddrInfoExW(host.c_str(),nullptr,NS_DNS,nullptr,&hints,&addresses,&timeout,&o,nullptr,&cancel);
  if(code==WSA_IO_PENDING){if(WaitForSingleObject(o.hEvent,1000)!=WAIT_OBJECT_0){GetAddrInfoExCancel(&cancel);if(WaitForSingleObject(o.hEvent,1000)!=WAIT_OBJECT_0)ExitProcess(74);}code=GetAddrInfoExOverlappedResult(&o);}bool ok=code==0&&addresses;
  for(auto*a=addresses;a&&ok;a=a->ai_next){if(a->ai_family==AF_INET)ok=public4(reinterpret_cast<unsigned char*>(&reinterpret_cast<sockaddr_in*>(a->ai_addr)->sin_addr));else if(a->ai_family==AF_INET6)ok=public6(reinterpret_cast<unsigned char*>(&reinterpret_cast<sockaddr_in6*>(a->ai_addr)->sin6_addr));else ok=false;}
  if(addresses)FreeAddrInfoExW(addresses);CloseHandle(o.hEvent);cache[host]={now,ok};return ok;
 }
 bool canonicalOrigin(const std::wstring&input,std::wstring&out)const{if(input.empty()||input.size()>2048||input.find_first_of(L"\\*?#")!=std::wstring::npos)return false;URL_COMPONENTS u{};u.dwStructSize=sizeof(u);u.dwHostNameLength=u.dwUrlPathLength=u.dwUserNameLength=u.dwPasswordLength=u.dwExtraInfoLength=static_cast<DWORD>(-1);if(!WinHttpCrackUrl(input.c_str(),static_cast<DWORD>(input.size()),0,&u)||u.nScheme!=INTERNET_SCHEME_HTTPS||u.nPort==0||u.dwUserNameLength||u.dwPasswordLength||u.dwExtraInfoLength||u.dwUrlPathLength)return false;std::wstring host(u.lpszHostName,u.dwHostNameLength);if(host.size()>253||host.find(L'.')==std::wstring::npos||host.back()==L'.')return false;bool digits=true;unsigned label=0;for(const auto c:host){if(c==L'.'){if(!label||label>63)return false;label=0;continue;}if(!((c>=L'a'&&c<=L'z')||(c>=L'0'&&c<=L'9')||c==L'-'))return false;digits=digits&&(c>=L'0'&&c<=L'9');label++;}if(digits||!label||label>63)return false;size_t begin=0;while(begin<host.size()){const auto end=host.find(L'.',begin);const auto last=end==std::wstring::npos?host.size():end;if(host[begin]==L'-'||host[last-1]==L'-')return false;if(end==std::wstring::npos)break;begin=end+1;}for(const auto*suffix:{L".localhost",L".local",L".internal",L".lan",L".home",L".test",L".invalid"})if(host.size()>=wcslen(suffix)&&host.substr(host.size()-wcslen(suffix))==suffix)return false;out=L"https://"+host+(u.nPort==443?L"":L":"+std::to_wstring(u.nPort));return input==out;}
 bool publicOrigin(const std::wstring&origin){URL_COMPONENTS u{};u.dwStructSize=sizeof(u);u.dwHostNameLength=static_cast<DWORD>(-1);return WinHttpCrackUrl(origin.c_str(),static_cast<DWORD>(origin.size()),0,&u)&&publicDns(std::wstring(u.lpszHostName,u.dwHostNameLength));}
 bool parseScope(const std::wstring&text,std::vector<std::wstring>&out,bool&isPublic)const{out.clear();isPublic=false;if(text==L"PUBLIC_HTTPS_V1"){isPublic=true;return true;}size_t start=0;while(start<=text.size()){const auto end=text.find(L'\n',start);std::wstring normalized;if(!canonicalOrigin(text.substr(start,end==std::wstring::npos?text.size()-start:end-start),normalized)||std::find(out.begin(),out.end(),normalized)!=out.end()||out.size()>=8)return false;out.push_back(normalized);if(end==std::wstring::npos)break;start=end+1;}return !out.empty();}
 // The public mode is set only by successful registration; unregistered owners
 // cannot obtain public resources merely because they have an empty scope.
 bool allowed(int owner,const std::wstring&url,bool staticChild=false){if(staticChild&&url.rfind(L"wss://",0)==0)return allowed(owner,L"https://"+url.substr(6),true);if(owner<0||owner>1||url.size()>8192||url.find(L'\\')!=std::wstring::npos)return false;URL_COMPONENTS u{};u.dwStructSize=sizeof(u);u.dwHostNameLength=u.dwUrlPathLength=u.dwUserNameLength=u.dwPasswordLength=u.dwExtraInfoLength=static_cast<DWORD>(-1);if(!WinHttpCrackUrl(url.c_str(),static_cast<DWORD>(url.size()),0,&u)||u.dwUserNameLength||u.dwPasswordLength)return false;std::wstring host(u.lpszHostName,u.dwHostNameLength);std::transform(host.begin(),host.end(),host.begin(),[](wchar_t c){return c>=L'A'&&c<=L'Z'?c+32:c;});if(u.nScheme==INTERNET_SCHEME_HTTP)return url.rfind(fixture+L"/",0)==0;const auto origin=L"https://"+host+(u.nPort==443?L"":L":"+std::to_wstring(u.nPort));std::wstring canonical;if(u.nScheme!=INTERNET_SCHEME_HTTPS||u.nPort==0||!canonicalOrigin(origin,canonical))return false;const bool registered=publicMode[owner]||!scopes[owner].empty();const bool inScope=publicMode[owner]||std::find(scopes[owner].begin(),scopes[owner].end(),origin)!=scopes[owner].end();return registered&&(staticChild||inScope)&&publicDns(host);}

};
}
