#pragma once
#include <array>
#include <cstdint>
namespace demo {
enum class Pending { none,takeover,handback };
struct Task {bool registered=false,paused=false,human=false;std::uint64_t epoch=1;};
inline int owner(int page){return page/4;}
struct Controls {
 std::array<Task,2> tasks{};std::array<bool,8> active{};int selected=0;bool viewing=false,failed=false;Pending pending=Pending::none;
 void failClosed(){failed=true;pending=Pending::none;for(auto&t:tasks){t.paused=true;t.human=false;t.epoch++;}}
 bool select(int page){if(page<0||page>=8||!active[page]||pending!=Pending::none)return false;for(int i=0;i<2;i++)if(tasks[i].human&&i!=owner(page))return false;selected=page;viewing=true;return true;}
 bool requestTakeover(){auto&t=tasks[owner(selected)];if(!viewing||t.human||pending!=Pending::none)return false;t.paused=true;t.epoch++;pending=Pending::takeover;return true;}
 bool requestHandback(){if(!tasks[owner(selected)].human||pending!=Pending::none)return false;pending=Pending::handback;return true;}
 bool confirm(bool inFlight){auto&t=tasks[owner(selected)];if(pending==Pending::none||inFlight)return false;if(pending==Pending::takeover)t.human=true;else{t.human=false;t.paused=false;t.epoch++;viewing=false;}pending=Pending::none;return true;}
 void cancel(){auto&t=tasks[owner(selected)];if(pending==Pending::takeover){t.paused=false;t.epoch++;}pending=Pending::none;}
 bool overview(){if(tasks[owner(selected)].human)return requestHandback();if(pending!=Pending::none)return false;viewing=false;return true;}
 const char* authorize(int caller,int target)const{if(failed)return "HOST_FAILED";if(caller<0||caller>1||target<0||target>=8||owner(target)!=caller)return "OWNER_MISMATCH";const auto&t=tasks[owner(target)];if(!t.registered)return "NOT_REGISTERED";if(t.paused||t.human)return "TASK_PAUSED";return "NONE";}
 bool nativeInput(int page,bool foreground)const{return !failed&&foreground&&viewing&&selected==page&&active[page]&&pending==Pending::none&&tasks[owner(page)].human;}
};
}
