// Uses the actual verifier with a two-file synthetic pin table supplied by the
// test build. It does not run an installer or touch any installation/Profile.
#define wmain installer_entry_for_probe
#include "../src/launcher.cpp"
#undef wmain
#include <fstream>
int wmain(int argc,wchar_t**argv){if(argc!=2)return 2;const install::fs::path root=install::fs::path(argv[1]).lexically_normal();try{bool refused=false;{auto reader=install::openPlain(root/L"z-last.txt");try{auto files=verifyPayload(root,true,false);}catch(const std::exception&e){refused=std::string(e.what())=="PATH_OPEN";}}install::require(refused&&install::fs::exists(root/L"a-first.txt")&&install::fs::exists(root/L"z-last.txt"),"OCCUPIED_PREFLIGHT_FAILED");{auto files=verifyPayload(root,true,false);}
 const auto first=root/L"a-first.txt",retained=root/L"retained-first.txt";install::require(first.parent_path()==root&&retained.parent_path()==root&&!install::fs::exists(retained),"TEST_MOVE_SCOPE");auto parents=install::ancestors(root);install::require(MoveFileW(first.c_str(),retained.c_str())!=FALSE,"TEST_MOVE_FAILED");{auto files=verifyPayload(root,true,true);}bool missingRefused=false;try{auto files=verifyPayload(root,true,false);}catch(...){missingRefused=true;}install::require(missingRefused,"MISSING_WITHOUT_RESUME_ALLOWED");
 std::cout<<"{\"occupiedLateFileRefused\":true,\"noFileDeleted\":true,\"releasedFilesVerified\":true,\"partialMissingAllowedOnlyInResume\":true,\"fullUninstallIntegration\":false}\n";return 0;}catch(const std::exception&e){std::cerr<<e.what()<<"\n";return 1;}}
