# ArkUI-X 跨平台三方件格式设计

> **日期**: 2026-06-03
> **状态**: Design Review (v3 — 实现完成，文档补全)
> **参考**: `jackfruit/jackfruit/CrossPlatformPlugin/ArkUI-X三方件形态设计-基于Flutter分析.md`

## 1. 概述

设计 ArkUI-X 跨平台三方件的统一格式，支持三种形态的插件通过 HAR 包分发，覆盖 HarmonyOS、Android、iOS 三端。

### 1.1 三种插件形态

| 形态 | type字段 | 原生代码形式 | 适用场景 | Flutter对应 |
|---|---|---|---|---|
| **Package** | `"package"` | 无，纯ArkTS | UI组件库、工具函数库 | Dart Package |
| **FFI** | `"ffi"` | 预编译C++（AAR + xcframework） | MQTT、加密、图像处理等C库 | Package FFI |
| **Plugin** | `"plugin"` | 预编译C++ & Java/Kotlin（AAR + xcframework） | 蓝牙、相机、传感器等平台API | Plugin |

### 1.2 设计原则

1. **ohpm向后兼容**: `package/` 目录放ohpm标准内容，ohpm不感知跨平台扩展
2. **统一分发渠道**: 三种形态统一通过 `ohpm publish` 发布
3. **幂等安装**: 重复 `ace install` 不重复添加，使用标记注释
4. **CLI单一入口**: `ace build plugin` / `ace install xxx.har` 统一处理三端
5. **Android统一AAR**: FFI和Plugin的Android产物统一为AAR格式，安装流程一致
6. **Windows兼容**: 所有文件操作使用纯JS npm包（tar/adm-zip），无shell命令依赖

### 1.3 涉及的CLI命令

| 命令 | 作用 | 状态 |
|---|---|---|
| `ace create <dir> -t <ffi\|plugin\|package>` | 创建跨平台工程模板 | 已实现 |
| `ace build plugin` | 编译跨平台三方件HAR（自动发现模块名，无需--target） | 已实现 |
| `ace install <name>.har` | 安装三方件到工程 | 已实现（与设备安装共存） |
| `ace build apk/ios` | 构建宿主应用 | 已有，集成插件产物 |

### 1.4 完整生命周期

```
┌─ 开发阶段 ─────────────────────────────────────────────┐
│  开发者在DevEco Studio开发HarmonyOS模块                  │
│  编写ArkTS API + C++ Native + Bridge                   │
│  编写Android Java/Kotlin + CMake（Plugin/FFI）         │
│  编写iOS ObjC/C++ + 构建脚本（Plugin/FFI）              │
├─ 创建阶段 ─────────────────────────────────────────────┤
│  ace create <dir> -t <ffi|plugin|package>               │
│  自动生成工程模板 + crossplatform-config.json5          │
├─ 编译阶段 ─────────────────────────────────────────────┤
│  ace build plugin                   # 自动发现模块名     │
│  Phase 1: Hvigor → HAR                                 │
│  Phase 2: Gradle assembleRelease → AAR (Android)       │
│  Phase 3: xcodebuild → xcframework (iOS, macOS only)   │
│  Phase 4: 嵌入HAR                                       │
├─ 分发阶段 ─────────────────────────────────────────────┤
│  ohpm publish <module>.har                              │
├─ 安装阶段 ─────────────────────────────────────────────┤
│  ace install <name>.har                                 │
│  oh_modules/ + AAR + xcframework + Gradle注册           │
├─ 构建运行 ─────────────────────────────────────────────┤
│  ace build apk / ace build ios                          │
│  .abc + AAR(解压.so+classes) + xcframework → APK/APP   │
└────────────────────────────────────────────────────────┘
```

---

## 2. HAR包格式

### 2.1 `package/`同级目录结构

HAR包（gzip tar）内部结构：

```
<module>.har
├── package/                        # ohpm标准内容（ohpm install只处理此目录）
│   ├── Index.ets                   # 导出入口
│   ├── oh-package.json5            # ohpm依赖声明
│   ├── module.json5                # 模块配置
│   ├── ResourceTable.txt           # 资源表
│   ├── src/main/ets/               # ArkTS源码
│   └── META-INF/
│       └── MANIFEST.MF
├── crossplatform-config.json5      # 插件元数据（package/同级）
├── android/                        # Android产物（FFI/Plugin，package/同级）
│   └── <module>-release.aar        # 预编译AAR（含classes.jar + jni/{abi}/*.so）
└── ios/                            # iOS产物（FFI/Plugin，package/同级）
    └── <Module>.xcframework/       # 预编译xcframework
```

### 2.2 各形态的HAR内容差异

| 内容 | Package | FFI | Plugin |
|---|---|---|---|
| `package/`（ohpm标准） | ✅ | ✅ | ✅ |
| `crossplatform-config.json5` | ✅ | ✅ | ✅ |
| `android/<module>-release.aar` | — | ✅ | ✅ |
| `ios/*.xcframework` | — | ✅ | ✅ |

