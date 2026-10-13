// Uses the same directory guard and marker writer as uninstallCheck. Only
// supplied synthetic directories are touched; no installed Profile is read.
#define wmain installer_entry_for_probe
#include "../src/launcher.cpp"
#undef wmain
int wmain(int argc,wchar_t**argv){if(argc!=3)return 2;const install::fs::path root=install::fs::path(argv[1]).lexically_normal();const std::string expected=utf8(argv[2]);try{auto markerParents=install::ancestors(root/L".local");writeNew(root/L".local/uninstall-started.json","synthetic marker");if(expected!="OK")return 3;std::cout<<"{\"result\":\"passed\",\"case\":\"plain\",\"markerWritten\":true}\n";return 0;}catch(const std::exception&e){if(expected!=e.what()){std::cerr<<e.what()<<"\n";return 4;}std::cout<<"{\"result\":\"passed\",\"code\":\""<<e.what()<<"\",\"markerWritten\":false}\n";return 0;}}
