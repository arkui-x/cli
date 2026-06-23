#include "napi/native_api.h"
#include <string>
#include <cstring>
#include <vector>

#ifdef ANDROID_PLATFORM
#include "plugin_utils.h"
#include "plugin_impl.h"
#elif defined(IOS_PLATFORM)
#include "plugin_impl.h"
#else
// HarmonyOS: direct implementations
#include <cstdio>
#endif

// 1. add(a: number, b: number): number
static napi_value Add(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value args[2] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    double a = 0, b = 0;
    napi_get_value_double(env, args[0], &a);
    napi_get_value_double(env, args[1], &b);

    double result = 0;
#ifdef ANDROID_PLATFORM
    result = PluginImpl::Add(a, b);
#elif defined(IOS_PLATFORM)
    result = PluginImpl::Add(a, b);
#else
    result = a + b;
#endif

    napi_value napiResult;
    napi_create_double(env, result, &napiResult);
    return napiResult;
}

// 2. log(msg: string): void
static napi_value Log(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    size_t strSize = 0;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &strSize);
    std::vector<char> buf(strSize + 1);
    napi_get_value_string_utf8(env, args[0], buf.data(), strSize + 1, &strSize);
    std::string msg(buf.data());

#ifdef ANDROID_PLATFORM
    PluginImpl::Log(msg);
#elif defined(IOS_PLATFORM)
    PluginImpl::Log(msg);
#else
    std::printf("%s\n", msg.c_str());
#endif

    napi_value undefined;
    napi_get_undefined(env, &undefined);
    return undefined;
}

// Helper: get string from napi_value
static std::string GetStringArg(napi_env env, napi_value arg)
{
    size_t strSize = 0;
    napi_get_value_string_utf8(env, arg, nullptr, 0, &strSize);
    std::vector<char> buf(strSize + 1);
    napi_get_value_string_utf8(env, arg, buf.data(), strSize + 1, &strSize);
    return std::string(buf.data());
}

// Helper: create napi string
static napi_value MakeString(napi_env env, const std::string &str)
{
    napi_value result;
    napi_create_string_utf8(env, str.c_str(), str.length(), &result);
    return result;
}

// 3. getSystemVersion(): string
static napi_value GetSystemVersion(napi_env env, napi_callback_info info)
{
    std::string version;
#ifdef ANDROID_PLATFORM
    version = PluginImpl::GetSystemVersion();
#elif defined(IOS_PLATFORM)
    version = PluginImpl::GetSystemVersion();
#else
    version = "HarmonyOS";
#endif
    return MakeString(env, version);
}

// 4. getFullOSName(): string
static napi_value GetFullOSName(napi_env env, napi_callback_info info)
{
    std::string osName;
#ifdef ANDROID_PLATFORM
    osName = PluginImpl::GetFullOSName();
#elif defined(IOS_PLATFORM)
    osName = PluginImpl::GetFullOSName();
#else
    osName = "HarmonyOS";
#endif
    return MakeString(env, osName);
}

// 5. getDeviceType(): string
static napi_value GetDeviceType(napi_env env, napi_callback_info info)
{
    std::string deviceType;
#ifdef ANDROID_PLATFORM
    deviceType = PluginImpl::GetDeviceType();
#elif defined(IOS_PLATFORM)
    deviceType = PluginImpl::GetDeviceType();
#else
    deviceType = "phone";
#endif
    return MakeString(env, deviceType);
}

EXTERN_C_START
static napi_value Init(napi_env env, napi_value exports)
{
    napi_property_descriptor desc[] = {
        { "add", nullptr, Add, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "log", nullptr, Log, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "getSystemVersion", nullptr, GetSystemVersion, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "getFullOSName", nullptr, GetFullOSName, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "getDeviceType", nullptr, GetDeviceType, nullptr, nullptr, nullptr, napi_default, nullptr },
    };
    napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    return exports;
}
EXTERN_C_END

static napi_module pluginModule = {
    .nm_version = 1,
    .nm_flags = 0,
    .nm_filename = nullptr,
    .nm_register_func = Init,
    .nm_modname = "module_name",
    .nm_priv = ((void *)0),
    .reserved = { 0 },
};

extern "C" __attribute__((constructor)) void RegisterModule(void)
{
    napi_module_register(&pluginModule);
#ifdef ANDROID_PLATFORM
    PluginImpl::RegisterJni();
#endif
}