### 2.3 为什么Android统一用AAR

| 维度 | 裸 `.so` (旧FFI方案) | 源码Module (旧Plugin方案) | AAR (统一方案) |
|---|---|---|---|
| **安装复杂度** | 手动复制到 `app/libs/{abi}/` | 整个目录 + settings.gradle + build.gradle | 复制到 `app/libs/` + 1行implementation |
| **AGP版本兼容** | 否 | **是** (build.gradle中AGP API可能不兼容) | 否 (二进制稳定) |
| **Java/Kotlin代码** | 无 | 源码（宿主编译） | 编译好的classes.jar |
| **.so内嵌** | 手动按ABI目录组织 | 宿主Gradle编译C++ | AAR标准jni/目录（Gradle自动提取） |
| **构建依赖** | 无 | 需NDK + CMake | 无 |
| **大小** | 最小 | 最大（含完整源码） | 略大（含classes.jar） |
| **可调试Java** | 不可 | 可 | 不可 |

**关键决策理由**:
- AAR是Android标准的二进制分发格式，Gradle原生支持
- FFI和Plugin安装流程完全统一，降低CLI复杂度
- 复用现有 `ace build aar` 能力（`gradlew :<module>:assembleRelease`）
- 消除AGP版本兼容性问题（源码方案中build.gradle的AGP API随版本变化）

### 2.4 关键规则

- AAR内`.so`排除 `libarkui_android.so`（引擎库，由SDK提供，约89MB，使用adm-zip移除）
- ArkTS代码只在HAR的`package/`内，`android/`和`ios/`目录不含任何.ets文件
- 所有平台的接口签名必须一致（由`index.d.ts`统一定义）
- AAR文件名格式：`<module>-release.aar`，与`android.module`字段对应
- Plugin的AAR包含编译好的Java/Kotlin classes.jar，`pluginClass`通过反射加载不受影响

---

## 3. `crossplatform-config.json5` Schema

### 3.1 通用字段（三种形态共用）

```json5
{
  "name": "my-plugin",              // 必填，与oh-package.json5的name一致
  "version": "1.0.0",               // 必填，语义化版本，与oh-package.json5一致
  "type": "plugin",                 // 必填：package | ffi | plugin
  "platform": ["android", "iOS"],   // 可选，默认 ["android", "iOS"]
  "compatibleSdkVersion": "6.0.0(20)", // 可选，SDK兼容性校验
  "description": "..."              // 可选，插件描述
}
```

### 3.2 Android平台字段（`android`对象）

| 字段 | 类型 | 适用类型 | 必填 | 说明 |
|---|---|---|---|---|
| `path` | string | FFI/Plugin | 是 | Android文件目录（相对HAR根），默认`"android"` |
| `module` | string | FFI/Plugin | 是 | Gradle项目名（与AAR文件名和.so库名对应） |
| `artifact` | string | FFI/Plugin | 否 | AAR文件名，如 `"mymodule-release.aar"`。默认 `<module>-release.aar` |
| `pluginClass` | string | Plugin | 否 | 插件入口类名（全限定名），宿主应用通过反射实例化。FFI类型无Java层，留空 |

### 3.3 iOS平台字段（`ios`对象）

| 字段 | 类型 | 适用类型 | 必填 | 说明 |
|---|---|---|---|---|
| `path` | string | FFI/Plugin | 是 | iOS文件目录（相对HAR根），默认`"ios"` |
| `module` | string | FFI/Plugin | 是 | Xcode framework target名 |
| `frameworks` | string[] | FFI/Plugin | 否 | 预编译xcframework列表 |
| `pluginClass` | string | Plugin | 否 | iOS插件入口类名 |

### 3.4 示例

**Package（最简）**:
```json5
{
  "name": "my-package",
  "version": "1.0.0",
  "type": "package"
}
```

**FFI**:
```json5
{
  "name": "mymodule",
  "version": "1.0.0",
  "type": "ffi",
  "compatibleSdkVersion": "6.0.0(20)",
  "android": {
    "path": "android",
    "module": "mymodule",
    "artifact": "mymodule-release.aar"
  },
  "ios": {
    "path": "ios",
    "module": "mymodule",
    "frameworks": ["MyModule.xcframework"]
  }
}
```

**Plugin**:
```json5
{
  "name": "avsession",
  "version": "1.0.0",
  "type": "plugin",
  "compatibleSdkVersion": "6.0.0(20)",
  "android": {
    "path": "android",
    "module": "avsession",
    "artifact": "avsession-release.aar",
    "pluginClass": "com.ohos.ace.plugin.avsession.AVSessionPlugin"
  },
  "ios": {
    "path": "ios",
    "module": "avsession",
    "pluginClass": "AVSessionPlugin",
    "frameworks": ["AVSession.xcframework"]
  }
}
```

---

## 4. `ace create` — 工程创建

### 4.1 命令接口

```bash
ace create <outputDir> -t <ffi|plugin|package>
```

`-t` 指定模板类型，不带 `-t` 创建普通应用工程。

### 4.2 交互式提示

