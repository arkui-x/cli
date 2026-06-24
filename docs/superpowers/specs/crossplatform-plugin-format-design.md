# ArkUI-X 跨平台三方件格式设计

> **日期**: 2026-06-03
> **状态**: Design Review (v2 — Android统一AAR产物)
> **参考**: `jackfruit/jackfruit/CrossPlatformPlugin/ArkUI-X三方件形态设计-基于Flutter分析.md`

## 1. 概述

设计 ArkUI-X 跨平台三方件的统一格式，支持三种形态的插件通过 HAR 包分发，覆盖 HarmonyOS、Android、iOS 三端。

### 1.1 三种插件形态

| 形态 | type字段 | 原生代码形式 | 适用场景 | Flutter对应 |
|---|---|---|---|---|
| **Package** | `"package"` | 无，纯ArkTS | UI组件库、工具函数库 | Dart Package |
| **FFI** | `"ffi"` | 预编译C++（AAR + xcframework） | MQTT、加密、图像处理等C库 | Package FFI |
| **Plugin** | `"plugin"` | 预编译C++ + Java/Kotlin（AAR + xcframework） | 蓝牙、相机、传感器等平台API | Plugin |

### 1.2 设计原则

1. **ohpm向后兼容**: `package/` 目录放ohpm标准内容，ohpm不感知跨平台扩展
2. **统一分发渠道**: 三种形态统一通过 `ohpm publish` 发布
3. **幂等安装**: 重复 `ace install` 不重复添加，使用标记注释
4. **CLI单一入口**: `ace build` / `ace install` 统一处理三端
5. **Android统一AAR**: FFI和Plugin的Android产物统一为AAR格式，安装流程一致

### 1.3 涉及的CLI命令

| 命令 | 作用 | 当前状态 |
|---|---|---|
| `ace create` | 创建插件工程模板 | 已有`plugin_napi`模板，需扩展 |
| `ace build <package\|ffi\|plugin>` | 编译跨平台三方件 | **新增** |
| `ace install <name>.har` | 安装三方件到工程 | **新增**（与设备安装共存） |
| `ace build apk/ios` | 构建宿主应用 | 已有，需集成插件产物 |

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

- AAR内`.so`排除 `libarkui_android.so`（引擎库，由SDK提供，约89MB）
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

## 4. `ace build` 编译流水线

### 4.1 三阶段编译 + 嵌入打包

```
ace build <package|ffi|plugin> --target <module>
│
├─ Phase 1: HarmonyOS（三种形态相同）
│  Hvigor assembleHar → <module>.har
│  产出: <module>/build/default/outputs/default/<module>.har
│
├─ Phase 2: Android（FFI/Plugin，统一AAR产物）
│  复用现有 ace build aar 能力:
│  gradlew :<module>:assembleRelease → <module>-release.aar
│  AAR内容: classes.jar + jni/{abi}/lib<module>.so + AndroidManifest.xml
│  产出: android/<module>-release.aar
│
├─ Phase 3: iOS（FFI/Plugin，仅macOS）
│  方案A: xcodebuild -create-xcframework
│  方案B: bash scripts/build.sh
│  非macOS跳过并警告
│  产出: ios/<Module>.xcframework/
│
└─ Phase 4: 嵌入HAR
   → 将HAR标准内容放入 package/
   → 将 crossplatform-config.json5 放在 package/ 同级
   → 将 android/<module>-release.aar 放在 package/ 同级
   → 将 ios/<Module>.xcframework/ 放在 package/ 同级
   → 产出: <module>.har (gzip tar)
```

### 4.2 新增build target

当前`packager()`函数支持: `apk`, `aab`, `aar`, `ios`, `ios-framework`, `ios-xcframework`

新增分支:
- `package` — 仅Phase 1 + Phase 4（嵌入config）
- `ffi` — Phase 1 + Phase 2 + Phase 3 + Phase 4
- `plugin` — Phase 1 + Phase 2 + Phase 3 + Phase 4（与FFI相同，AAR包含Java classes）

**与现有`ace build aar`的关系**: Phase 2直接复用`buildAAR()`函数，AAR的编译配置（CMake、Java源码）在开发工程的`.arkui-x/android/<module>/build.gradle`中已定义，无需额外配置。

### 4.3 C++编译配置

各平台使用独立的CMake配置：

| 平台 | CMake位置 | 链接库 |
|---|---|---|
| HarmonyOS | `<module>/src/main/cpp/CMakeLists.txt` | OHOS系统库 |
| Android | `.arkui-x/android/<module>/src/main/cpp/CMakeLists.txt` | `libarkui_android.so` + `log` |
| iOS | 通过xcodeproj或build.sh | `libarkui_ios.framework` |

---

## 5. `ace install` 安装流程

### 5.1 命令设计

```
ace install <path/to/name>.har
```

不提供 `--platform` / `--force` 选项。始终同时处理所有平台产物，幂等设计保证安全性。

### 5.2 与现有`ace install`共存

参数以`.har`结尾 → 走跨平台三方件安装路径。

```
ace install hap       → 现有：安装HAP到HarmonyOS设备
ace install apk       → 现有：安装APK到Android设备
ace install ios       → 现有：安装APP到iOS设备
ace install xxx.har   → 新增：安装跨平台三方件到工程
```

### 5.3 执行流程

