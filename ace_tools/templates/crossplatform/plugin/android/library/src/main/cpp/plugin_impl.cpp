#include "plugin_impl.h"

#ifdef ANDROID_PLATFORM
#include "plugin_utils.h"
#include "plugin_jni.h"

double PluginImpl::Add(double a, double b)
{
    return PluginJni::Add(a, b);
}

void PluginImpl::Log(std::string msg)
{
    PluginJni::Log(msg);
}

std::string PluginImpl::GetSystemVersion()
{
    return PluginJni::GetSystemVersion();
}

std::string PluginImpl::GetFullOSName()
{
    return PluginJni::GetFullOSName();
}

std::string PluginImpl::GetDeviceType()
{
    return PluginJni::GetDeviceType();
}

void PluginImpl::RegisterJni()
{
    // Synchronous registration - must complete before NAPI functions are called
    const char className[] = "com.example.module_name.Module_namePlugin";
    ARKUI_X_Plugin_RegisterJavaPlugin(&PluginJni::Register, className);
}
#endif