创建过程中依次提示（使用 inquirer）：

| 提示 | 默认值 | 示例输入 |
|------|--------|---------|
| 1. 项目名 | 目录名 | `\r`（接受默认） |
| 2. bundleName | `com.example.{name}` | `\r` |
| 3. runtimeOS | HarmonyOS | `2` |
| 4. Compile SDK | 列表选择 | `4`（对应SDK 13） |
| 5. 平台 | Default(Android, iOS) | `1` |
| 6. Framework集成方式 | Native Manual | `1` |

自动化创建用 `expect` 脚本处理交互。

### 4.3 工程模板结构

#### Package开发工程

```
my-package/
├── AppScope/
├── entry/                           # 测试/示例
├── my-package/                      # ArkTS业务逻辑
│   ├── Index.ets
│   ├── src/main/ets/
│   └── oh-package.json5
├── .arkui-x/
│   ├── crossplatform-config.json5   # type: "package"
│   ├── android/
│   └── ios/
├── build-profile.json5
└── oh-package.json5
```

#### FFI开发工程

```
mymodule/
├── AppScope/
├── entry/
├── mymodule/                        # ArkTS接口 + C++源码
│   ├── Index.ets
│   ├── src/main/
│   │   ├── ets/MyModule.ets         # ArkTS接口层
│   │   └── cpp/                     # C++源码（HarmonyOS侧编译）
│   │       ├── CMakeLists.txt
│   │       ├── napi_init.cpp
│   │       └── mymodule_core.cpp
│   └── oh-package.json5
├── .arkui-x/
│   ├── crossplatform-config.json5   # type: "ffi"
│   ├── android/
│   │   ├── app/
│   │   └── mymodule/                # Android库模块
│   │       ├── build.gradle         # CMake配置
│   │       └── src/main/cpp/        # C++源码（复用OHOS侧）
│   └── ios/
│       ├── app/                           # iOS App target
│       ├── app.xcodeproj/                 # App 工程文件
│       ├── {moduleName}lib/              # FFI 框架 target（静态库）
│       │   └── {moduleName}lib.h         # 框架头文件
│       ├── {moduleName}lib.xcodeproj/    # 框架工程文件
│       ├── frameworks/                   # 引擎框架目录（buildPluginHAR 时复制 libarkui_ios.xcframework）
│       ├── arkui-x/                      # ArkTS 产物目录
│       └── buildArkTS.sh                 # ArkTS 编译脚本
├── build-profile.json5
└── oh-package.json5
```

#### Plugin开发工程

```
avsession/
├── AppScope/
├── entry/
├── avsession/                       # ArkTS接口 + C++桥接
│   ├── Index.ets
│   ├── src/main/
│   │   ├── ets/AVSession.ets
│   │   └── cpp/                     # C++桥接层（NAPI + 平台抽象）
│   │       ├── CMakeLists.txt
│   │       ├── napi_init.cpp
│   │       └── avsession_interface.h
│   └── oh-package.json5
├── .arkui-x/
│   ├── crossplatform-config.json5   # type: "plugin"
│   ├── android/
│   │   ├── app/
│   │   └── avsession/               # Android库模块
│   │       ├── build.gradle         # CMake + Java编译配置
│   │       └── src/main/
│   │           ├── java/            # Java平台实现
│   │           └── cpp/             # Android C++实现
│   └── ios/
│       ├── app/                           # iOS App target
│       ├── app.xcodeproj/                 # App 工程文件
│       ├── {moduleName}lib/              # Plugin 框架 target（静态库）
│       │   ├── {moduleName}lib.h         # 框架头文件
│       │   ├── {ModuleName}Plugin.h/.m   # iOS 插件入口类
│       │   └── plugin_impl.mm            # 插件实现（ObjC++，含 C++ 桥接）
│       ├── {moduleName}lib.xcodeproj/    # 框架工程文件
│       ├── frameworks/                   # 引擎框架目录（buildPluginHAR 时复制 libarkui_ios.xcframework）
│       ├── arkui-x/                      # ArkTS 产物目录
│       └── buildArkTS.sh                 # ArkTS 编译脚本
├── build-profile.json5
└── oh-package.json5
```

**注意**: 开发工程中`.arkui-x/android/<module>/`仍然是完整的Gradle Library Module（源码），`ace build plugin`时编译为AAR产物嵌入HAR。开发-编译-分发的分离是关键。

### 4.4 `setupCrossplatformModule()` 执行步骤

`ace-create/project/index.js` 中的 `setupCrossplatformModule()` 函数完成跨平台模块初始化：

