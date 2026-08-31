# ArkUI-X 跨平台三方件端到端测试计划

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v7.0 |
| 创建日期 | 2026-06-04 |
| 适用版本 | Ace Tools CLI (ace_tools) |
| 测试范围 | 三方件完整生命周期：create → build apk → run(android+ios) → build plugin → HAR格式检查 → install → 应用集成 → 运行验证 |
| 前置条件 | ace_tools 已构建部署到 SDK 路径；Android/iOS 真机已连接 |

---

## 测试环境

| 工具 | 值 |
|------|------|
| ace PATH | `export PATH=/Users/liulong/Library/ArkUI-X/Sdk/22/arkui-x/toolchains/bin:$PATH` |
| DEVECO_SDK_HOME | `export DEVECO_SDK_HOME=/Applications/DevEco-Studio.app/Contents/sdk` |
| 工作目录 | `/Users/liulong/DevEcoStudioProjects` |
| Android 设备 | `36G0124116000430` |
| iOS 设备 | `00008110-0015786E2EFA801E` |
| iOS Team ID | `T8G6GD899R` |
| SDK xcframework | `/Users/liulong/Library/ArkUI-X/Sdk/22/arkui-x/engine/xcframework/arkui/ios-release/libarkui_ios.xcframework` |
| 测试编号 | `024`（例如 ffiTest024, pluginTest024, packageTest024, MyApp024） |

---

## 创建工程的 expect 脚本

> 所有工程创建使用以下通用模板。`-t` 参数决定类型：`ffi`、`plugin`、`package`，或不带 `-t` 创建普通应用。

```bash
WORK_DIR="/Users/liulong/DevEcoStudioProjects"
N="024"

create_project() {
  local name=$1
  local template=$2
  local dir="${WORK_DIR}/${name}"
  rm -rf "$dir"
  expect -c "
    set timeout 30
    spawn ace create ${dir} ${template}
    expect \"project name\" { send \"\r\" }
    expect \"bundleName\" { send \"\r\" }
    expect \"runtimeOS\" { send \"2\r\" }
    expect \"Compile\" { send \"4\r\" }
    expect \"platform\" { send \"\r\" }
    expect \"Native Manual\" { send \"1\r\" }
    expect eof
  "
}

# 创建 3 个三方件工程
create_project "ffiTest${N}" "-t ffi"
create_project "pluginTest${N}" "-t plugin"
create_project "packageTest${N}" "-t package"
# 创建应用工程（无 -t 参数）
create_project "MyApp${N}" ""
```

---

## Phase 1: 工程创建验证

> 目标：验证 `ace create -t ffi/plugin/package` 创建的工程结构正确，文件内容符合预期。
> 方法：检查关键文件存在性 + 内容正确性。

### TC-1.1: FFI 工程结构

项目名：`ffiTest024`，HAR 模块名：`ffiTest024lib`

| # | 检查项 | 预期 | 验证命令 |
|---|--------|------|---------|
| 1 | 目录存在 `ffiTest024lib/` | 存在 | `ls $DIR/ffiTest024lib/` |
| 2 | `ffiTest024lib/Index.ets` 导出 add | `export { add } from './src/main/ets/Index'` | `cat $DIR/ffiTest024lib/Index.ets` |
| 3 | `ffiTest024lib/src/main/cpp/hello.cpp` 存在 | 存在，含 `napi/native_api.h` | `grep napi $DIR/ffiTest024lib/src/main/cpp/hello.cpp` |
| 4 | `ffiTest024lib/src/main/cpp/CMakeLists.txt` 存在 | 含 `add_library` | `cat $DIR/ffiTest024lib/src/main/cpp/CMakeLists.txt` |
| 5 | `build-profile.json5` modules 含 entry + ffiTest024lib | 长度 = 2 | `cat $DIR/build-profile.json5 \| grep name` |
| 6 | `oh-package.json5` dependencies 含 `ffiTest024lib` | `file:./ffiTest024lib` | `grep ffiTest024lib $DIR/oh-package.json5` |
| 7 | `.arkui-x/arkui-x-config.json5` 含 modules: ["entry", "ffiTest024lib"] | 正确 | `cat $DIR/.arkui-x/arkui-x-config.json5` |
| 8 | `.arkui-x/crossplatform-config.json5` type = "ffi" | 正确 | `cat $DIR/.arkui-x/crossplatform-config.json5` |
| 9 | `.arkui-x/android/ffiTest024lib/` 存在（Android library module） | 存在 | `ls $DIR/.arkui-x/android/ffiTest024lib/` |
| 10 | `.arkui-x/android/settings-plugin.gradle` 含 include `:ffiTest024lib` | 正确 | `cat $DIR/.arkui-x/android/settings-plugin.gradle` |
| 11 | `.arkui-x/ios/ffitest024lib.xcodeproj/` 存在（library xcodeproj） | 存在 | `ls $DIR/.arkui-x/ios/ffitest024lib.xcodeproj/` |
| 12 | **app.xcodeproj 含 hello.cpp**（新增修复） | `path = ../../ffiTest024lib/src/main/cpp/hello.cpp` | `grep hello.cpp $DIR/.arkui-x/ios/app.xcodeproj/project.pbxproj` |
| 13 | **app.xcodeproj 含 USER_HEADER_SEARCH_PATHS**（Debug+Release） | 2处 | `grep -c USER_HEADER_SEARCH_PATHS $DIR/.arkui-x/ios/app.xcodeproj/project.pbxproj` |

