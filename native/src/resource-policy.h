#pragma once
#include <WebView2.h>
#include <string>

namespace resource_policy {
// Unknown contexts and all worker sources stay fail-closed. API methods are not
// reduced to GET: normal page JSON POST is distinct from trusted-input submit.
inline bool staticChild(COREWEBVIEW2_WEB_RESOURCE_CONTEXT context){
 return context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_STYLESHEET||context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_SCRIPT||context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_IMAGE||context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_FONT;
}
inline bool known(COREWEBVIEW2_WEB_RESOURCE_CONTEXT context){
 return staticChild(context)||context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_DOCUMENT||context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_XML_HTTP_REQUEST||context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_FETCH||context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_WEBSOCKET;
}
inline bool publicChild(COREWEBVIEW2_WEB_RESOURCE_CONTEXT context){return context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_DOCUMENT||staticChild(context)||context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_XML_HTTP_REQUEST||context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_FETCH||context==COREWEBVIEW2_WEB_RESOURCE_CONTEXT_WEBSOCKET;}
// Data/blob resources do not make a network connection. They are never top-level
// navigation permissions; worker/source/generation checks remain in the handler.
inline bool nonNetworkStatic(const std::wstring&url,COREWEBVIEW2_WEB_RESOURCE_CONTEXT context,const std::wstring&documentUrl){
 if(!staticChild(context)||url.size()>1048576)return false;
 if(url.rfind(L"data:",0)==0)return true;
 if(url.rfind(L"blob:",0)!=0)return false;
 const auto scheme=documentUrl.find(L"://");if(scheme==std::wstring::npos)return false;const auto end=documentUrl.find(L'/',scheme+3);const auto origin=documentUrl.substr(0,end);
 return url.rfind(L"blob:"+origin+L"/",0)==0;
}
inline bool eligible(bool sourceKnown,COREWEBVIEW2_WEB_RESOURCE_REQUEST_SOURCE_KINDS source,bool contextKnown,COREWEBVIEW2_WEB_RESOURCE_CONTEXT context,const std::wstring&method){
 return sourceKnown&&source==COREWEBVIEW2_WEB_RESOURCE_REQUEST_SOURCE_KINDS_DOCUMENT&&contextKnown&&known(context)&&!method.empty()&&(!staticChild(context)||method==L"GET");
}
}
