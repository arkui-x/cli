#ifndef PLUGIN_IMPL_H
#define PLUGIN_IMPL_H

#include <string>

class PluginImpl {
public:
    static double Add(double a, double b);
    static void Log(std::string msg);
    static std::string GetSystemVersion();
    static std::string GetFullOSName();
    static std::string GetDeviceType();
};

#endif
