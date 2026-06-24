# 跨平台三方件源码依赖模式设计

## 概述

在现有产物模式（AAR + xcframework）基础上，新增源码依赖模式。开发者通过 `ace build plugin --source` 打包源码 HAR，`ace install` 时以 Gradle module / Xcode subproject 形式集成到目标工程，与目标工程一起编译。

## 背景

### 当前产物模式流程

```
ace build plugin → 编译 AAR + xcframework → 打包 HAR
ace install xxx.har → 复制 AAR/xcframework → 修改 build.gradle/project.pbxproj
```

### 源码模式目标

```
ace build plugin --source → 跳过编译 → 打包源码到 HAR
ace install xxx.har → 复制源码 → Gradle module include / Xcode subproject
```

### Flutter 参考

Flutter 的 `GeneratedPluginRegistrant` 自动注册机制为后续阶段的插件自动注册提供了参考，但本阶段仅实现源码依赖模式，不涉及自动注册代码生成。

## 设计

### 命令接口

```
# 产物模式（现有，不变）
ace build plugin                    → HAR 含 AAR + xcframework

# 源码模式（新增）
ace build plugin --source           → HAR 含源码工程（无 AAR/xcframework）
```

`--source` flag 传递到 compiler 和 packager，跳过 Android/iOS 编译步骤，直接将源码工程打包进 HAR。

### HAR 包格式对比

```
产物模式 HAR:                          源码模式 HAR:
├── package/                           ├── package/          (不变)
│   ├── Index.ets                      │   ├── Index.ets
│   ├── src/main/ets/Index.ets         │   ├── src/main/ets/Index.ets
│   └── oh-package.json5               │   └── oh-package.json5
├── crossplatform-config.json5         ├── crossplatform-config.json5
├── android/                           ├── android/
│   └── ffiTest030lib-release.aar      │   ├── build.gradle       (源码)
├── ios/                               │   ├── src/main/java/...   (源码)
│   └── ffiTest030lib.xcframework      │   ├── src/main/cpp/...    (源码)
                                       │   └── CMakeLists.txt
                                       ├── ios/
                                       │   ├── ffiTest030lib.xcodeproj
                                       │   ├── ffiTest030lib.h
                                       │   ├── ffiTest030lib.m
                                       │   └── plugin_impl.mm
                                       └── (无 AAR, 无 xcframework)
```

### crossplatform-config.json5 格式

```json5
// 产物模式
{
  name: 'ffiTest030lib',
  version: '1.0.0',
  type: 'ffi',
  buildMode: 'artifact',           // 新增，默认值
  platform: ['android', 'iOS'],
  compatibleSdkVersion: '6.0.2(22)',
  android: {
    path: 'android',
    module: 'ffiTest030lib',
    artifact: 'ffiTest030lib-release.aar',
  },
  ios: {
    path: 'ios',
    module: 'ffiTest030lib',
    frameworks: [],
  },
}

// 源码模式
{
  name: 'ffiTest030lib',
  version: '1.0.0',
  type: 'ffi',
  buildMode: 'source',            // 新增
  platform: ['android', 'iOS'],
  compatibleSdkVersion: '6.0.2(22)',
  android: {
    path: 'android',
    module: 'ffiTest030lib',
    sourcePath: 'android',         // 源码目录路径
  },
  ios: {
    path: 'ios',
    module: 'ffiTest030lib',
    sourcePath: 'ios',             // 源码目录路径
  },
}
```

Package 类型不受 `buildMode` 影响（纯 ArkTS，无 android/ios 目录）。

### Build 流程

#### `ace build plugin --source` 的 packager 逻辑

1. **HarmonyOS 编译**: 仍然执行 `hvigorw assembleHar`，因为 HarmonyOS 层始终需要编译产物放入 `package/`
2. **Android**: 跳过 `buildAndroidAAR()` — 直接将 `.arkui-x/android/{moduleName}/` 目录复制到 HAR 的 `android/`
3. **iOS**: 跳过 `buildIOSXcFramework()` — 直接将 `.arkui-x/ios/{moduleName}.xcodeproj` + 源码文件复制到 HAR 的 `ios/`
4. **crossplatform-config.json5**: 写入 `buildMode: 'source'`
5. **engine .so 复制**: 跳过（源码模式下不需要预先复制 engine .so 到 app/libs/，因为编译时由 Gradle/CMake 处理）

#### 源码打包内容

Android 目录包含完整的 Android library module 源码：
```
android/
├── build.gradle              (com.android.library 插件)
├── src/main/
│   ├── AndroidManifest.xml
│   ├── java/com/example/.../ModulePlugin.java   (Plugin 类型)
│   └── cpp/                    (FFI 类型)
│       ├── CMakeLists.txt
│       ├── hello.cpp           (FFI 类型)
│       └── plugin_impl.cpp     (Plugin 类型)
└── consumerProguardFiles
```

iOS 目录包含完整的 Xcode 工程源码：
```
ios/
├── ffiTest030lib.xcodeproj/    (Xcode 工程文件)
├── ffiTest030lib.h             (Framework 头文件)
├── ffiTest030lib.m             (Framework 实现)
├── ModulePlugin.h              (Plugin 类型)
├── ModulePlugin.m              (Plugin 类型)
└── plugin_impl.mm              (Plugin 类型 ObjC++)
```