### TC-1.2: Plugin 工程结构

项目名：`pluginTest024`，HAR 模块名：`pluginTest024lib`

| # | 检查项 | 预期 | 验证命令 |
|---|--------|------|---------|
| 1 | `pluginTest024lib/src/main/cpp/plugin.cpp` 存在 | 含 NAPI Init + napi_module_register | `cat $DIR/pluginTest024lib/src/main/cpp/plugin.cpp` |
| 2 | `.arkui-x/ios/plugintest024lib/plugin_impl.mm` 存在 | ObjC++ bridge | `ls $DIR/.arkui-x/ios/plugintest024lib/plugin_impl.mm` |
| 3 | `.arkui-x/ios/plugintest024lib/PluginTest024libPlugin.m` 存在 | ObjC native impl | `ls $DIR/.arkui-x/ios/plugintest024lib/PluginTest024libPlugin.m` |
| 4 | `.arkui-x/ios/plugintest024lib.xcodeproj/` 存在 | library xcodeproj | `ls $DIR/.arkui-x/ios/plugintest024lib.xcodeproj/` |
| 5 | **app.xcodeproj 含 plugin.cpp** | `path = ../../pluginTest024lib/src/main/cpp/plugin.cpp` | `grep plugin.cpp $DIR/.arkui-x/ios/app.xcodeproj/project.pbxproj` |
| 6 | **app.xcodeproj 含 plugin_impl.mm** | `path = plugintest024lib/plugin_impl.mm` | `grep plugin_impl.mm $DIR/.arkui-x/ios/app.xcodeproj/project.pbxproj` |
| 7 | **app.xcodeproj 含 PluginTest024libPlugin.m** | `path = plugintest024lib/PluginTest024libPlugin.m` | `grep PluginTest024libPlugin.m $DIR/.arkui-x/ios/app.xcodeproj/project.pbxproj` |
| 8 | **app.xcodeproj 含 IOS_PLATFORM 预处理宏** | 存在 | `grep IOS_PLATFORM $DIR/.arkui-x/ios/app.xcodeproj/project.pbxproj` |
| 9 | **app.xcodeproj 含 USER_HEADER_SEARCH_PATHS**（Debug+Release） | 2处 | `grep -c USER_HEADER_SEARCH_PATHS $DIR/.arkui-x/ios/app.xcodeproj/project.pbxproj` |
| 10 | `.arkui-x/crossplatform-config.json5` type = "plugin" | 正确 | `cat $DIR/.arkui-x/crossplatform-config.json5` |

### TC-1.3: Package 工程结构

项目名：`packageTest024`，HAR 模块名：`packageTest024lib`

| # | 检查项 | 预期 | 验证命令 |
|---|--------|------|---------|
| 1 | `packageTest024lib/` 存在，含 Index.ets | 纯 ArkTS HAR | `ls $DIR/packageTest024lib/` |
| 2 | `packageTest024lib/src/main/cpp/` 不存在 | 不存在（纯 ArkTS） | `ls $DIR/packageTest024lib/src/main/cpp/ 2>&1` |
| 3 | `.arkui-x/android/` 下无 library module 目录 | 不存在 | `ls $DIR/.arkui-x/android/` |
| 4 | `.arkui-x/crossplatform-config.json5` type = "package" | 无 android/ios 字段 | `cat $DIR/.arkui-x/crossplatform-config.json5` |

