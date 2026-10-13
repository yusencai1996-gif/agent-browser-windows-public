#include "../src/install-platform.h"
#include <iostream>
int wmain(){try{auto ps=install::systemPowerShell();install::trustSystemPowerShell(ps);std::cout<<"{\"systemPowerShellTrusted\":true,\"sha256\":\""<<install::sha256(ps,true)<<"\",\"executed\":false}\n";return 0;}catch(const std::exception&e){std::cout<<"{\"systemPowerShellTrusted\":false,\"code\":\""<<e.what()<<"\"}\n";return 1;}}
