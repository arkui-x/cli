# ACE Tools

## 简介
ACE Tools是一套为ArkUI-X项目跨平台应用开发者提供的命令行工具，支持在Windows/Ubuntu/macOS平台运行，用于构建OpenHarmony/HarmonyOS、Android和iOS平台的应用程序，其功能包括开发环境检查，新建项目，编译打包，安装调试等。

**注释：** ACE - 元能力跨平台运行环境 (Ability Cross-platform Environment)。

图1 ACE Tools命令行工具模块结构

![](figures/cli.jpg)

命令行各平台使用不同脚本文件做为入口，再通过Node.js执行到ace_tools.js文件，使用npm模块commander解析命令行执行各子模块导出的方法。

## 目录结构
ArkUI-X项目的源代码结构参见 [代码工程结构及构建说明](https://gitee.com/arkui-x/docs/blob/master/zh-cn/framework-dev/quick-start/project-structure-guide.md) , ACE Tools工具链的代码在//developtools/ace_tools下，目录结构如下图所示：

```
/developtools/ace_tools/cli
├── src                         # 命令相关
│   ├── ace-build               # 构建跨平台应用安装包
│   ├── ace-check               # 查验跨平台应用开发环境
│   ├── ace-clean               # 清理跨平台应用编译结果
│   ├── ace-config              # 设置ACE工具链相关配置
│   ├── ace-create              # 创建跨平台应用工程及应用模块
│   ├── ace-devices             # 查询当前所有连接的设备
│   ├── ace-install             # 将跨平台应用安装到连接的设备上
│   ├── ace-launch              # 在设备上运行ArkUI跨平台应用
│   ├── ace-log                 # 展示正在运行的跨平台应用的日志
│   ├── ace-run                 # 编译并在设备上运行ArkUI跨平台应用
|   ├── ace-test                # 执行跨平台应用包单元测试
│   ├── ace-uninstall           # 将跨平台应用从连接的设备上卸载
│   ├── bin                     # 各终端入口脚本
│   └── util                    # 工具模块
└── templates                   # 模板相关
    ├── android                 # Android工程模板
    ├── cpp                     # Native C++配置模板                           
    ├── cpp_ets_fa              # 基于ArkTS的声明式开发范式Native C++模板
    ├── cpp_ets_stage           # Stage Native C++开发模板
    ├── cpp_js_fa               # 兼容JS的类Web开发范式Native C++模板
    ├── cpp_ohos_fa             # Fa ohos工程模板
    ├── ets_fa                  # 基于ArkTS的声明式开发范式模板
    ├── ets_stage               # Stage开发模板
    ├── ios                     # iOS工程模板
    ├── js_fa                   # 兼容JS的类Web开发范式模板
    ├── ohos_fa                 # ohos Fa工程模板
    ├── ohos_stage              # ohos Stage工程模板

```

## 使用方法

### ace config

设置ACE工具链相关配置，包括OpenHarmony SDK路径，HarmonyOS SDK路径、ArkUI-X SDK路径、Android SDK路径、Node.js路径、编译输出路径等。 

语法：

```shell
ace config [options] <path>
```

| 参数          | 说明                |
| ------------- | ------------------- |
| --openharmony-sdk | OpenHarmony SDK路径。 |
| --harmonyos-sdk | HarmonyOS SDK路径。 |
| --android-sdk | Android SDK路径。    |
| --nodejs-dir  | Node.js 路径。        |
| --build-dir   | 编译输出的路径。     |
| --deveco-studio-path | DevEco Studio安装路径（可选参数）。 |
| --android-studio-path | Android Studio安装路径（可选参数）。 |
| --java-sdk | JDK路径。 |
| --arkui-x-sdk | ArkUI-X SDK路径 |

### ace check

查验跨平台应用开发环境。

需要检查的项：

| 检查内容         | 说明                         | Windows | Linux | Mac  |
| ---------------- | ---------------------------- | ------- | ----- | ---- |
| Node.js           | Node.js 路径                  | 是      | 是    | 是   |
| OpenHarmony SDK  | OpenHarmony SDK路径          | 是      | 是    | 是   |
| HarmonyOS SDK    | HarmonyOS SDK路径          | 是      | 是    | 是   |
| Android SDK      | Android SDK路径              | 是      | 是    | 是   |
| DevEco Studio    | DevEco Studio安装路径        | 是      | 否    | 是   |
| Android Studio   | Android Studio安装路径       | 是      | 是    | 是   |
| 连接设备         | 当前连接的所有设备           | 是      | 是    | 是   |
| Xcode            | 当前Xcode的版本号            | 否      | 否    | 是   |
| libimobiledevice | 当前libimobiledevice的版本号 | 否      | 否    | 是   |
| ios-deploy       | 当前ios-deploy的版本号       | 否      | 否    | 是   |
| ArkUI-X SDK | ArkUI-X SDK路径 | 是 | 是 | 是 |

语法：

```shell
ace check
```

无参数

执行结果参考：

```shell
ohos@user ~ % ace check
[√] ArkUI-X toolchains - develop for ArkUI-X devices
  • ArkUI-X SDK at /Users/ohos/ARKUI-X
  • Node.js Runtime Environment at /usr/local/bin/node
  • Java Sdk at /Library/Java/JavaVirtualMachines/jdk-18.0.2.1.jdk/Contents/Home
[√] OpenHarmony toolchains - develop for OpenHarmony devices
  • OpenHarmony SDK at /Users/ohos/openharmony/sdk
  • Node.js Runtime Environment at /usr/local/bin/node
  • Java Sdk at /Library/Java/JavaVirtualMachines/jdk-18.0.2.1.jdk/Contents/Home
[√] HarmonyOS toolchains - develop for HarmonyOS devices
  • HarmonyOS SDK at /Users/ohos/harmonyos/sdk
  • Node.js Runtime Environment at /usr/local/bin/node
  • Java Sdk at /Library/Java/JavaVirtualMachines/jdk-18.0.2.1.jdk/Contents/Home
[√] Android toolchains - develop for Android devices
  • Android SDK at /Users/ohos/Library/Android/sdk
[√] DevEco Studio [Requires DevEco Studio 3.1 Beta1, API Version 9+]
  • DevEco Studio at /Applications/deveco-studio.app
[!] Android Studio
  ! Android Studio is not installed, you can install in https://developer.android.google.cn/studio
[√] iOS toolchains - develop for iOS devices
  • Xcode 13.3Build version 13E113
  • idevicesyslog 1.3.0
  • 1.11.4
Tools info :[√] OpenHarmony hdc installed [√] HarmonyOS hdc installed [√] adb installed [√] ios-deploy installed
[√] Connected device (1 available)
  • iOS Devices	[....] Found 00008020-001C0D92146A002E (N841AP, iPhone XR, iphoneos, arm64e, 15.0, 19A346) a.k.a. 'iPhone Xr 15.0' connected through USB.

  √ Ace-check found no issues.

```

### ace devices

列出当前所有连接的设备，Windows平台上可以查询到当前连接的Android和OpenHarmony/HarmonyOS设备；Linux平台上可以查询到当前连接的Android设备；

Mac平台上可以查询到当前连接的Android，OpenHarmony/HarmonyOS和iOS设备。


语法：

```shell
ace devices
```

无参数

执行结果参考：

```shell
ohos@user ~ % ace devices
Tools info :[√] OpenHarmony hdc installed [√] HarmonyOS hdc installed [√] adb installed [√] ios-deploy installed
[√] Connected device (1 available)
  • iOS Devices	[....] Found 00008020-001C0D92146A002E (N841AP, iPhone XR, iphoneos, arm64e, 15.0, 19A346) a.k.a. 'iPhone Xr 15.0' connected through USB.
```

### ace create project

创建跨平台应用工程。

如果项目已存在，提示并询问开发者是否删除当前项目。

创建过程中，需要开发者依次填写工程名称和包名称，如果开发者不输入包名称，默认为com.example.工程名。


语法：

```shell
ace create project
```

删除已有项目提示：

```shell
The project already exists. Do you want to delete the directory (Y / N):
```

删除已有项目成功:

```shell
Delete directory successfully, creating new project...:
```

删除已有项目失败:

```shell
Failed to create project, project directory already exists!
```

提示输入工程名称：

```shell
Please input project name:
```

提示输入包名:

```shell
Please input package name: com.example.${projectName}:
```

提示输入RuntimeOS系统：

```shell
Please enter the system (1: OpenHarmony, 2: HarmonyOS):
```

提示输入项目模板：

```shell
Please enter the template (1: Empty Ability, 2: Native C++):
```

提示输入Ability类型：

```shell
Please enter the Ability Model Type (1: Stage, 2: FA):
```

提示输入项目版本：

```shell
Please enter the ACE version (1: 基于ArkTS的声明式开发范式, 2: 兼容JS的类Web开发范式):
```

创建完成:

```shell
Project created successfully! Target directory：${projectName}
```

### ace create module

新建跨平台应用模块(Module)


需要在新建的跨平台应用工程的source目录下执行，提示输入module名称：

```shell
Please input module name:
```

如果此module name已存在，会提示开发者${module name} already exists.，开发者修改名称后，回车确认，可以成功新建出跨平台应用模块(Module)。

### ace create ability

新建跨平台应用Ability


需要在新建的跨平台应用工程的source/具体module目录下执行，提示输入Ability名称：

```shell
Please enter the ability name:
```

如果此abilityname已存在，会提示开发者abilityName name already exists!.，开发者修改名称后，回车确认，可以成功新建出跨平台应用Ability。

### ace build

构建跨平台应用安装包。

语法：

```shell
ace build [options] [fileType]
```

在Windows和Linux平台上可构建Hap和Apk，在Mac平台上可构建Hap、Apk和App。

注：在DevEco Studio中打开要编译的工程配置自动签名，单击File > Project Structure > Project > Signing Configs界面勾选“Automatically generate signature”，等待自动签名完成即可，再执行ace build即可构建出签名hap安装包；在Mac上编译App之前需要使用Xcode打开对应ios工程，在Build settings的Singing进行签名配置，再执行编译命令；在Linux上无法签名。

- options

| 子命令                | 说明                                       |
| --------------------- | ------------------------------------------ |
| --target [moduleName] | 指定目标模块名进行构建。                   |
| -r --release          | 构建应用程序的类型为release(默认为Debug)。 |
| --nosign              | 构建出未签名的应用程序（仅App）。          |
| -h --help             | 显示帮助信息。                             |

- fileType

| 参数 | 说明                                                   |
| ---- | ------------------------------------------------------ |
| hap  | 生成OpenHarmony/HarmonyOS应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 生成Android应用 apk 包。                                  |
| app  | 生成iOS应用 app 包。                                   |

构建完成，提示包生成路径:

```shell
Build hap successfully.
filepath: /Users/ohos/WorkSpace/demo/ohos/entry/build/default/outputs/default
```

### ace install

将跨平台应用安装到连接的设备上。


语法：

```shell
ace install [options] [fileType]
```

在Windows和Linux平台上可以安装Hap和Apk应用包，在Mac平台上可以安装Hap、Apk和App应用包。

- options

| 子命令                | 说明                     |
| --------------------- | ------------------------ |
| -d [deviceId]         | 指定安装的设备Id。       |
| --device [deviceId]   | 指定安装的设备Id。       |
| --target [moduleName] | 指定目标模块名进行安装。 |

- fileType

| 参数 | 说明                                                   |
| ---- | ------------------------------------------------------ |
| hap  | 安装OpenHarmony/HarmonyOS应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 安装Android应用 apk 包。                                  |
| app  | 安装iOS应用 app 包。                                   |

安装完成：

```shell
ohos@user % ace install app
Install APP successfully.
```

### ace uninstall

将跨平台应用从连接的设备上卸载。

语法：

```shell
ace uninstall [options] [fileType]
```

- options

| 子命令                | 说明                   |
| --------------------- | ---------------------- |
| -d [deviceId]         | 指定卸载应用的设备Id。 |
| --device [deviceId]   | 指定卸载应用的设备Id。 |
| --bundle [bundleName] | 指定卸载应用的包名。   |

- fileType

| 参数 | 说明                                                   |
| ---- | ------------------------------------------------------ |
| hap  | 卸载OpenHarmony/HarmonyOS应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 卸载Android应用 apk 包。                                  |
| app  | 卸载iOS应用 app 包。                                   |

卸载完成：

```shell
ohos@user % ace uninstall --bundle com.example.${projectName} app
Uninstall APP successfully.
```

### ace log

滚动展示正在运行的跨平台应用的日志。

默认只输出跨平台应用进程相关日志。

语法：

```shell
ace log [options] [fileType]
```

- options

| 子命令              | 说明                   |
| ------------------- | ---------------------- |
| -d [deviceId]       | 指定日志应用的设备Id。 |
| --device [deviceId] | 指定日志应用的设备Id。 |

- fileType

| 参数 | 说明                                                |
| ---- | --------------------------------------------------- |
| hap  | 查看OpenHarmony/HarmonyOS应用日志，fileType未输入时，默认参数为hap。 |
| apk  | 查看Android应用日志。                                  |
| app  | 查看iOS应用日志。                                   |

### ace run

运行跨平台应用包。

ace run 先检查设备是否连接，确定设备类型，然后执行跨平台应用构建、安装、启动、输出应用进程log等操作。

在Windows平台上可以构建安装并运行Hap和Apk，在Linux平台上可以构建安装并运行Apk，仅能构建Hap，在Mac平台上可以构建安装并运行Hap、Apk和App。

语法：

```shell
ace run [options] [fileType]
```

- options

| 子命令              | 说明                   |
| ------------------- | ---------------------- |
| -d [deviceId]       | 指定运行应用的设备Id。 |
| --device [deviceId] | 指定运行应用的设备Id。 |

- fileType

| 参数 | 说明                                                         |
| ---- | ------------------------------------------------------------ |
| hap  | 构建并运行OpenHarmony/HarmonyOS应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 构建并运行Android应用 apk 包。                                  |
| app  | 构建并运行iOS应用 app 包。                                   |

### ace test
执行跨平台应用包单元测试。

ace test 先检查设备是否连接，确定设备类型，然后执行跨平台应用构建、安装、启动、执行单元测试、输出单元测试结果等操作。

在Windows平台上可以构建安装并测试Apk，在Linux平台上可以构建安装并测试Apk，在Mac平台上可以构建安装并测试Apk和App。

语法：

```shell
ace test [options] [fileType]
```

- options

| 子命令              | 说明                   |
| ------------------- | ---------------------- |
| -d [deviceId]       | 指定运行应用的设备Id。 |
| --device [deviceId] | 指定运行应用的设备Id。 |
| --b [testBundleName] | 指定测试应用的BundleName。 |
| --m [testModuleName] | 指定测试应用的ModuleName。 |
| --unittest [testRunner] | 指定测试应用的testRunner。 |
| --timeout [timeout] | 指定测试应用的单条用例的超时时间。 |

- fileType

| 参数 | 说明                                                         |
| ---- | ------------------------------------------------------------ |
| apk  | 构建并运行Android应用 apk 包。                                  |
| app  | 构建并运行iOS应用 app 包。                   

### ace clean

清理跨平台应用编译结果。

语法：

```shell
ace clean
```

清理完成：

```shell
Clean project successfully
```

### ace help

跨平台应用命令行工具帮助。

语法：

```shell
ace help <subcommand>
```

| 子命令    | 说明                                                         |
| --------- | ------------------------------------------------------------ |
| devices   | 列出所有连接的设备。                                         |
| check     | 查验跨平台应用开发环境。                                     |
| config    | 设置ACE工具链相关配置，包括OpenHarmony SDK路径、HarmonyOS SDK路径、Android SDK路径、Node.js路径、编译输出路径等。 |
| create    | 创建一个新的跨平台应用或者模块(Module)。                     |
| build     | 构建跨平台应用安装包。                                       |
| install   | 将跨平台应用安装到连接的设备上。                             |
| uninstall | 将跨平台应用从设备上卸载。                                   |
| launch    | 在设备上运行跨平台应用。                                     |
| log       | 滚动展示正在运行的跨平台应用的日志。                         |
| run       | 运行跨平台应用包。                                           |
| test      | 执行跨平台应用包单元测试。                                   |
| clean     | 清理跨平台应用编译结果。                                     |
| help      | 跨平台应用命令行工具帮助。                                   |

提示内容：

```shell
ohos@user % ace help
Usage: ace <command> [options]

Options:
  -V, --version                   output the version number
  -d, --device <device>           input device id to specify the device to do something
  -h, --help                      display help for command

Commands:
  create [subcommand]             create ace project/module/component/ability
  check                           check sdk environment
  devices                         list the connected devices.
  config [options]                
          --openharmony-sdk [OpenHarmony SDK]
          --harmonyos-sdk  [HarmonyOS SDK]
          --android-sdk   [Android Sdk]
          --deveco-studio-path [DevEco Studio Path]
          --android-studio-path [Android Studio Path]
          --build-dir     [Build Dir]
          --nodejs-dir    [Nodejs Dir]
          --java-sdk      [Java Sdk]
          --arkui-x-sdk   [ArkUI-X SDK]
  build [options] [fileType]      build hap/apk/app of moduleName
  install [options] [fileType]    install hap/apk/app on device
  uninstall [options] [fileType]  uninstall hap/apk/app on device
  run [options] [fileType]        run hap/apk on device
  launch [options] [fileType]     launch hap/apk on device
  log [fileType]                  show debug log
  clean                           clean project
  test [options] [fileType]       test apk/app on device
        --b                   [Test BundleName]
        --m                   [Test ModuleName]
        --unittest            [TestRunner]
        --timeout             [Test timeout]
  help [command]                  display help for command
```