---

## Phase 2: 工程自身编译运行验证（Android）

> 目标：验证三方件工程自身可以编译成 APK 并在 Android 设备上运行。
> 这验证了模板工程的 CMake 配置、NAPI 注册、ArkTS 导出链路正确。

### TC-2.1: FFI 自身 Android 编译运行

```bash
cd ffiTest024
ace build apk
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | `ace build apk` 返回 BUILD SUCCESSFUL | ✅ |
| 2 | APK 文件存在于 `.arkui-x/android/app/build/outputs/apk/` | ✅ |
| 3 | `ace run -d 36G0124116000430` 应用启动无 crash（日志无 Fatal/Signal） | ✅ |

**日志异常检查**：运行 60s 内 grep `FATAL|Signal|crash|died|TypeError`，无匹配为通过。

### TC-2.2: Plugin 自身 Android 编译运行

```bash
cd pluginTest024
ace build apk && timeout 90 ace run -d 36G0124116000430
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | `ace build apk` BUILD SUCCESSFUL | ✅ |
| 2 | `ace run` 无 crash | ✅ |

### TC-2.3: Package 自身 Android 编译运行

```bash
cd packageTest024
ace build apk && timeout 90 ace run -d 36G0124116000430
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | `ace build apk` BUILD SUCCESSFUL | ✅ |
| 2 | `ace run` 无 crash | ✅ |

---

## Phase 3: 工程自身编译验证（iOS）

> 目标：验证三方件工程可以在 iOS 上编译。
> 前置：需要复制 xcframework 到 `.arkui-x/ios/frameworks/`。
> 注意：`ace run` iOS 可能需要解锁设备。

### 前置：复制 xcframework

```bash
for proj in ffiTest024 pluginTest024 packageTest024 MyApp024; do
  dir="${WORK_DIR}/${proj}"
  if [ -d "$dir/.arkui-x/ios" ]; then
    ditto /Users/liulong/Library/ArkUI-X/Sdk/22/arkui-x/engine/xcframework/arkui/ios-release/libarkui_ios.xcframework \
      "$dir/.arkui-x/ios/frameworks/libarkui_ios.xcframework"
  fi
done
```

### TC-3.1: FFI 自身 iOS 编译

```bash
cd ffiTest024
ace build apk  # ace build 会同时构建 iOS
```

或直接用 xcodebuild 验证：

```bash
cd ffiTest024/.arkui-x/ios
xcodebuild -project app.xcodeproj -scheme app -configuration Release \
  -destination 'generic/platform=iOS' BUILD_LIBRARY_FOR_DISTRIBUTION=YES \
  2>&1 | tail -3
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | xcodebuild **BUILD SUCCEEDED**（hello.cpp 编译成功） | ✅ |
| 2 | 无 `napi/native_api.h file not found` 错误 | ✅ |

### TC-3.2: Plugin 自身 iOS 编译

```bash
cd pluginTest024/.arkui-x/ios
xcodebuild -project app.xcodeproj -scheme app -configuration Release \
  -destination 'generic/platform=iOS' BUILD_LIBRARY_FOR_DISTRIBUTION=YES \
  2>&1 | tail -3
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | xcodebuild **BUILD SUCCEEDED**（plugin.cpp + plugin_impl.mm + Plugin.m 全部编译成功） | ✅ |

### TC-3.3: iOS 真机安装启动

```bash
cd ffiTest024
ace run -d 00008110-0015786E2EFA801E
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | "iOS installed." 输出 | ✅ |
| 2 | 日志无 `TypeError: Cannot read property info of undefined`（白屏根因） | ✅ |
| 3 | 日志无 crash/FATAL | ✅ |

> 注意：若 "application failed to launch" 错误为 `Locked`，需解锁 iOS 设备后重试。

---

## Phase 4: HAR 构建验证

> 目标：验证 `ace build plugin` 生成的 HAR 包格式和内容正确。
> 命令：所有三种类型统一使用 `ace build plugin`（无需 -t 或 --target）。

### TC-4.1: FFI HAR 构建

```bash
cd ffiTest024
ace build plugin
```

