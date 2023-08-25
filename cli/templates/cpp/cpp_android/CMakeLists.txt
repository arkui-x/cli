# the minimum version of CMake.
cmake_minimum_required(VERSION 3.4.1)
project(appNameValue)

set(NATIVE_ROOT_PATH ${CMAKE_CURRENT_SOURCE_DIR})
if(DEFINED ENV{ARKUIX_SDK_HOME})
        set(NATIVE_INCLUDE_PATH "$ENV{ARKUIX_SDK_HOME}/10/arkui-x/engine/lib/include/")
        message("ARKUIX_SDK_HOME:$ENV{ARKUIX_SDK_HOME}")
else()
        message(FATAL_ERROR "ARKUIX_SDK_HOME environment variable not set.Set it up for your project.")
endif()

include_directories(${NATIVE_ROOT_PATH})
include_directories(${NATIVE_INCLUDE_PATH})

add_library(arkui_android SHARED IMPORTED GLOBAL)
set_target_properties(
        arkui_android
        PROPERTIES IMPORTED_LOCATION
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../libs/${CMAKE_ANDROID_ARCH_ABI}/libarkui_android.so
)

set(NATIVE_SOURCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../entry/src/main/cpp)
add_library(entry SHARED ${NATIVE_SOURCE_PATH}/hello.cpp)
target_link_libraries(entry PUBLIC arkui_android)
