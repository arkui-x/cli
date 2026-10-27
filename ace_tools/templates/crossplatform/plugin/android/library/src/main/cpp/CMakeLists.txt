cmake_minimum_required(VERSION 3.22.1)
project(module_name_lower)

add_definitions(-DANDROID_PLATFORM)

set(NATIVE_ROOT_PATH ${CMAKE_CURRENT_SOURCE_DIR})
if(DEFINED ENV{ARKUIX_SDK_HOME})
        message("ARKUIX_SDK_HOME: $ENV{ARKUIX_SDK_HOME}")
        file(GLOB SDK_DIRS "$ENV{ARKUIX_SDK_HOME}/*/arkui-x/engine/lib/include")
        list(SORT SDK_DIRS)
        list(REVERSE SDK_DIRS)
        list(GET SDK_DIRS 0 NATIVE_INCLUDE_PATH)
        if(EXISTS ${NATIVE_INCLUDE_PATH})
                message("NATIVE_INCLUDE_PATH: ${NATIVE_INCLUDE_PATH}")
        else()
                message(FATAL_ERROR "No arkui-x SDK engine include path found under $ENV{ARKUIX_SDK_HOME}")
        endif()
else()
        message(FATAL_ERROR "ARKUIX_SDK_HOME environment variable not set.Set it up for your project.")
endif()

include_directories(${NATIVE_ROOT_PATH})
include_directories(${NATIVE_INCLUDE_PATH})

add_library(arkui_android SHARED IMPORTED GLOBAL)
set_target_properties(
        arkui_android
        PROPERTIES IMPORTED_LOCATION
        ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../android/app/libs/${CMAKE_ANDROID_ARCH_ABI}/libarkui_android.so
)

set(NATIVE_SOURCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../module_name/src/main/cpp)

add_library(module_name_lower SHARED
        ${NATIVE_SOURCE_PATH}/plugin.cpp
        plugin_jni.cpp
        plugin_impl.cpp
)
target_link_libraries(module_name_lower PUBLIC arkui_android libc++.a)
