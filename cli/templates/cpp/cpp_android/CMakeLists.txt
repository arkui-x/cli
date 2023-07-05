# the minimum version of CMake.
cmake_minimum_required(VERSION 3.4.1)
project(appNameValue)

set(NATIVERENDER_ROOT_PATH ${CMAKE_CURRENT_SOURCE_DIR})
set(NATIVERENDER_SOURCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../source/entry/src/main/cpp)
set(NATIVERENDER_INCLUDE_PATH SDK_INCLUDE_PATH/native/sysroot/usr/include/)
set(NATIVERENDER_INCLUDE_PATH2 ${NATIVERENDER_INCLUDE_PATH}/aarch64-linux-ohos)

include_directories(${NATIVERENDER_ROOT_PATH})
include_directories(${NATIVERENDER_INCLUDE_PATH})
include_directories(${NATIVERENDER_INCLUDE_PATH2})

add_library(entry SHARED ${NATIVERENDER_SOURCE_PATH}/hello.cpp)


add_library(arkui_android SHARED IMPORTED GLOBAL)
set_target_properties(
        arkui_android
        PROPERTIES IMPORTED_LOCATION
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../libs/${CMAKE_ANDROID_ARCH_ABI}/libarkui_android.so
)

target_link_libraries(entry PUBLIC arkui_android)