```
setupCrossplatformModule(templatePath, projectTempPath, project, template, sdkVersion)
│
├─ 1. 复制HAR lib模块模板
│   templates/crossplatform/{template}/lib/ → {projectDir}/{moduleName}/
│
├─ 2. 复制平台模板（按 platforms 过滤）
│   platforms='android'           → 仅复制 android/ 模板
│   platforms='ios'               → 仅复制 ios/ 模板
│   platforms='both' (Default)    → 复制 android/ + ios/ 模板
│   templates/crossplatform/{template}/android/ → .arkui-x/android/{moduleName}/
│   templates/crossplatform/{template}/ios/     → .arkui-x/ios/
│
├─ 3. 替换entry Index.ets为模板测试页面
│   templates/crossplatform/{template}/entry/.../Index.ets → entry/src/main/ets/pages/Index.ets
│
├─ 4. 注册HAR模块到build-profile.json5
│   addModuleToBuildProfile(): 在modules数组中添加 {name, srcPath, targets}
│
├─ 5. 注册file:依赖到根oh-package.json5
│   "dependencies": { "{moduleName}": "file:./{moduleName}" }
│
├─ 6. 创建settings-plugin.gradle
│   .arkui-x/android/settings-plugin.gradle:
│   include ':app' + include ':{moduleName}'
│
├─ 7. 占位符替换
│   replacePlaceholdersInDir(): module_name → {moduleName}, Module_name → {PascalName}
│   覆盖lib模块、Android平台目录、iOS平台目录
│
├─ 8. 注册Native源文件到app.xcodeproj（FFI/Plugin，platforms !== 'android'时执行）
│   registerNativeFilesInPbxproj(): 添加.cpp/.mm/.m文件到Compile Sources
│   android单平台时跳过（无iOS工程，无需注册）
│
└─ 9. 生成crossplatform-config.json5（按 platforms 过滤）
    .arkui-x/crossplatform-config.json5:
    {
      name: moduleName,
      version: '1.0.0',
      type: template,
      platform: platList,           // android → ['android'], ios → ['iOS'], both (Default) → ['android','iOS']
      compatibleSdkVersion: getCompileSdkVersionWithSdkVersion(sdkVersion),
      android: { path, module, artifact },  // 仅 platforms含android 时写入
      ios: { path, module, frameworks: [] }  // 仅 platforms含ios 时写入
    }
```

### 4.5 占位符替换规则

`replacePlaceholdersInDir()` 处理三种占位符：

| 占位符 | 替换为 | 示例 |
|--------|--------|------|
| `module_name_lower` | 全小写 | `ffitest01lib` |
| `module_name` | 原样 | `ffiTest01lib` |
| `Module_name` | PascalCase | `FfiTest01lib` |

### 4.6 SDK版本处理

创建时 `modifyHarmonyOSConfig(projectTempPath, 'entry', sdkVersion)` 设置项目级配置：

| 文件 | 设置字段 | 示例值（SDK 13） |
|------|---------|-----------------|
| `oh-package.json5` | `modelVersion` | `5.0.1` |
| `hvigor/hvigor-config.json5` | `modelVersion` | `5.0.1` |
| `build-profile.json5` | `compileSdkVersion` | `5.0.1(13)` |
| `build-profile.json5` | `compatibleSdkVersion` | `5.0.1(13)` |

SDK版本映射表见 `util/index.js` 的 `getSdkVersionMap()`，如 SDK 13 → modelVersion `5.0.1`，SDK 22 → modelVersion `6.0.2`。

### 4.7 iOS签名

创建时自动检测Apple Developer证书：

```
Signing iOS app for device deployment using developer identity: "Apple Development: xxx@xxx.com (XXXXXXXXXX)"
```

写入 `project.pbxproj` 的 `CODE_SIGN_IDENTITY` 和 `DEVELOPMENT_TEAM`。

### 4.8 模块名规则

| 工程类型 | 模块名 | 示例 |
|---------|--------|------|
| FFI | `{projectName}lib` | ffiTest01 → ffiTest01lib |
| Plugin | `{projectName}lib` | pluginTest01 → pluginTest01lib |
| Package | `{projectName}lib` | packageTest01 → packageTest01lib |
| 应用 | `entry` | MyApp01 → entry |

---

## 5. `ace build plugin` — 编译流水线

### 5.1 命令设计

```bash
ace build plugin    # 自动发现模块名，无需 --target
```

模块名通过 `discoverHarModule()` 自动发现，不支持 `--target` 参数。

### 5.2 模块自动发现

`discoverHarModule()` 三策略（优先级递减）：

| 策略 | 数据源 | 适用场景 |
|------|--------|---------|
| 1. crossplatform-config.json5 | `.arkui-x/crossplatform-config.json5` 的 `name` 字段 | 跨平台工程（推荐） |
| 2. oh-package.json5 file:依赖 | 根 `oh-package.json5` 中 `file:` 依赖名（排除entry） | 标准HarmonyOS工程 |
| 3. build-profile.json5模块 | `build-profile.json5` 中非entry模块 | 兜底 |

多模块时报错提示用户精简到单模块。

### 5.3 三阶段编译 + 嵌入打包

