# the minimum version of CMake.
cmake_minimum_required(VERSION 3.4.1)
project(appNameValue)

set(NATIVERENDER_ROOT_PATH ${CMAKE_CURRENT_SOURCE_DIR})
set(NATIVERENDER_SOURCE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../source/entry/src/main/cpp)

include_directories(${NATIVERENDER_ROOT_PATH})

add_library(entry SHARED ${NATIVERENDER_SOURCE_PATH}/hello.cpp)
target_link_libraries(entry PUBLIC libace_napi.z.so)