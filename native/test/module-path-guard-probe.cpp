#include "../src/install-platform.h"
#include <iostream>
int wmain(){try{auto path=install::modulePath();std::cout<<"{\"accepted\":true,\"physicalCanonical\":true}\n";return 0;}catch(const std::exception&e){std::string code=e.what();if(code.size()>80||code.find_first_not_of("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_")!=std::string::npos)code="PROBE_ERROR";std::cout<<"{\"accepted\":false,\"code\":\""<<code<<"\"}\n";return 1;}}
