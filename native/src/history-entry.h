#pragma once
#include <string>
#include <vector>
#include <climits>
// Parse only the bounded, internal Page.getNavigationHistory response. No page
// strings become commands or entry IDs; malformed/ambiguous responses fail closed.
namespace history_entry {
struct Reader {
 const std::wstring& s;size_t at=0;
 void ws(){while(at<s.size()&&(s[at]==L' '||s[at]==L'\n'||s[at]==L'\r'||s[at]==L'\t'))at++;}
 bool take(wchar_t c){ws();if(at==s.size()||s[at]!=c)return false;at++;return true;}
 bool string(std::wstring&out){if(!take(L'"'))return false;out.clear();while(at<s.size()){auto c=s[at++];if(c==L'"')return true;if(c<32)return false;if(c==L'\\'){if(at==s.size())return false;c=s[at++];if(c==L'u'){for(int i=0;i<4;i++)if(at==s.size()||!((s[at]>=L'0'&&s[at]<=L'9')||(s[at]>=L'a'&&s[at]<=L'f')||(s[at]>=L'A'&&s[at]<=L'F')))return false;else at++;out+=L'?';}else if(std::wstring(L"\"\\/bfnrt").find(c)==std::wstring::npos)return false;else out+=L'?';}else out+=c;}return false;}
 bool number(int&value){ws();if(at==s.size()||s[at]<L'0'||s[at]>L'9')return false;value=0;const auto first=at;while(at<s.size()&&s[at]>=L'0'&&s[at]<=L'9'){const int digit=s[at++]-L'0';if(value>(INT_MAX-digit)/10)return false;value=value*10+digit;}return at-first==1||s[first]!=L'0';}
 bool skip(unsigned depth=0){if(depth>8)return false;ws();if(at==s.size())return false;std::wstring text;if(s[at]==L'"')return string(text);if(s[at]==L'{'){at++;if(take(L'}'))return true;do{if(!string(text)||!take(L':')||!skip(depth+1))return false;if(take(L'}'))return true;}while(take(L','));return false;}if(s[at]==L'['){at++;if(take(L']'))return true;do{if(!skip(depth+1))return false;if(take(L']'))return true;}while(take(L','));return false;}for(const auto literal:{L"true",L"false",L"null"}){const std::wstring token=literal;if(s.compare(at,token.size(),token)==0){at+=token.size();return true;}}int value=0;return number(value);}
 bool entry(int&id){if(!take(L'{'))return false;bool found=false;std::wstring key;do{if(!string(key)||!take(L':'))return false;if(key==L"id"){if(found||!number(id)||id<=0)return false;found=true;}else if(!skip())return false;if(take(L'}'))return found;}while(take(L','));return false;}
};
struct Snapshot {int index=-1;std::vector<int> ids;};
inline bool parse(const wchar_t*data,Snapshot&out){out={};if(!data)return false;size_t length=0;while(length<=60000&&data[length])length++;if(length>60000)return false;const std::wstring s(data,length);Reader r{s};if(!r.take(L'{'))return false;bool index=false,entries=false;std::wstring key;do{if(!r.string(key)||!r.take(L':'))return false;if(key==L"currentIndex"){if(index||!r.number(out.index))return false;index=true;}else if(key==L"entries"){if(entries||!r.take(L'['))return false;entries=true;if(!r.take(L']')){do{int id=0;if(out.ids.size()>=1000||!r.entry(id))return false;for(const auto old:out.ids)if(old==id)return false;out.ids.push_back(id);if(r.take(L']'))break;if(!r.take(L','))return false;}while(true);}}else if(!r.skip())return false;if(r.take(L'}'))break;if(!r.take(L','))return false;}while(true);r.ws();return r.at==s.size()&&index&&entries&&out.index>=0&&static_cast<size_t>(out.index)<out.ids.size();}
}