```
ace build plugin
│
├─ Phase 1: HarmonyOS（三种形态相同）
│  Hvigor assembleHar → <module>.har
│  产出: <module>/build/default/outputs/default/<module>.har
│
├─ Phase 2: Android（FFI/Plugin，需 createdPlatforms 含 android）
│  if ((type === 'ffi' || type === 'plugin') && createdPlatforms.includes('android')):
│    复用现有 ace build aar 能力:
│    gradlew :<module>:assembleRelease → <module>-release.aar
│    AAR内容: classes.jar + jni/{abi}/lib<module>.so + AndroidManifest.xml
│    AAR strip: 使用adm-zip移除libarkui_android.so(引擎库,~89MB→~0.2MB)
│    产出: android/<module>-release.aar
│  else: 跳过 Android 构建
│
├─ Phase 2.5: iOS 引擎框架复制（FFI/Plugin，需 createdPlatforms 含 ios，仅 macOS）
│  if ((type === 'ffi' || type === 'plugin') && createdPlatforms.includes('ios') && platform === MacOS):
│    copyLibraryToProject('ios', cmd, projectDir, 'ios', skipAppOnly=true)
│    → 从 SDK 复制 libarkui_ios.xcframework 到 .arkui-x/ios/frameworks/
│    → skipAppOnly=true: 跳过 updateIosProjectPbxproj 和 copyDat（HAR 工程不适用 app 专属逻辑）
│
├─ Phase 3: iOS xcframework（FFI/Plugin，需 createdPlatforms 含 ios，仅 macOS）
│  方案A: xcodebuild -create-xcframework
│  方案B: bash scripts/build.sh
│  非macOS或createdPlatforms不含ios → 跳过并警告
│  产出: ios/<Module>.xcframework/
│
└─ Phase 4: 嵌入HAR
   → 将HAR标准内容放入 package/
   → 将 crossplatform-config.json5 放在 package/ 同级
   → 将 android/<module>-release.aar 放在 package/ 同级
   → 将 ios/<Module>.xcframework/ 放在 package/ 同级
   → 产出: <module>.har (gzip tar, 使用tar npm包打包)
```

### 5.4 构建返回值检查

`buildAndroidAAR()` 和 `buildIOSXcFramework()` 的返回值被检查：

```javascript
let androidOk = buildAndroidAAR(...);  // true/false
let iosOk = buildIOSXcFramework(...);  // true/false (仅macOS)
if (!androidOk && !iosOk) {
  // 全部平台失败时abort HAR生成
}
```

单平台失败仍生成HAR（config中该平台字段为空），全部失败时abort。

### 5.5 类型自动检测

`detectPluginType(moduleName)` 根据工程结构自动判断类型：

| 条件 | 检测结果 |
|------|---------|
| 有 `src/main/cpp/` 目录 | `ffi` |
| 有 `.arkui-x/android/{moduleName}/` 目录 | `plugin` |
| 都没有 | `package` |

若 `crossplatform-config.json5` 已有 `type` 字段则直接使用，不重新检测。

### 5.6 C++编译配置

各平台使用独立的CMake配置：

| 平台 | CMake位置 | 链接库 |
|---|---|---|
| HarmonyOS | `<module>/src/main/cpp/CMakeLists.txt` | OHOS系统库 |
| Android | `.arkui-x/android/<module>/src/main/cpp/CMakeLists.txt` | `libarkui_android.so` + `log` |
| iOS | 通过xcodeproj或build.sh | `libarkui_ios.framework` |

跨平台模板的CMakeLists.txt使用glob通配符自动发现SDK版本：

```cmake
file(GLOB SDK_DIRS "$ENV{ARKUIX_SDK_HOME}/*/arkui-x/engine/lib/include")
list(SORT SDK_DIRS)
list(REVERSE SDK_DIRS)
list(GET SDK_DIRS 0 NATIVE_INCLUDE_PATH)
```

ace-plugin-packager.js中使用 `getSdkVersion(projectDir)` 从 `build-profile.json5` 读取SDK版本拼接引擎.so路径，与ace-create一致。

### 5.7 与现有`ace build aar`的关系

Phase 2直接复用 `buildAAR()` 函数，AAR的编译配置（CMake、Java源码）在开发工程的 `.arkui-x/android/<module>/build.gradle` 中已定义，无需额外配置。

---

## 6. `ace install` — 安装流程

### 6.1 命令设计

```
ace install <path/to/name>.har
```

不提供 `--platform` / `--force` 选项。始终同时处理所有平台产物，幂等设计保证安全性。

### 6.2 与现有`ace install`共存

参数以`.har`结尾 → 走跨平台三方件安装路径。

```
ace install hap       → 现有：安装HAP到HarmonyOS设备
ace install apk       → 现有：安装APK到Android设备
ace install ios       → 现有：安装APP到iOS设备
ace install xxx.har   → 新增：安装跨平台三方件到工程
```

### 6.3 执行流程

