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