| # | 检查项 | 预期 | 验证命令 |
|---|--------|------|---------|
| 1 | 构建成功 | 成功 | 看输出 |
| 2 | HAR 文件存在 | `build/outputs/ffiTest024lib.har` | `ls build/outputs/*.har` |
| 3 | HAR 为 gzip 格式 | `gzip compressed data` | `file build/outputs/ffiTest024lib.har` |
| 4 | 解压后根目录含 `crossplatform-config.json5` | type = "ffi" | `tar -xzf xxx.har -C /tmp/har && cat /tmp/har/crossplatform-config.json5` |
| 5 | 解压后根目录含 `package/`（ohpm 内容） | 存在 | `ls /tmp/har/package/` |
| 6 | 解压后根目录含 `android/ffiTest024lib-release.aar` | 存在 | `ls /tmp/har/android/*.aar` |
| 7 | 解压后根目录含 `ios/` 目录 | 含 xcframework | `ls /tmp/har/ios/` |
| 8 | AAR 为 Zip 格式 | `Zip archive` | `file /tmp/har/android/*.aar` |
| 9 | **无 `._` 开头的 AppleDouble 文件** | 不存在 | `tar -xzf xxx.har -C /tmp/har; find /tmp/har -name '._*'` |

### TC-4.2: Plugin HAR 构建

```bash
cd pluginTest024
ace build plugin
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | 构建成功 | ✅ |
| 2 | HAR 含 `crossplatform-config.json5` type = "plugin" | ✅ |
| 3 | HAR 含 `android/pluginTest024lib-release.aar` | ✅ |
| 4 | HAR 含 `ios/` 含 xcframework | ✅ |
| 5 | AAR 含 `classes.jar`（含 Plugin JNI 类） | ✅ |
| 6 | 无 `._` AppleDouble 文件 | ✅ |

### TC-4.3: Package HAR 构建

```bash
cd packageTest024
ace build plugin
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | 构建成功 | ✅ |
| 2 | HAR 含 `crossplatform-config.json5` type = "package" | ✅ |
| 3 | **无** `android/` 目录 | ✅ |
| 4 | **无** `ios/` 目录 | ✅ |
| 5 | HAR 含 `package/` 纯 ArkTS 内容 | ✅ |

### HAR 格式验证命令

```bash
HAR_FILE="build/outputs/ffiTest024lib.har"
mkdir -p /tmp/har_check && rm -rf /tmp/har_check/*
tar -xzf "$HAR_FILE" -C /tmp/har_check
echo "=== 顶层结构 ===" && find /tmp/har_check -maxdepth 1 | sort
echo "=== config ===" && cat /tmp/har_check/crossplatform-config.json5
echo "=== android ===" && ls /tmp/har_check/android/ 2>/dev/null
echo "=== ios ===" && ls /tmp/har_check/ios/ 2>/dev/null
echo "=== package ===" && ls /tmp/har_check/package/ 2>/dev/null
echo "=== AppleDouble ===" && find /tmp/har_check -name '._*' 2>/dev/null
```

---

## Phase 5: HAR 安装验证

> 目标：验证 `ace install xxx.har` 在应用工程中正确安装 HAR 依赖。
> 前置：Phase 4 完成，有 3 个 HAR 文件可用。
> 应用工程：`MyApp024`（使用 `ace create` 创建的普通应用工程）。

### TC-5.1: FFI HAR 安装

```bash
cd MyApp024
ace install /Users/liulong/DevEcoStudioProjects/ffiTest024/build/outputs/ffiTest024lib.har
```

| # | 检查项 | 预期 | 验证命令 |
|---|--------|------|---------|
| 1 | 安装成功 | 成功 | 看输出 |
| 2 | `entry/oh_modules/ffiTest024lib/` 存在 | 存在 | `ls entry/oh_modules/ffiTest024lib/` |
| 3 | `entry/oh-package.json5` dependencies 含 `ffiTest024lib` | 存在 | `grep ffiTest024lib entry/oh-package.json5` |
| 4 | `.arkui-x/android/app/libs/ffiTest024lib-release.aar` 存在 | 存在 | `ls .arkui-x/android/app/libs/*.aar` |
| 5 | `.arkui-x/android/app/build.gradle` 含 `implementation files('libs/ffiTest024lib-release.aar')` | 在 ACE_PLUGIN 标记之间 | `grep -A2 ACE_PLUGIN .arkui-x/android/app/build.gradle` |

