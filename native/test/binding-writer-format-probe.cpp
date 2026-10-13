#include <windows.h>
#include <filesystem>
#include <string>
#include <iostream>
std::string quoted(const std::wstring&s){int n=WideCharToMultiByte(CP_UTF8,0,s.data(),static_cast<int>(s.size()),nullptr,0,nullptr,nullptr);std::string b(n,'\0');WideCharToMultiByte(CP_UTF8,0,s.data(),static_cast<int>(s.size()),b.data(),n,nullptr,nullptr);std::string out="\"";for(char c:b){if(c=='\\'||c=='"')out+='\\';out+=c;}return out+'"';}
int wmain(){namespace fs=std::filesystem;fs::path root=L"D:\\synthetic\\中文 Space";auto profile=root/L".local"/L"profile",runs=root/L".local"/L"runs",node=root/L"runtime"/L"node.exe";std::cout<<"{\"root\":"<<quoted(root.wstring())<<",\"oldProfile\":"<<quoted((root/L".local/profile").wstring())<<",\"oldRuns\":"<<quoted((root/L".local/runs").wstring())<<",\"profile\":"<<quoted(profile.wstring())<<",\"runs\":"<<quoted(runs.wstring())<<",\"node\":"<<quoted(node.wstring())<<",\"receiptProfile\":"<<quoted(profile.wstring())<<",\"runtimeHashKey\":"<<quoted(node.wstring())<<"}\n";return 0;}
