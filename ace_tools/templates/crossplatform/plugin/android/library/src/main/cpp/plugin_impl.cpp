/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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
