#pragma once
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <array>
#include <algorithm>
#include <cmath>
namespace ui {
constexpr COLORREF bg=RGB(34,42,46),panel=RGB(42,51,56),line=RGB(58,70,76),text=RGB(237,241,241),muted=RGB(175,189,193),accent=RGB(169,201,191),hover=RGB(53,66,73),selected=RGB(61,76,81),primaryText=RGB(32,56,47),danger=RGB(239,176,166),preview=RGB(23,33,38),disabled=RGB(111,125,130),pending=RGB(193,177,124),human=RGB(136,185,151);
constexpr int minWidth=1000,minHeight=760,controlRadius=6,containerRadius=8;
enum Action {back,forward,reload,overview,takeover,handback,refresh,close,confirm,cancel};
inline int px(int dip,UINT dpi){return MulDiv(dip,static_cast<int>(dpi),96);}
inline RECT scale(RECT r,UINT dpi){return {px(r.left,dpi),px(r.top,dpi),px(r.right,dpi),px(r.bottom,dpi)};}
// Shared by composition clip, cover region and pointer eligibility.
inline bool insideRounded(RECT r,POINT p,int radius){if(p.x<r.left||p.x>=r.right||p.y<r.top||p.y>=r.bottom)return false;const double x=p.x+.5,y=p.y+.5,cx=std::clamp(x,double(r.left+radius),double(r.right-radius)),cy=std::clamp(y,double(r.top+radius),double(r.bottom-radius));return (x-cx)*(x-cx)+(y-cy)*(y-cy)<=double(radius)*radius;}
inline COLORREF blend(COLORREF a,COLORREF b,double f){f=std::clamp(f,0.,1.);return RGB(int(GetRValue(a)+(GetRValue(b)-GetRValue(a))*f),int(GetGValue(a)+(GetGValue(b)-GetGValue(a))*f),int(GetBValue(a)+(GetBValue(b)-GetBValue(a))*f));}
inline bool allowMotion(bool system,bool minimized,bool foreground,bool closing){return system&&!minimized&&foreground&&!closing;}
struct Fade{COLORREF from=panel,to=panel,current=panel;ULONGLONG start=0;unsigned duration=120;bool active=false;COLORREF tick(ULONGLONG now){const double t=std::min(1.,double(now-start)/duration);current=blend(from,to,1.-(1.-t)*(1.-t));if(t>=1.)active=false;return current;}};
struct Layout{RECT header{},viewer{},context{},title{},status{},toolbar{},pending{},guest{},foot{},address{},sidebarTitle{},sidebarFooter{};std::array<RECT,10> buttons{};std::array<RECT,8> pages{};std::array<RECT,2> agents{},tasks{};int sidebar=320,rowHeight=54;};
inline Layout calculate(int width,int height,UINT dpi,const std::array<bool,8>& active,bool asking){
 const int w=MulDiv(width,96,dpi),h=MulDiv(height,96,dpi);Layout l;l.sidebar=w<1120?280:320;l.header={0,0,w,48};l.viewer={l.sidebar+18,66,w-18,h-18};const int a=l.viewer.left,b=l.viewer.right,t=l.viewer.top;
 l.context={a+16,t+12,b-142,t+29};l.title={a+16,t+34,b-18,t+62};l.status={a+16,t+65,b-18,t+83};l.toolbar={a+14,t+93,b-14,t+129};l.pending=asking?RECT{a+16,t+140,b-16,t+204}:RECT{};l.guest={a+1,t+(asking?217:142),b-1,l.viewer.bottom-1};
 l.buttons[overview]={20,66,l.sidebar-10,102};l.buttons[takeover]=l.buttons[handback]={b-128,t+12,b-16,t+48};for(int i=0;i<3;i++)l.buttons[i]={a+14+i*38,t+93,a+50+i*38,t+129};l.address={a+134,t+93,b-98,t+129};l.buttons[refresh]={b-90,t+93,b-54,t+129};l.buttons[close]={b-50,t+93,b-14,t+129};l.buttons[confirm]={b-190,t+154,b-104,t+190};l.buttons[cancel]={b-94,t+154,b-16,t+190};
 l.sidebarTitle={20,118,l.sidebar-10,135};const int count=int(std::count(active.begin(),active.end(),true)),space=h-28-146-88-16;l.rowHeight=count?std::clamp(space/count-3,44,54):54;int y=146;
 for(int owner=0;owner<2;owner++){l.agents[owner]={22,y,l.sidebar-10,y+19};l.tasks[owner]={32,y+21,l.sidebar-10,y+40};y+=44;for(int i=owner*4;i<owner*4+4;i++)if(active[i]){l.pages[i]={32,y,l.sidebar-10,y+l.rowHeight};y+=l.rowHeight+3;}y+=8;}
 auto s=[&](RECT&r){r=scale(r,dpi);};for(auto*p:{&l.header,&l.viewer,&l.context,&l.title,&l.status,&l.toolbar,&l.pending,&l.guest,&l.address,&l.sidebarTitle})s(*p);for(auto&r:l.buttons)s(r);for(auto&r:l.pages)s(r);for(auto&r:l.agents)s(r);for(auto&r:l.tasks)s(r);l.sidebar=px(l.sidebar,dpi);l.rowHeight=px(l.rowHeight,dpi);return l;
}
}