```
ace install mymodule.har
│
├─ 1. ACE CLI解压HAR到临时目录（使用tar npm包，无shell依赖）
│     tar.x({file: harPath, cwd: tmpDir, gzip: true, sync: true})
│
├─ 2. 读取crossplatform-config.json5
│     读取package/同级的crossplatform-config.json5
│     展平: package/子目录内容提升到临时目录根(ohpm安装要求flat结构)
│
├─ 3. 复制到持久目录
│     tmpDir/ → .arkui-x/plugins/{name}/
│
├─ 4. type === "package" → 跳过平台集成
│
├─ 5. Android集成（FFI和Plugin统一流程）
│   复制 .arkui-x/plugins/{name}/android/<module>-release.aar
│     → .arkui-x/android/app/libs/<module>-release.aar
│   在 app/build.gradle 中添加:
│   // ACE_PLUGIN:AUTO_GENERATED
│   implementation files('libs/<module>-release.aar')
│   // ACE_PLUGIN:END
│   （AAR中的.so由Gradle自动按ABI提取到APK）
│
├─ 6. iOS集成（FFI和Plugin相同，仅macOS）
│   复制 .arkui-x/plugins/{name}/ios/*.xcframework → .arkui-x/ios/frameworks/
│   调用 updateIosProjectPbxproj() 注册到project.pbxproj
│   （复用现有 adjustPbxproj4Framework.js）
│   非macOS跳过
│
├─ 7. oh-package.json5依赖注册
│   在entry/oh-package.json5的dependencies中添加:
│   "<name>": "file:../.arkui-x/plugins/<name>"
│   路径使用正斜杠(.replace(/\\/g, '/')，Windows兼容)
│   空dependencies {}时不加尾逗号(区分空/非空两种情况)
│
├─ 8. ohpm install
│   在entry/目录执行ohpm install，解析file:依赖到oh_modules/
│
└─ 9. 输出安装总结
```

### 6.4 幂等设计

app/build.gradle文件修改使用标记注释：

```groovy
// app/build.gradle
// ACE_PLUGIN:AUTO_GENERATED
implementation files('libs/mymodule-release.aar')
// ACE_PLUGIN:END
```

逻辑：
1. 扫描文件是否已有同名plugin的标记块 → 有则跳过
2. 无 → 在标记区域末尾追加
3. 无标记区域 → 在dependencies块中创建

**相比旧设计的简化**: 不再需要修改`settings.gradle`（因为不再注册源码Module），只需在`app/build.gradle`的dependencies中添加1行`implementation files(...)`。

### 6.5 版本更新

重复`ace install`同名har：
- oh_modules: ohpm自动更新
- Android: 先删除旧AAR再复制新的，build.gradle注册幂等
- iOS: 先删除旧xcframework再复制新的，pbxproj注册幂等

### 6.6 `compatibleSdkVersion`校验

安装时校验当前SDK版本 >= 声明的最低版本。不匹配时**警告但继续安装**。

---

## 7. 插件注册机制

### 7.1 Android Plugin注册

`pluginClass`声明Java入口类全限定名，宿主应用通过反射实例化：

```java
// pluginClass = "com.ohos.ace.plugin.avsession.AVSessionPlugin"
Class<?> clazz = Class.forName(config.android.pluginClass);
IArkUIXPlugin plugin = (IArkUIXPlugin) clazz.newInstance();
plugin.register(engine);
```

AAR中的classes.jar包含编译好的Java类，反射调用不受分发格式影响。

### 7.2 iOS Plugin注册

`pluginClass`声明ObjC入口类名：

```objc
Class pluginClass = NSClassFromString(config.ios.pluginClass);
id<ArkUIXPluginProtocol> plugin = [[pluginClass alloc] init];
[plugin registerWithEngine:engine];
```

### 7.3 注册时机

`ace install`安装Plugin后，应用开发者在入口代码中**显式调用**注册。不自动生成注册代码（避免代码生成复杂性，保持简单）。

---

## 8. 实现架构

### 8.1 新增/修改文件

```
ace_tools/lib/src/cli/
├── ace-build/
│   ├── ace-packager/
│   │   ├── index.js                 # 修改：新增 plugin target分支
│   │   ├── ace-plugin-packager.js   # 新增：Plugin/FFI编译打包逻辑
│   │   └── har-utils.js             # 新增：HAR打包/解压工具函数（tar npm包）
│   └── ace-compiler/
│       └── index.js                 # 未修改（plugin build使用现有hvigor编译）
├── ace-install/
│   ├── index.js                     # 修改：新增.har参数判断
│   └── plugin-installer.js          # 新增：跨平台三方件安装逻辑
└── ace-create/
    └── project/index.js             # 修改：setupCrossplatformModule()
```

### 8.2 可复用的现有能力

| 能力 | 现有实现 | 复用方式 |
|---|---|---|
| AAR编译 | `index.js` → `buildAAR()` | **直接调用** — Phase 2 Android产物 |
| iOS pbxproj注册 | `adjustPbxproj4Framework.js` → `updateIosProjectPbxproj()` | 直接调用 |
| 文件复制 | `ace-create/util.js` → `copy()` | 直接调用 |
| 模块名获取 | `util/index.js` → `getAarName()` | 直接调用 |
| SDK版本获取 | `util/index.js` → `getSdkVersion()` | 直接调用 |
| JSON5解析 | `json5`包 | 直接使用 |