### Install 流程

#### 概述

`ace install xxx.har` 读取 `crossplatform-config.json5` 的 `buildMode` 字段决定集成方式：

- `buildMode: 'artifact'` 或无 `buildMode` → 走现有产物模式逻辑
- `buildMode: 'source'` → 走新的源码模式逻辑

#### Android 源码集成

```
1. 复制源码目录 → .arkui-x/plugins/{moduleName}/android/
2. settings.gradle 加 include ':{moduleName}' 并指向 plugins 目录
3. app/build.gradle 加 implementation project(':{moduleName}')
4. 使用 ACE_PLUGIN 标记实现幂等
```

**settings.gradle 修改**:
```groovy
// ACE_PLUGIN:AUTO_GENERATED
include ':ffiTest030lib'
project(':ffiTest030lib').projectDir = new File('../.arkui-x/plugins/ffiTest030lib/android')
// ACE_PLUGIN:END
```

**app/build.gradle 修改**:
```groovy
dependencies {
    // ACE_PLUGIN:AUTO_GENERATED
    implementation project(':ffiTest030lib')
    // ACE_PLUGIN:END
}
```

#### iOS 源码集成

```
1. 复制源码目录 → .arkui-x/plugins/{moduleName}/ios/
2. project.pbxproj 添加 Xcode subproject 引用
3. 将 subproject 的源文件加入 app target 的 Compile Sources
4. 设置 framework search path（如果源码工程有依赖）
```

project.pbxproj 修改使用现有 `adjustPbxproj4Framework` 模块的基础设施，添加 subproject group + file reference + build phase 配置。

#### HarmonyOS

不变。两种模式都是 `ohpm install` 从 `package/` 目录解析源码依赖。

### 幂等性

与产物模式一致，使用 `ACE_PLUGIN:AUTO_GENERATED` / `ACE_PLUGIN:END` 标记：

- **settings.gradle**: 标记块内 include 行
- **app/build.gradle**: 标记块内 implementation project 行
- **project.pbxproj**: 标记块内 subproject 引用

重复 install 同一 HAR 时，先清除标记块内旧内容，再写入新内容。

### 卸载（未来）

源码模式卸载时需要：
1. 删除 `.arkui-x/plugins/{moduleName}/` 目录
2. 从 settings.gradle 移除 include 行
3. 从 app/build.gradle 移除 implementation project 行
4. 从 project.pbxproj 移除 subproject 引用

本阶段不实现卸载功能。

## 涉及的文件修改

| 文件 | 修改内容 |
|------|---------|
| `ace-build/index.js` | 解析 `--source` flag，传递给 compiler/packager |
| `ace-plugin-packager.js` | `--source` 时跳过 AAR/xcframework 编译，改为复制源码目录；写 `buildMode: 'source'` 到 config |
| `har-utils.js` | `validateConfig` 增加 `buildMode` 字段校验 |
| `plugin-installer.js` | 读取 `buildMode`，源码模式走 `installAndroidSource()` / `installIOSSource()` |
| `plugin-installer.js` | 新增 `installAndroidSource()`: 复制源码 + 修改 settings.gradle + 修改 app/build.gradle |
| `plugin-installer.js` | 新增 `installIOSSource()`: 复制源码 + 修改 project.pbxproj 添加 subproject |

## 边界情况

| 场景 | 处理 |
|------|------|
| Package 类型 + `--source` | 忽略，Package 无 android/ios，不受影响 |
| FFI + `--source` | 正常工作，android/ 含 CMakeLists.txt + C++ 源码 |
| Plugin + `--source` | 正常工作，android/ 含 JNI 源码，ios/ 含 ObjC 源码 |
| 混合安装（产物 HAR + 源码 HAR） | 支持，各自按 buildMode 独立处理 |
| 源码模式 iOS 非 macOS | 跳过 iOS 集成（与产物模式一致） |
| 源码模式无 `--source` flag | `buildMode` 默认为 `'artifact'`，走产物模式逻辑 |

## 验证策略

1. **单元验证**: `ace build plugin --source` 生成的 HAR 结构正确（无 AAR/xcframework，有源码目录）
2. **Android 集成验证**: `ace install` 后 settings.gradle 含 include，app/build.gradle 含 implementation project
3. **iOS 集成验证**: `ace install` 后 project.pbxproj 含 subproject 引用
4. **编译验证**: MyApp Android APK + iOS APP 编译成功（源码与目标工程一起编译）
5. **运行验证**: Android 真机 + iOS 真机运行无 crash，接口调用正确
6. **幂等验证**: 重复 install 同一 HAR 不产生重复配置
7. **混合验证**: 同一 MyApp 安装产物模式 HAR + 源码模式 HAR，两者共存无冲突

## 后续规划

本阶段实现源码依赖模式后，后续可在此基础上增加插件自动注册代码生成（类似 Flutter GeneratedPluginRegistrant）：
- `ace install` 时根据已安装插件列表生成注册代码
- Android: `GeneratedPluginRegistrant.java`，在各平台入口类中注册
- iOS: `GeneratedPluginRegistrant.h/.m`，在 AppDelegate 中调用
- HarmonyOS: ArkTS 层自动注册（已有 NAPI auto_path 机制）
