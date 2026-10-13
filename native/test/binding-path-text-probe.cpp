#include <filesystem>
#include <iostream>
#include <string>
int wmain(){namespace fs=std::filesystem;fs::path root=L"D:\\synthetic\\中文 Space";bool mixed=false,canonical=true;for(auto leaf:{L".local/profile",L".local/runs",L"runtime/node.exe"}){auto raw=root/leaf;auto preferred=raw;preferred.make_preferred();mixed=mixed||raw.wstring().find(L'/')!=std::wstring::npos;canonical=canonical&&preferred.wstring().find(L'/')==std::wstring::npos&&raw.lexically_normal()==preferred.lexically_normal();}std::cout<<"{\"writerRetainsForwardSlash\":"<<(mixed?"true":"false")<<",\"makePreferredPreservesLocation\":"<<(canonical?"true":"false")<<"}\n";return mixed&&canonical?0:1;}