### TC-5.2: Plugin HAR 安装

```bash
cd MyApp024
ace install /Users/liulong/DevEcoStudioProjects/pluginTest024/build/outputs/pluginTest024lib.har
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | 安装成功 | ✅ |
| 2 | `entry/oh_modules/pluginTest024lib/` 存在 | ✅ |
| 3 | `.arkui-x/android/app/libs/pluginTest024lib-release.aar` 存在 | ✅ |
| 4 | build.gradle 含两个 implementation（不重复） | ✅ |

### TC-5.3: Package HAR 安装

```bash
cd MyApp024
ace install /Users/liulong/DevEcoStudioProjects/packageTest024/build/outputs/packageTest024lib.har
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | 安装成功 | ✅ |
| 2 | `entry/oh_modules/packageTest024lib/` 存在 | ✅ |
| 3 | `.arkui-x/android/app/libs/` 无 Package 的 AAR（纯 ArkTS 无原生产物） | ✅ |

### TC-5.4: 幂等安装

```bash
cd MyApp024
ace install /Users/liulong/DevEcoStudioProjects/ffiTest024/build/outputs/ffiTest024lib.har
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | 第二次安装同一 HAR 成功无报错 | ✅ |
| 2 | build.gradle 中 implementation 条目不重复 | ✅ |

---

## Phase 6: 应用集成编译运行验证

> 目标：验证安装了 HAR 的应用工程能编译运行。
> 前置：Phase 5 完成，MyApp024 已安装 3 个 HAR。
> 需要在 entry 中添加 HAR 接口调用代码（仅此阶段允许修改工程文件）。

### TC-6.1: 应用 Android 编译运行

```bash
cd MyApp024
ace build apk
timeout 90 ace run -d 36G0124116000430
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | `ace build apk` BUILD SUCCESSFUL | ✅ |
| 2 | APK 包含 AAR 中的 .so（FFI）和 classes（Plugin） | ✅ |
| 3 | `ace run` 应用启动无 crash | ✅ |
| 4 | 日志中可见 HAR 接口调用结果（如 `add(3,5) = 8`） | ✅ |

### TC-6.2: 应用 iOS 编译运行

```bash
cd MyApp024
ace run -d 00008110-0015786E2EFA801E
```

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | iOS 编译成功（app.xcodeproj 构建通过） | ✅ |
| 2 | iOS 安装成功 | ✅ |
| 3 | 应用启动无白屏（无 TypeError） | ✅ |
| 4 | 日志无 crash | ✅ |

---

## Phase 7: 异常场景验证

### TC-7.1: 错误命令

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | `ace install nonexistent.har` | 红色错误 "HAR file not found" |
| 2 | 非 ArkUI-X 目录执行 `ace install xxx.har` | 红色错误 |
| 3 | `ace build plugin`（在非三方件工程中） | 合适的错误提示 |

---

## 完整 E2E 自动化脚本

