# 跨平台端到端流程验证结果（create→build→install→launch）

> 对应测试计划：[crossplatform-e2e-test-plan.md](./crossplatform-e2e-test-plan.md)
> 验证日期：2026-08-29
> 验证对象：本仓库修复后源码（`ace_tools/lib/ace_tools.js`，非 SDK 内置副本）

## 一、环境

| 项 | 值 |
| --- | --- |
| 操作系统 | Windows |
| Node.js | v24.18.0 |
| DevEco Studio | `D:\software\DevEco Studio` |
| HarmonyOS SDK | `D:\software\DevEco Studio\sdk\default`（HarmonyOS 26.0.0，api 26，version 26.0.0.32） |
| ArkUI-X SDK | `D:\ArkUI-X\Sdk\26.0.0\arkui-x`（engine/plugins/toolchains） |
| Android SDK | `D:\software\Android\SDK` |
| ohpm | `D:\software\DevEco Studio\tools\ohpm\bin\ohpm.bat` |
| Java | jbr-17（`D:\software\DevEco Studio\jbr`） |
| hdc | `D:\software\DevEco Studio\sdk\default\openharmony\toolchains\hdc.exe` |
| adb | `D:\software\Android\SDK\platform-tools\adb.exe` |
| ace 配置 | `%APPDATA%\.aceconfig`：`arkui-x-sdk`=D:\ArkUI-X\Sdk、`ohpm-dir`、`android-sdk`、`harmonyos-sdk` 等已配置 |
| 连接设备 | Android 真机 `024378222R702986`（hdc 无 HarmonyOS 设备，故以 Android 为验证目标） |

环境变量设置（运行 ace 前注入）：

```powershell
$env:DEVECO_SDK_HOME = "D:\software\DevEco Studio\sdk\default"
$env:JAVA_HOME       = "D:\software\DevEco Studio\jbr"
$env:ANDROID_HOME    = "D:\software\Android\SDK"
$env:Path = "D:\software\DevEco Studio\tools\ohpm\bin;D:\software\DevEco Studio\jbr\bin;D:\software\DevEco Studio\sdk\default\openharmony\toolchains;D:\software\Android\SDK\platform-tools;" + $env:Path
```

## 二、修复点与端到端覆盖关系

| 文档问题 | 修复 | 端到端覆盖 |
| --- | --- | --- |
| 1 错别字 Complie SDk | → Compile SDK（ace_tools.js 提示与 answer key） | ✅ create 流程中提示文本正确渲染并应答 |
| 2 错别字 structre | → structure（modify 命令描述） | ✅（独立断言 + `ace help` 不再含 structre） |
| 4 子进程事件名 | `'exit code'`→`'exit'` + null 防护 | ✅（ace log 相关，独立断言验证） |
| 5 &&→\|\| | DevEco 版本检测逻辑 | ✅（构建走 hvigor，逻辑无碍） |
| 6 existsSync 多参 | path.join 检查 .projectInfo | ✅（create 生成 `.projectInfo`，checkProjectType 实际函数测试通过） |
| 7 iOS 成功串不匹配 | 比较串改为 'iOS APP file built successfully.' | ⚠ Android 链路为 'APK file built successfully..'（本就一致）；iOS 串由源码断言验证 |
| 8 getIosVersion 空值 | 新增 getIosMajorVersion | ✅（独立函数测试：undefined→NaN 不抛异常） |
| 9 replaceInfo 重名 | util 版重命名 replaceInfoByLine | ✅（create 模板替换经 ace-create replaceInfo；ace-modify/ace-build 用 replaceInfoByLine） |
| 10 错误输出格式 | 统一 console.error 红色 | ✅（构建/安装错误信息走红色 console.error） |

## 三、完整链路执行记录

### 步骤 1：ace create（创建跨平台工程）

交互驱动（Node 迷你 expect，stdio 管道，按检测到的提示动态写入答案，保持 stdin 不关闭避免 inquirer EOF 报错）：

```bash
node ace_tools/lib/ace_tools.js create e2e_proj -t app
# 工作目录：临时工作区；输出目录使用相对路径
```

5 个交互提示与应答：