```
ace install mymodule.har
│
├─ 1. ohpm install处理package/ → oh_modules/<name>/
│     ohpm读取package/oh-package.json5，完成HarmonyOS依赖管理
│
├─ 2. ACE CLI解压HAR到临时目录
│     读取package/同级的crossplatform-config.json5
│
├─ 3. type === "package" → 完成
│
├─ 4. Android集成（FFI和Plugin统一流程）
│   复制 tmpDir/android/<module>-release.aar
│     → .arkui-x/android/app/libs/<module>-release.aar
│   在 app/build.gradle 中添加:
│   // ACE_PLUGIN:AUTO_GENERATED
│   implementation files('libs/<module>-release.aar')
│   // ACE_PLUGIN:END
│   （AAR中的.so由Gradle自动按ABI提取到APK）
│
├─ 5. iOS集成（FFI和Plugin相同）
│   复制 tmpDir/ios/*.xcframework → .arkui-x/ios/frameworks/
│   调用 updateIosProjectPbxproj() 注册到project.pbxproj
│   （复用现有 adjustPbxproj4Framework.js）
│
└─ 6. 输出安装总结
```

### 5.4 幂等设计

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

### 5.5 版本更新

重复`ace install`同名har：
- oh_modules: ohpm自动更新
- Android: 先删除旧AAR再复制新的，build.gradle注册幂等
- iOS: 先删除旧xcframework再复制新的，pbxproj注册幂等

---

## 6. 插件注册机制

### 6.1 Android Plugin注册

`pluginClass`声明Java入口类全限定名，宿主应用通过反射实例化：

```java
// pluginClass = "com.ohos.ace.plugin.avsession.AVSessionPlugin"
Class<?> clazz = Class.forName(config.android.pluginClass);
IArkUIXPlugin plugin = (IArkUIXPlugin) clazz.newInstance();
plugin.register(engine);
```

AAR中的classes.jar包含编译好的Java类，反射调用不受分发格式影响。

### 6.2 iOS Plugin注册

`pluginClass`声明ObjC入口类名：

```objc
Class pluginClass = NSClassFromString(config.ios.pluginClass);
id<ArkUIXPluginProtocol> plugin = [[pluginClass alloc] init];
[plugin registerWithEngine:engine];
```

### 6.3 注册时机

`ace install`安装Plugin后，应用开发者在入口代码中**显式调用**注册。不自动生成注册代码（避免代码生成复杂性，保持简单）。

---

## 7. 工程模板结构

### 7.1 Package开发工程

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

### 7.2 FFI开发工程

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
│       ├── app/
│       └── app.xcodeproj/
├── build-profile.json5
└── oh-package.json5
```

### 7.3 Plugin开发工程

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
│       ├── app/
│       ├── app.xcodeproj/
│       └── scripts/build.sh         # iOS xcframework构建脚本
├── build-profile.json5
└── oh-package.json5
```

**注意**: 开发工程中`.arkui-x/android/<module>/`仍然是完整的Gradle Library Module（源码），`ace build plugin`时编译为AAR产物嵌入HAR。开发-编译-分发的分离是关键。

---

## 8. 实现架构

### 8.1 新增/修改文件

```
ace_tools/lib/src/cli/
├── ace-build/
│   ├── ace-packager/
│   │   ├── index.js                 # 修改：新增 package/ffi/plugin target分支
│   │   ├── ace-plugin-packager.js   # 新增：Plugin/FFI编译打包逻辑（复用buildAAR）
│   │   └── har-utils.js             # 新增：HAR打包/解压工具函数
│   └── ace-compiler/
│       └── index.js                 # 修改：新增 plugin assembleHar 构建支持
├── ace-install/
│   ├── index.js                     # 修改：新增.har参数判断
│   └── plugin-installer.js          # 新增：跨平台三方件安装逻辑
└── ace-create/
    └── project/index.js             # 可能修改：扩展模板类型
```

### 8.2 可复用的现有能力

| 能力 | 现有实现 | 复用方式 |
|---|---|---|
| AAR编译 | `index.js` → `buildAAR()` | **直接调用** — Phase 2 Android产物 |
| iOS pbxproj注册 | `adjustPbxproj4Framework.js` → `updateIosProjectPbxproj()` | 直接调用 |
| 文件复制 | `ace-create/util.js` → `copy()` | 直接调用 |
| 模块名获取 | `util/index.js` → `getAarName()` | 直接调用 |
| SDK依赖复制 | `copyLibraryToProject.js` | 参考 |
| JSON5解析 | `json5`包 | 直接使用 |
| 模块发现 | `getCrossPlatformModules()` (读arkui-x-config.json5) | 直接调用 |

---

## 9. 待明确点与决策

### 9.1 卸载流程

暂不实现。理由：
- ohpm uninstall处理oh_modules/清理
- Android/iOS产物移除可通过重建`.arkui-x/`目录
- 幂等设计使重装安全，无需卸载

### 9.2 多插件C++符号冲突

不做特殊处理。每个插件的.so使用独立库名（`lib<module>.so`），AAR中jni/按ABI分目录，Gradle自动管理。若未来出现实际冲突，可通过`-fvisibility=hidden`解决。

### 9.3 `compatibleSdkVersion`校验

安装时校验当前SDK版本 >= 声明的最低版本。不匹配时**警告但继续安装**。

### 9.4 iOS非macOS降级

非macOS执行`ace build`时，Phase 3 (iOS)跳过并输出警告。嵌入HAR时不包含`ios/`目录。

### 9.5 版本更新

重复`ace install`同名har时：先删除旧产物再复制新的，Gradle/pbxproj注册幂等。

---

## 10. 完整生命周期

```
┌─ 开发阶段 ─────────────────────────────────────────────┐
│  开发者在DevEco Studio开发HarmonyOS模块                  │
│  编写ArkTS API + C++ Native + Bridge                   │
│  编写Android Java/Kotlin + CMake（Plugin/FFI）         │
│  编写iOS ObjC/C++ + 构建脚本（Plugin/FFI）              │
├─ 编译阶段 ─────────────────────────────────────────────┤
│  ace build <package|ffi|plugin> --target <module>       │
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
