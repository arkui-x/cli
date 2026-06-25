/*
 * Copyright (c) 2026 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "plugin_jni.h"

#include <jni.h>
#include "plugin_utils.h"

namespace {
    const char PLUGIN_CLASS_NAME[] = "com/example/module_name/Module_namePlugin";

    static const JNINativeMethod METHODS[] = {
        { "nativeInit", "()V", reinterpret_cast<void*>(PluginJni::NativeInit) },
    };

    const char METHOD_ADD[] = "add";
    const char SIGNATURE_ADD[] = "(DD)D";

    const char METHOD_LOG[] = "log";
    const char SIGNATURE_LOG[] = "(Ljava/lang/String;)V";

    const char METHOD_GET_SYSTEM_VERSION[] = "getSystemVersion";
    const char SIGNATURE_GET_SYSTEM_VERSION[] = "()Ljava/lang/String;";

    const char METHOD_GET_FULL_OS_NAME[] = "getFullOSName";
    const char SIGNATURE_GET_FULL_OS_NAME[] = "()Ljava/lang/String;";

    const char METHOD_GET_DEVICE_TYPE[] = "getDeviceType";
    const char SIGNATURE_GET_DEVICE_TYPE[] = "()Ljava/lang/String;";

    struct {
        jmethodID add;
        jmethodID log;
        jmethodID getSystemVersion;
        jmethodID getFullOSName;
        jmethodID getDeviceType;
        jobject globalRef;
    } g_pluginClass = {nullptr, nullptr, nullptr, nullptr, nullptr, nullptr};
}

bool PluginJni::Register(void* env)
{
    auto* jniEnv = static_cast<JNIEnv*>(env);
    jclass cls = jniEnv->FindClass(PLUGIN_CLASS_NAME);
    if (!cls) {
        return false;
    }

    bool ret = jniEnv->RegisterNatives(cls, METHODS, sizeof(METHODS) / sizeof(METHODS[0])) == 0;
    jniEnv->DeleteLocalRef(cls);
    return ret;
}

void PluginJni::NativeInit(JNIEnv* env, jobject jobj)
{
    g_pluginClass.globalRef = env->NewGlobalRef(jobj);
    jclass cls = env->GetObjectClass(jobj);

    g_pluginClass.add = env->GetMethodID(cls, METHOD_ADD, SIGNATURE_ADD);
    g_pluginClass.log = env->GetMethodID(cls, METHOD_LOG, SIGNATURE_LOG);
    g_pluginClass.getSystemVersion = env->GetMethodID(cls, METHOD_GET_SYSTEM_VERSION, SIGNATURE_GET_SYSTEM_VERSION);
    g_pluginClass.getFullOSName = env->GetMethodID(cls, METHOD_GET_FULL_OS_NAME, SIGNATURE_GET_FULL_OS_NAME);
    g_pluginClass.getDeviceType = env->GetMethodID(cls, METHOD_GET_DEVICE_TYPE, SIGNATURE_GET_DEVICE_TYPE);
    env->DeleteLocalRef(cls);
}

double PluginJni::Add(double a, double b)
{
    if (!g_pluginClass.globalRef || !g_pluginClass.add) {
        return a + b; // Fallback to pure C++ implementation
    }
    auto env = ARKUI_X_Plugin_GetJniEnv();
    jdouble result = env->CallDoubleMethod(g_pluginClass.globalRef, g_pluginClass.add, (jdouble)a, (jdouble)b);

    if (env->ExceptionCheck()) {
        env->ExceptionDescribe();
        env->ExceptionClear();
    }
    return result;
}

void PluginJni::Log(std::string msg)
{
    if (!g_pluginClass.globalRef || !g_pluginClass.log) {
        return; // No fallback for log
    }
    auto env = ARKUI_X_Plugin_GetJniEnv();
    jstring jMsg = env->NewStringUTF(msg.c_str());
    env->CallVoidMethod(g_pluginClass.globalRef, g_pluginClass.log, jMsg);

    if (jMsg != nullptr) {
        env->DeleteLocalRef(jMsg);
    }
    if (env->ExceptionCheck()) {
        env->ExceptionDescribe();
        env->ExceptionClear();
    }
}

std::string PluginJni::GetSystemVersion()
{
    if (!g_pluginClass.globalRef || !g_pluginClass.getSystemVersion) {
        return "unknown";
    }
    auto env = ARKUI_X_Plugin_GetJniEnv();
    jstring result = (jstring)env->CallObjectMethod(g_pluginClass.globalRef, g_pluginClass.getSystemVersion);

    std::string ret;
    if (result != nullptr) {
        const char* str = env->GetStringUTFChars(result, nullptr);
        ret = str;
        env->ReleaseStringUTFChars(result, str);
        env->DeleteLocalRef(result);
    }

    if (env->ExceptionCheck()) {
        env->ExceptionDescribe();
        env->ExceptionClear();
    }
    return ret;
}

std::string PluginJni::GetFullOSName()
{
    if (!g_pluginClass.globalRef || !g_pluginClass.getFullOSName) {
        return "unknown";
    }
    auto env = ARKUI_X_Plugin_GetJniEnv();
    jstring result = (jstring)env->CallObjectMethod(g_pluginClass.globalRef, g_pluginClass.getFullOSName);

    std::string ret;
    if (result != nullptr) {
        const char* str = env->GetStringUTFChars(result, nullptr);
        ret = str;
        env->ReleaseStringUTFChars(result, str);
        env->DeleteLocalRef(result);
    }

    if (env->ExceptionCheck()) {
        env->ExceptionDescribe();
        env->ExceptionClear();
    }
    return ret;
}

std::string PluginJni::GetDeviceType()
{
    if (!g_pluginClass.globalRef || !g_pluginClass.getDeviceType) {
        return "unknown";
    }
    auto env = ARKUI_X_Plugin_GetJniEnv();
    jstring result = (jstring)env->CallObjectMethod(g_pluginClass.globalRef, g_pluginClass.getDeviceType);

    std::string ret;
    if (result != nullptr) {
        const char* str = env->GetStringUTFChars(result, nullptr);
        ret = str;
        env->ReleaseStringUTFChars(result, str);
        env->DeleteLocalRef(result);
    }

    if (env->ExceptionCheck()) {
        env->ExceptionDescribe();
        env->ExceptionClear();
    }
    return ret;
}