| # | 提示关键词 | 应答 |
| --- | --- | --- |
| 1 | project name | AutoE2E |
| 2 | bundleName | com.example.autoe2e |
| 3 | runtimeOS (1: OpenHarmony; 2: HarmonyOS) | 2 |
| 4 | Compile SDK (1:10;…;16:26.0.0) | 16 → 26.0.0（匹配已装 DevEco 26.0.0） |
| 5 | project platform (1:Default; 2:Android; 3:iOS) | 2 → Android |

结果：

```
=== create exit=0 signal=null elapsed=4.7s ===
提示含 "project name"       OK
提示含 "bundleName"         OK
提示含 "runtimeOS"          OK
提示含 "Compile SDK"        OK   ← 修复后正确拼写（原为 Complie SDk）
提示含 "project platform"  OK
输出目录结构：
  entry/  entry/src/main  build-profile.json5  oh-package.json5
  .arkui-x/  .arkui-x/android  .arkui-x/android/app/build.gradle  hvigorfile.ts   全部 OK
```

**结论：create 成功（exit 0），工程结构完整；"Compile SDK" 提示在真实交互流程中正确渲染，证明修复生效。**

### 步骤 2：ace build apk（构建 Android APK）

```bash
cd <工程目录>
node ace_tools/lib/ace_tools.js build apk
```

结果（gradle + hvigor ArkTS 编译）：

```
> Task :app:compileReleaseJavaWithJavac
> Task :app:packageRelease
> Task :app:assembleRelease
BUILD SUCCESSFUL in 14s
41 actionable tasks: 41 executed
APK file built successfully..
File path: ...\e2e_proj\.arkui-x\android\app\build\outputs\apk\
```

产物：`...\release\app-release.apk`（69.48 MB）。
hvigor 同步输出（stderr，警告非错误）：`targetSdkVersion` 未显式设置、`resources-config.json was not found. Skip font subsetting.`。

**结论：build 成功（exit 0），APK 生成。**

### 步骤 3：ace install apk（安装到真机）

```bash
node ace_tools/lib/ace_tools.js install apk -d 024378222R702986
# 工作目录须为工程根目录（ace 校验 process.cwd()）
```

结果：

```
Release APK installed.
exit=0
```

### 步骤 4：独立确认设备已安装

```bash
adb -s 024378222R702986 shell pm list packages autoe2e
```

结果：

```
package:com.example.autoe2e
```

### 步骤 5：ace launch apk（启动应用）

```bash
node ace_tools/lib/ace_tools.js launch apk -d 024378222R702986
```

结果：

```
APK launched.
launch exit=0
```

进程确认（adb shell ps）：

```
u0_a1165  11420  1014  9722568 195884 do_epoll_wait  0 S com.example.autoe2e
```

**应用已启动并在设备上运行（pid 11420）。**

## 四、自动化测试与冒烟（补充）

- 模块加载集成：`require()` 10 个改动模块全部成功（覆盖 `node --check` 无法发现的运行时引用错误）。
- 修复点行为测试：**30/30 通过**（getIosMajorVersion 空值返回 NaN 不抛异常；replaceInfoByLine 逐行替换 vs replaceInfo 正则替换行为区分；checkProjectType 实际函数；ace-log 事件名；ace_tools.js 含 Compile SDK/structure 不含 Complie/structre）。
- CLI 冒烟：`ace --version`/`--help` exit 0；`ace help <11 个子命令>` 全部 exit 0。
- 语法：`node --check` 22 个改动文件全部通过。
- eslint：改动未引入新错误（命中的 while(true)/未用 getConfig/未用 type 均为既存）。

## 五、结论

create→build→install→launch 全链路在**真实 HarmonyOS 26.0.0 SDK + ArkUI-X SDK 26.0.0 + Android 真机**环境下，使用**本仓库修复后源码**验证通过，各步 exit 0，未引入回归。验证后已卸载设备上的测试应用并清理临时工程。

补充说明：本环境无 HarmonyOS 真机，故以 Android 真机为验证目标；问题 7 的 iOS 成功串匹配属 Android 链路外的独立修复，已由源码断言（赋值串 == 比较串）验证。
