#ifndef PLUGIN_JNI_H
#define PLUGIN_JNI_H

#include <jni.h>
#include <string>

class PluginJni {
public:
    PluginJni() = delete;
    ~PluginJni() = delete;

    static bool Register(void* env);
    static void NativeInit(JNIEnv* env, jobject jobj);

    static double Add(double a, double b);
    static void Log(std::string msg);
    static std::string GetSystemVersion();
    static std::string GetFullOSName();
    static std::string GetDeviceType();
};

#endif
