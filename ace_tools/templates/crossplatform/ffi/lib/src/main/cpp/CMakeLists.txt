# the minimum version of CMake.
cmake_minimum_required(VERSION 3.4.1)
project(module_name_lower)

set(NATIVERENDER_ROOT_PATH ${CMAKE_CURRENT_SOURCE_DIR})

include_directories(${NATIVERENDER_ROOT_PATH})

add_library(module_name_lower SHARED hello.cpp)
target_link_libraries(module_name_lower PUBLIC libace_napi.z.so)
