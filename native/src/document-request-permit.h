#pragma once
#include <string>
#include <cstdint>
// NavigationStarting is the authoritative top-level event. A matching single
// document resource request consumes its permit before any network connection.
namespace network {
struct DocumentRequestPermit {
 std::wstring uri;unsigned generation=0;std::uint64_t lifetime=0,epoch=0;bool armed=false;
 void arm(const std::wstring&value,unsigned g,std::uint64_t l,std::uint64_t e){uri=value;generation=g;lifetime=l;epoch=e;armed=true;}
 bool consume(const std::wstring&value,unsigned g,std::uint64_t l,std::uint64_t e){if(!armed||uri!=value||generation!=g||lifetime!=l||epoch!=e)return false;armed=false;return true;}
};
}