```bash
#!/bin/bash
set -e

export PATH=/Users/liulong/Library/ArkUI-X/Sdk/22/arkui-x/toolchains/bin:$PATH
export DEVECO_SDK_HOME=/Applications/DevEco-Studio.app/Contents/sdk
WORK_DIR="/Users/liulong/DevEcoStudioProjects"
N="024"
ANDROID_DEV="36G0124116000430"
IOS_DEV="00008110-0015786E2EFA801E"
XCFRAMEWORK_SRC="/Users/liulong/Library/ArkUI-X/Sdk/22/arkui-x/engine/xcframework/arkui/ios-release/libarkui_ios.xcframework"
PASS=0; FAIL=0

check() {
  local desc=$1; local cmd=$2; local expected=$3
  result=$(eval "$cmd" 2>&1) || true
  if echo "$result" | grep -q "$expected"; then
    echo "  ✅ $desc"
    PASS=$((PASS+1))
  else
    echo "  ❌ $desc (got: $(echo "$result" | head -1))"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================="
echo " Phase 1: 创建工程"
echo "============================================="
for type in ffi plugin package; do
  name="${type}Test${N}"
  rm -rf "${WORK_DIR}/${name}"
  expect -c "set timeout 30; spawn ace create ${WORK_DIR}/${name} -t ${type}; expect \"project name\" { send \"\r\" }; expect \"bundleName\" { send \"\r\" }; expect \"runtimeOS\" { send \"2\r\" }; expect \"Compile\" { send \"4\r\" }; expect \"platform\" { send \"\r\" }; expect \"Native Manual\" { send \"1\r\" }; expect eof" 2>&1 | strings | grep -q "created" && echo "  ✅ ${name} 创建成功" || echo "  ❌ ${name} 创建失败"
done

# 创建应用工程
rm -rf "${WORK_DIR}/MyApp${N}"
expect -c "set timeout 30; spawn ace create ${WORK_DIR}/MyApp${N}; expect \"project name\" { send \"\r\" }; expect \"bundleName\" { send \"\r\" }; expect \"runtimeOS\" { send \"2\r\" }; expect \"Compile\" { send \"4\r\" }; expect \"platform\" { send \"\r\" }; expect \"Native Manual\" { send \"1\r\" }; expect eof" 2>&1 | strings | grep -q "created" && echo "  ✅ MyApp${N} 创建成功" || echo "  ❌ MyApp${N} 创建失败"

echo ""
echo "============================================="
echo " Phase 2: 工程结构验证"
echo "============================================="
DIR="${WORK_DIR}/ffiTest${N}"
check "FFI lib 目录" "ls ${DIR}/ffiTest${N}lib/src/main/cpp/hello.cpp" "hello.cpp"
check "FFI crossplatform-config type=ffi" "cat ${DIR}/.arkui-x/crossplatform-config.json5" "ffi"
check "FFI app.xcodeproj 含 hello.cpp" "grep hello.cpp ${DIR}/.arkui-x/ios/app.xcodeproj/project.pbxproj" "hello.cpp"
check "FFI app.xcodeproj 含 USER_HEADER_SEARCH_PATHS (2处)" "grep -c USER_HEADER_SEARCH_PATHS ${DIR}/.arkui-x/ios/app.xcodeproj/project.pbxproj" "2"

DIR="${WORK_DIR}/pluginTest${N}"
check "Plugin plugin.cpp" "ls ${DIR}/pluginTest${N}lib/src/main/cpp/plugin.cpp" "plugin.cpp"
check "Plugin bridge plugin_impl.mm" "ls ${DIR}/.arkui-x/ios/plugintest${N}lib/plugin_impl.mm" "plugin_impl.mm"
check "Plugin app.xcodeproj 含 plugin.cpp" "grep plugin.cpp ${DIR}/.arkui-x/ios/app.xcodeproj/project.pbxproj" "plugin.cpp"
check "Plugin app.xcodeproj 含 IOS_PLATFORM" "grep IOS_PLATFORM ${DIR}/.arkui-x/ios/app.xcodeproj/project.pbxproj" "IOS_PLATFORM"
check "Plugin crossplatform-config type=plugin" "cat ${DIR}/.arkui-x/crossplatform-config.json5" "plugin"

DIR="${WORK_DIR}/packageTest${N}"
check "Package lib 存在" "ls ${DIR}/packageTest${N}lib/Index.ets" "Index"
check "Package 无 cpp 目录" "ls ${DIR}/packageTest${N}lib/src/main/cpp 2>&1" "No such"

echo ""
echo "============================================="
echo " Phase 3: Android 编译运行"
echo "============================================="
for type in ffi plugin package; do
  name="${type}Test${N}"
  cd "${WORK_DIR}/${name}"
  result=$(ace build apk 2>&1 | tail -5)
  if echo "$result" | grep -q "BUILD SUCCESSFUL\|built successfully"; then
    echo "  ✅ ${name} APK 编译成功"
    PASS=$((PASS+1))
  else
    echo "  ❌ ${name} APK 编译失败: $(echo "$result" | tail -1)"
    FAIL=$((FAIL+1))
  fi

  run_result=$(timeout 90 ace run -d ${ANDROID_DEV} 2>&1 | tail -5)
  if echo "$run_result" | grep -qiE "FATAL|crash|Error.*died"; then
    echo "  ❌ ${name} Android 运行 crash"
    FAIL=$((FAIL+1))
  else
    echo "  ✅ ${name} Android 运行正常"
    PASS=$((PASS+1))
  fi
done

echo ""
echo "============================================="
echo " Phase 4: iOS 编译验证"
echo "============================================="
for type in ffi plugin; do
  name="${type}Test${N}"
  ios_dir="${WORK_DIR}/${name}/.arkui-x/ios"
  if [ -d "$ios_dir" ]; then
    ditto "$XCFRAMEWORK_SRC" "${ios_dir}/frameworks/libarkui_ios.xcframework" 2>/dev/null
    build_result=$(cd "$ios_dir" && xcodebuild -project app.xcodeproj -scheme app -configuration Release -destination 'generic/platform=iOS' BUILD_LIBRARY_FOR_DISTRIBUTION=YES 2>&1 | tail -3)
    if echo "$build_result" | grep -q "BUILD SUCCEEDED"; then
      echo "  ✅ ${name} iOS xcodebuild 编译成功"
      PASS=$((PASS+1))
    else
      echo "  ❌ ${name} iOS 编译失败: $(echo "$build_result" | tail -1)"
      FAIL=$((FAIL+1))
    fi
  fi
done

echo ""
echo "============================================="
echo " Phase 5: HAR 构建"
echo "============================================="
for type in ffi plugin package; do
  name="${type}Test${N}"
  cd "${WORK_DIR}/${name}"
  ace build plugin 2>&1 | tail -3
  har_file=$(ls build/outputs/*.har 2>/dev/null | head -1)
  if [ -n "$har_file" ]; then
    echo "  ✅ ${name} HAR 构建成功: $(basename $har_file)"
    PASS=$((PASS+1))
    # 格式检查
    mkdir -p /tmp/har_check && rm -rf /tmp/har_check/*
    tar -xzf "$har_file" -C /tmp/har_check
    check "HAR 含 crossplatform-config.json5" "ls /tmp/har_check/crossplatform-config.json5" "crossplatform"
    check "HAR 含 package/ 目录" "ls /tmp/har_check/package" ""
    check "HAR 无 ._ AppleDouble 文件" "find /tmp/har_check -name '._*'" ""
  else
    echo "  ❌ ${name} HAR 构建失败"
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo "============================================="
echo " Phase 6: HAR 安装"
echo "============================================="
cd "${WORK_DIR}/MyApp${N}"
ditto "$XCFRAMEWORK_SRC" "${WORK_DIR}/MyApp${N}/.arkui-x/ios/frameworks/libarkui_ios.xcframework" 2>/dev/null

for type in ffi plugin package; do
  name="${type}Test${N}"
  har_file="${WORK_DIR}/${name}/build/outputs/$(ls ${WORK_DIR}/${name}/build/outputs/*.har 2>/dev/null | head -1 | xargs basename 2>/dev/null)"
  if [ -n "$har_file" ] && [ -f "$har_file" ]; then
    ace install "$har_file" 2>&1 | tail -3
    echo "  ✅ ${name} HAR 安装完成"
    PASS=$((PASS+1))
  else
    echo "  ❌ ${name} HAR 文件不存在，跳过安装"
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo "============================================="
echo " Phase 7: 应用编译运行"
echo "============================================="
cd "${WORK_DIR}/MyApp${N}"
result=$(ace build apk 2>&1 | tail -5)
if echo "$result" | grep -q "BUILD SUCCESSFUL\|built successfully"; then
  echo "  ✅ MyApp APK 编译成功"
  PASS=$((PASS+1))
else
  echo "  ❌ MyApp APK 编译失败"
  FAIL=$((FAIL+1))
fi

run_result=$(timeout 90 ace run -d ${ANDROID_DEV} 2>&1 | tail -5)
if echo "$run_result" | grep -qiE "FATAL|crash|Error.*died"; then
  echo "  ❌ MyApp Android 运行 crash"
  FAIL=$((FAIL+1))
else
  echo "  ✅ MyApp Android 运行正常"
  PASS=$((PASS+1))
fi

echo ""
echo "============================================="
echo " 结果汇总"
echo "============================================="
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo "  TOTAL: $((PASS+FAIL))"
echo "============================================="
```

---

## 测试通过标准

1. **Phase 1-3**：工程创建、结构验证、Android/iOS 编译运行全部通过
2. **Phase 4**：HAR 构建成功，格式符合设计规范（package/ + crossplatform-config.json5 + android/ + ios/，无 ._ 文件）
3. **Phase 5**：HAR 安装成功，oh_modules + AAR + build.gradle 正确
4. **Phase 6**：应用集成后编译运行成功
5. **全程**：无 crash、无 TypeError、无白屏
