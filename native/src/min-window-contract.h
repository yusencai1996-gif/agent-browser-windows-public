// Pure contract: other applications may change foreground while ours stays background.
#pragma once
namespace min_window {
struct Snapshot {
 bool iconic=false,foregroundKnown=false,foregroundOwnMain=false,foregroundOwnHost=false;
 int shows=0,focus=0,restores=0;
};
inline const char* reject(const Snapshot& baseline,const Snapshot& current){
 if(!current.iconic)return "MIN_NOT_ICONIC";
 if(!current.foregroundKnown)return "MIN_FOREGROUND_OWNER_UNKNOWN";
 if(current.foregroundOwnMain||current.foregroundOwnHost)return "MIN_OWN_FOREGROUND";
 if(current.shows!=baseline.shows)return "MIN_SHOW_CHANGED";
 if(current.focus!=baseline.focus)return "MIN_FOCUS_CHANGED";
 if(current.restores!=baseline.restores)return "MIN_RESTORE_CHANGED";
 return "NONE";
}
}