---

## 9. Windows 兼容性设计

### 9.1 HAR打包/解压 — tar npm包

`har-utils.js` 使用 `tar` npm包(v6, CJS)替代 `exec('tar -xf')` shell命令：

| 操作 | 旧实现 | 新实现 |
|------|--------|--------|
| 解压 | `zlib.gunzipSync` + `exec('tar -xf')` | `tar.x({file, cwd, gzip:true, sync:true})` |
| 打包 | `exec('tar -cf')` + `zlib.gzipSync` | `tar.c({file, cwd, gzip:true, sync:true}, entries)` |

tar v6是纯CJS，Rollup v3.19.1可直接打包进bundle，无需external。tar v7使用私有类字段语法Rollup无法解析，故降级到v6。

### 9.2 AAR strip — adm-zip

`ace-plugin-packager.js` 的 `stripLibarkuiFromAAR()` 使用 `adm-zip` npm包替代 `unzip`/`zip` CLI命令：

```
AAR原大小 ~89MB (含libarkui_android.so)
strip后 ~0.2MB (仅保留lib<module>.so + classes.jar)
```

adm-zip是纯JS，跨平台无shell依赖。

### 9.3 路径分隔符

`plugin-installer.js` 中 `oh-package.json5` 的 `file:` 依赖路径：

```javascript
const relPath = path.relative(entryDir, pluginDir).replace(/\\/g, '/');
const depRef = 'file:' + relPath;
```

Windows上 `path.relative()` 返回 `..\.\arkui-x\plugins\...`，反斜杠会导致ohpm解析时 `\f` 被当作form feed转义字符吞掉 `f`。`.replace(/\\/g, '/')` 统一为正斜杠，三平台结果一致。

### 9.4 oh-package.json5 空dependencies尾逗号

