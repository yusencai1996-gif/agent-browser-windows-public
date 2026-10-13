#pragma once
#include "install-platform.h"
namespace binding {
inline const std::filesystem::path root=install::installedRoot();
inline const std::filesystem::path profile=root/L".local"/L"profile";
inline const std::filesystem::path runs=root/L".local"/L"runs";
}
