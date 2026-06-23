#include "plugin_impl.h"
#import "Module_namePlugin.h"

double PluginImpl::Add(double a, double b)
{
    return (double)[Module_namePlugin addWithA:(int)a b:(int)b];
}

void PluginImpl::Log(std::string msg)
{
    NSString *ocMsg = [NSString stringWithCString:msg.c_str() encoding:NSUTF8StringEncoding];
    [Module_namePlugin logWithMsg:ocMsg];
}

std::string PluginImpl::GetSystemVersion()
{
    NSString *version = [Module_namePlugin getSystemVersion];
    return std::string([version UTF8String]);
}

std::string PluginImpl::GetFullOSName()
{
    NSString *osName = [Module_namePlugin getFullOSName];
    return std::string([osName UTF8String]);
}

std::string PluginImpl::GetDeviceType()
{
    NSString *deviceType = [Module_namePlugin getDeviceType];
    return std::string([deviceType UTF8String]);
}