```javascript
const emptyDepsRegex = /"dependencies"\s*:\s*\{\s*\}/;
if (emptyDepsRegex.test(content)) {
  // 空{} → 不加尾逗号
  content = content.replace(emptyDepsRegex,
    `"dependencies": {\n    "${depKey}": "${depRef}"\n  }`);
} else {
  // 非空{...} → 加尾逗号分隔
  content = content.replace(/"dependencies"\s*:\s*\{/,
    `"dependencies": {\n    "${depKey}": "${depRef}",`);
}
```

空 `{}` 加尾逗号会导致JSON解析失败，hvigor报 `Cannot read properties of undefined (reading 'split')`。

### 9.5 gradlew平台适配

```javascript
const gradleCmd = os.platform() === 'win32' ? 'gradlew.bat' : './gradlew';
if (os.platform() !== 'win32') {
  fs.chmodSync(path.join(androidDir, 'gradlew'), 0o755);
}
```

### 9.6 iOS平台守卫

| 代码位置 | 守卫条件 | 非macOS行为 |
|---------|---------|------------|
| `buildIOSXcFramework()` | `platform === Platform.MacOS` | 跳过，警告 "iOS xcframework requires macOS" |
| `installIOS()` | `platform === Platform.MacOS` | 跳过，输出 "iOS integration skipped (requires macOS)" |
| `exec('bash scripts/build.sh')` | 在buildIOSXcFramework内 | 仅macOS执行 |

### 9.7 ohpm跨平台

ohpm本身是跨平台工具(Node.js实现)，`execSync("ohpm install")` 在三平台均可执行。

---

## 10. 测试用例UI规范

### 10.1 规则来源

遵循 `TEST_UI_RULES.md`（全局Agent配置）定义的测试用例UI规则。

### 10.2 核心要求

| 要求 | 实现 |
|------|------|
| 渐进式执行 | 测试逐个运行，200ms间隔setTimeout |
| 即时视觉反馈 | 点击Re-run后立即显示⏳ + LoadingProgress转圈 |
| 状态图标 | ✅ PASSED / ❌ FAILED / ⏳ RUNNING/PENDING |
| 按钮防抖 | isRunning时禁用Re-run按钮 |
| ArkTS严格模式 | 显式interface，禁止内联对象字面量 |

### 10.3 类型定义

```typescript
enum TestStatus {
  PENDING = 0,
  RUNNING = 1,
  PASSED = 2,
  FAILED = 3
}

interface TestItem {
  name: string;
  status: TestStatus;
  detail: string;
}

interface TestRunResult {
  passed: boolean;
  detail: string;
}

interface TestCase {
  name: string;
  fn: () => TestRunResult;
}
```

### 10.4 模板位置

| 模板 | 文件路径 | 测试用例数 |
|------|---------|-----------|
| FFI | `templates/crossplatform/ffi/entry/src/main/ets/pages/Index.ets` | 13个(add/multiply/greet/stringLength/concatStrings/reverseString/sumArray/createIntArray/callCallback等) |
| Plugin | `templates/crossplatform/plugin/entry/src/main/ets/pages/Index.ets` | 8个(add/log/getSystemVersion/getFullOSName/getDeviceType等) |

### 10.5 关键实现模式

- `buildTestCases()` 返回 `TestCase[]`，每个用例封装为 `{name, fn}` 结构
- `runTestAtIndex(index, cases)` 递归调用 + setTimeout实现渐进式
- `updateItemStatus()` 创建新数组触发 `@State` 响应式更新
- `statusEmoji()` 返回emoji图标
- `aboutToAppear()` 自动启动测试

---

## 11. PR检视修复

### 11.1 R1: 构建返回值检查

`buildAndroidAAR()` 和 `buildIOSXcFramework()` 的返回值现在被检查：

```javascript
let androidOk = buildAndroidAAR(...);  // true/false
let iosOk = buildIOSXcFramework(...);  // true/false (仅macOS)
if (!androidOk && !iosOk) {
  // 全部平台失败时abort HAR生成
}
```

单平台失败仍生成HAR（config中该平台字段为空），全部失败时abort。

### 11.2 R2: JNI add签名改double

FFI/Plugin模板的 `add` 函数签名从 `int(II)I` 改为 `double(DD)D`，5个文件同步：

| 文件 | 修改 |
|------|------|
| `plugin_jni.cpp` | `(II)I` → `(DD)D` |
| `Module_namePlugin.java` | `int add(int, int)` → `double add(double, double)` |
| `Module_name.h` | `int add(int, int)` → `double add(double, double)` |
| `Module_name.m` | 同上 |
| `plugin_impl.mm` | 同上 |

### 11.3 W1/W2: shell命令替代

| 问题 | 修复 | npm包 |
|------|------|-------|
| W1: `exec('tar -xf')` | tar npm包替代 | `tar@^6.2.1` |
| W2: `unzip`/`zip` CLI | adm-zip替代 | `adm-zip@^0.5.17` |

### 11.4 Copyright补全

28个跨平台模板文件补全Apache 2.0许可证头（Copyright 2026），OAT.xml清理7条不再需要的过滤规则。

---

## 12. 部署架构

### 12.1 三份部署位置

| 位置 | 路径 | 用途 |
|------|------|------|
| 源码 | `cli/ace_tools/` | 开发修改 |
| 活动目录 | `DevEcoStudioProjects/cli/ace_tools/` | 日常测试 |
| SDK | `Library/ArkUI-X/Sdk/22/arkui-x/toolchains/ace_tools/` | ace命令实际执行 |

### 12.2 部署方法

```bash
# 编译
cd cli/ace_tools && npm run build

# 部署lib/到SDK和活动目录
rm -rf {target}/lib/ && cp -r dist/lib {target}/lib/

# 部署templates/到SDK（rollup build只复制到dist/templates/）
cp -r templates/crossplatform/{ffi,plugin}/entry/src/main/ets/pages/Index.ets \
  {sdk}/templates/crossplatform/{ffi,plugin}/entry/src/main/ets/pages/Index.ets
```

### 12.3 developtools同步

developtools是OHOS编译系统使用的副本，需与源码同步：

```bash
rsync -av --delete cli/ace_tools/lib/ developtools/ace_tools/ace_tools/lib/
cp cli/ace_tools/package.json developtools/ace_tools/ace_tools/package.json
cd developtools/ace_tools/ace_tools && npm install
```

---

## 13. Rollup构建配置

### 13.1 tar v6 vs v7

| 版本 | 语法 | Rollup v3.19.1 | 决策 |
|------|------|----------------|------|
| v7 | 私有类字段 `#e` | ❌ 解析失败 | 不用 |
| v6 | 标准CJS | ✅ 直接打包进bundle | 使用 |

tar v6打包进bundle后，SDK部署目录不需要 `node_modules/tar`，只需 `lib/ace_tools.js` 单文件。

### 13.2 依赖清单

```json
{
  "adm-zip": "^0.5.17",     // AAR strip
  "archiver": "^5.3.1",     // 已有
  "tar": "^6.2.1",          // HAR打包/解压
  "fs-extra": "^11.2.0",    // 文件操作
  "json5": "（传递依赖）"    // JSON5解析
}
```

---

## 14. 待明确点与决策

### 14.1 卸载流程

暂不实现。理由：
- ohpm uninstall处理oh_modules/清理
- Android/iOS产物移除可通过重建`.arkui-x/`目录
- 幂等设计使重装安全，无需卸载

### 14.2 多插件C++符号冲突

不做特殊处理。每个插件的.so使用独立库名（`lib<module>.so`），AAR中jni/按ABI分目录，Gradle自动管理。若未来出现实际冲突，可通过`-fvisibility=hidden`解决。

### 14.3 iOS非macOS降级

非macOS执行`ace build plugin`时，Phase 3 (iOS)跳过并输出警告。嵌入HAR时不包含`ios/`目录。在macOS上安装此HAR时，`installIOS()`找不到ios/目录会返回false并警告。

### 14.4 源码依赖模式

参见 `source-dependency-mode-design.md`，支持 `ace build plugin --source` 打包源码HAR，`ace install` 以 Gradle module / Xcode subproject 形式集成。当前未实现，属于后续规划。
