#include "napi/native_api.h"
#include <string>
#include <cstring>
#include <vector>
#include <chrono>
#include <thread>

// 1. add(a: number, b: number): number
static napi_value Add(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value args[2] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    double a = 0, b = 0;
    napi_get_value_double(env, args[0], &a);
    napi_get_value_double(env, args[1], &b);

    napi_value result;
    napi_create_double(env, a + b, &result);
    return result;
}

// 2. multiply(a: number, b: number): number
static napi_value Multiply(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value args[2] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    double a = 0, b = 0;
    napi_get_value_double(env, args[0], &a);
    napi_get_value_double(env, args[1], &b);

    napi_value result;
    napi_create_double(env, a * b, &result);
    return result;
}

// 3. greet(name: string): string
static napi_value Greet(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    size_t strSize = 0;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &strSize);

    std::vector<char> buf(strSize + 1);
    napi_get_value_string_utf8(env, args[0], buf.data(), strSize + 1, &strSize);

    std::string greeting = "Hello, " + std::string(buf.data()) + "!";

    napi_value result;
    napi_create_string_utf8(env, greeting.c_str(), greeting.length(), &result);
    return result;
}

// 4. stringLength(str: string): number
static napi_value StringLength(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    size_t strLen = 0;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &strLen);

    napi_value result;
    napi_create_int32(env, (int32_t)strLen, &result);
    return result;
}

// 5. concatStrings(a: string, b: string): string
static napi_value ConcatStrings(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value args[2] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    size_t strSize1 = 0;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &strSize1);
    std::vector<char> buf1(strSize1 + 1);
    napi_get_value_string_utf8(env, args[0], buf1.data(), strSize1 + 1, &strSize1);

    size_t strSize2 = 0;
    napi_get_value_string_utf8(env, args[1], nullptr, 0, &strSize2);
    std::vector<char> buf2(strSize2 + 1);
    napi_get_value_string_utf8(env, args[1], buf2.data(), strSize2 + 1, &strSize2);

    std::string concatenated = std::string(buf1.data()) + std::string(buf2.data());

    napi_value result;
    napi_create_string_utf8(env, concatenated.c_str(), concatenated.length(), &result);
    return result;
}

// 6. reverseString(str: string): string
static napi_value ReverseString(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    size_t strSize = 0;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &strSize);
    std::vector<char> buf(strSize + 1);
    napi_get_value_string_utf8(env, args[0], buf.data(), strSize + 1, &strSize);

    std::string original(buf.data());
    std::string reversed(original.rbegin(), original.rend());

    napi_value result;
    napi_create_string_utf8(env, reversed.c_str(), reversed.length(), &result);
    return result;
}

// 7. sumArray(arr: number[]): number
static napi_value SumArray(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    uint32_t arrayLen = 0;
    napi_get_array_length(env, args[0], &arrayLen);

    double sum = 0;
    for (uint32_t i = 0; i < arrayLen; i++) {
        napi_value element;
        napi_get_element(env, args[0], i, &element);
        double val = 0;
        napi_get_value_double(env, element, &val);
        sum += val;
    }

    napi_value result;
    napi_create_double(env, sum, &result);
    return result;
}

// 8. createIntArray(start: number, count: number): number[]
static napi_value CreateIntArray(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value args[2] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    int32_t start = 0;
    napi_get_value_int32(env, args[0], &start);
    int32_t count = 0;
    napi_get_value_int32(env, args[1], &count);

    napi_value result;
    napi_create_array_with_length(env, (size_t)count, &result);

    for (int32_t i = 0; i < count; i++) {
        napi_value num;
        napi_create_int32(env, start + i, &num);
        napi_set_element(env, result, (uint32_t)i, num);
    }

    return result;
}

// 9. callCallback(cb: (msg: string) => void): void
static napi_value CallCallback(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    napi_value cb = args[0];
    napi_value cbArgs[1];
    napi_create_string_utf8(env, "callback invoked", NAPI_AUTO_LENGTH, &cbArgs[0]);

    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_call_function(env, undefined, cb, 1, cbArgs, nullptr);

    return undefined;
}

// 10. delayedResult(ms: number): Promise<string>
struct AsyncData {
    napi_async_work work;
    napi_deferred deferred;
    int32_t delayMs;
    char resultStr[64];
};

static void ExecuteDelayedResult(napi_env env, void *data)
{
    AsyncData *asyncData = (AsyncData *)data;
    std::this_thread::sleep_for(std::chrono::milliseconds(asyncData->delayMs));
    snprintf(asyncData->resultStr, sizeof(asyncData->resultStr),
             "completed after %d ms", asyncData->delayMs);
}

static void CompleteDelayedResult(napi_env env, napi_status status, void *data)
{
    AsyncData *asyncData = (AsyncData *)data;
    napi_value result;
    napi_create_string_utf8(env, asyncData->resultStr, NAPI_AUTO_LENGTH, &result);

    if (status == napi_ok) {
        napi_resolve_deferred(env, asyncData->deferred, result);
    } else {
        napi_reject_deferred(env, asyncData->deferred, result);
    }

    napi_delete_async_work(env, asyncData->work);
    delete asyncData;
}

static napi_value DelayedResult(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1] = {nullptr};
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    int32_t delayMs = 0;
    napi_get_value_int32(env, args[0], &delayMs);

    napi_value promise;
    napi_deferred deferred;
    napi_create_promise(env, &deferred, &promise);

    AsyncData *asyncData = new AsyncData();
    asyncData->deferred = deferred;
    asyncData->delayMs = delayMs;
    asyncData->resultStr[0] = '\0';

    napi_value workName;
    napi_create_string_utf8(env, "delayedResultWork", NAPI_AUTO_LENGTH, &workName);
    napi_create_async_work(env, nullptr, workName, ExecuteDelayedResult, CompleteDelayedResult,
                           asyncData, &asyncData->work);
    napi_queue_async_work(env, asyncData->work);

    return promise;
}

EXTERN_C_START
static napi_value Init(napi_env env, napi_value exports)
{
    napi_property_descriptor desc[] = {
        { "add", nullptr, Add, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "multiply", nullptr, Multiply, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "greet", nullptr, Greet, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "stringLength", nullptr, StringLength, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "concatStrings", nullptr, ConcatStrings, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "reverseString", nullptr, ReverseString, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "sumArray", nullptr, SumArray, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "createIntArray", nullptr, CreateIntArray, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "callCallback", nullptr, CallCallback, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "delayedResult", nullptr, DelayedResult, nullptr, nullptr, nullptr, napi_default, nullptr },
    };
    napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    return exports;
}
EXTERN_C_END

static napi_module demoModule = {
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
    napi_module_register(&demoModule);
}
