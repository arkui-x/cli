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
/developtools/ace_tools
├── lib/src/cli                 # 命令相关
│   ├── ace-build               # 构建跨平台应用安装包
│   ├── ace-check               # 查验跨平台应用开发环境
│   ├── ace-clean               # 清理跨平台应用编译结果
│   ├── ace-config              # 设置ACE工具链相关配置
│   ├── ace-create              # 创建跨平台应用工程及应用模块
│   ├── ace-devices             # 查询当前所有连接的设备
│   ├── ace-help                # 帮助命令
│   ├── ace-install             # 将跨平台应用安装到连接的设备上
│   ├── ace-launch              # 在设备上运行ArkUI跨平台应用
│   ├── ace-log                 # 展示正在运行的跨平台应用的日志
│   ├── ace-run                 # 编译并在设备上运行ArkUI跨平台应用
|   ├── ace-test                # 执行跨平台应用包单元测试
│   ├── ace-uninstall           # 将跨平台应用从连接的设备上卸载
│   └── util                    # 工具模块
├── lib
│   └── ace_tools.js            # 入口脚本
└── templates                   # 模板相关
    ├── android                 # Android工程模板
    ├── cpp                     # Native C++配置模板
    ├── cpp_ets_stage           # Stage Native C++开发模板
    ├── ets_stage               # Stage开发模板
    ├── framework               # framework工程模板
    ├── ios                     # iOS工程模板
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
| --ohpm-dir  | Ohpm路径 |

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
| ArkUI-X SDK      | ArkUI-X SDK路径             | 是      | 是     | 是 |
| ohpm             | ohpm路径                    | 是      | 是     | 是 |

语法：

```shell
ace check
```

- options

| 子命令                | 说明                                       |
| --------------------- | ------------------------------------------ |
| -v                    | 显示详细结果                   |
| -h --help             | 显示帮助信息。                             |

执行结果参考：

```shell
ohos@user ~ % ace check
Check summary (to see all details, run ace check -v)
[√] ArkUI-X (ArkUI-X SDK version 1.1.1.5)
[√] OpenHarmony toolchains - develop for OpenHarmony devices (OpenHarmony SDK version 4.0.9.6)
[√] HarmonyOS toolchains - develop for HarmonyOS devices (HarmonyOS SDK version 3.1.0)
[√] Android toolchains - develop for Android devices (Android SDK version 34.0.0)
[√] DevEco Studio (version 4.0.3)
[√] Android Studio (version 2022.3)
[√] Xcode - develop for iOS (Xcode 14.3.1)
Tools info :[√] OpenHarmony hdc installed
            [√] HarmonyOS hdc installed
            [√] adb installed
            [√] ios-deploy installed
[√] Connected device (1 available)
  •  iPhone 14 Pro Max (1058643C-A725-4E19-AA62-781588C94A7F) [iOS Simulator]

  √ ACE Tools found no issues.

ohos@user ~ % ace check -v
[√] ArkUI-X (ArkUI-X SDK version 1.1.1.5)
  • ArkUI-X SDK at /Users/ohos/Library/ArkUI-X/Sdk
  • Node.js (v18.17.1) Runtime Environment at /usr/local/n/versions/node/18.17.1/
  • libimobiledevice 1.3.0
  • ios-deploy 1.12.2
[√] OpenHarmony toolchains - develop for OpenHarmony devices (OpenHarmony SDK version 4.0.9.6)
  • OpenHarmony SDK at /Users/ohos/Library/OpenHarmony/Sdk
  • Ohpm at /Users/ohos/Library/Huawei/ohpm
  • Java Sdk at /Applications/deveco-studio.app/Contents/jbr/Contents/Home
  • OpenJDK Runtime Environment JBR-17.0.6+10-829.5-jcef (build 17.0.6+10-b829.5)
[√] HarmonyOS toolchains - develop for HarmonyOS devices (HarmonyOS SDK version 3.1.0)
  • HarmonyOS SDK at /Users/ohos/Library/Huawei/Sdk
  • Ohpm at /Users/ohos/Library/Huawei/ohpm
  • Java Sdk at /Applications/deveco-studio.app/Contents/jbr/Contents/Home
  • OpenJDK Runtime Environment JBR-17.0.6+10-829.5-jcef (build 17.0.6+10-b829.5)
[√] Android toolchains - develop for Android devices (Android SDK version 34.0.0)
  • Android SDK at /Users/ohos/Library/Android/sdk
  • Java Sdk at /Applications/Android Studio.app/Contents/jbr/Contents/Home
  • OpenJDK Runtime Environment (build 17.0.6+0-17.0.6b829.9-10027231)
[√] DevEco Studio (version 4.0.3)
  • DevEco Studio at /Applications/deveco-studio.app
  • Java Sdk at /Applications/deveco-studio.app/Contents/jbr/Contents/Home
  • OpenJDK Runtime Environment JBR-17.0.6+10-829.5-jcef (build 17.0.6+10-b829.5)
[√] Android Studio (version 2022.3)
  • Android Studio at /Applications/Android Studio.app
  • Java Sdk at /Applications/Android Studio.app/Contents/jbr/Contents/Home
  • OpenJDK Runtime Environment (build 17.0.6+0-17.0.6b829.9-10027231)
[√] Xcode - develop for iOS (Xcode 14.3.1)
  • Xcode at /Applications/Xcode.app
  • Build version 14E300c
Tools info :[√] OpenHarmony hdc installed
            [√] HarmonyOS hdc installed
            [√] adb installed
            [√] ios-deploy installed
[√] Connected device (1 available)
  •  iPhone 14 Pro Max (1058643C-A725-4E19-AA62-781588C94A7F) [iOS Simulator]

  √ ACE Tools found no issues.

```

### ace devices

列出当前所有连接的设备，Windows平台上可以查询到当前连接的Android(包括Android Studio的模拟器)和OpenHarmony/HarmonyOS设备；Linux平台上可以查询到当前连接的Android设备；

Mac平台上可以查询到当前连接的Android(包括Android Studio的模拟器)，OpenHarmony/HarmonyOS，iOS设备和Mac自带的iOS模拟器(可通过命令行open -a Simulator启动，需要安装Xcode)。


语法：

```shell
ace devices
```

无参数

执行结果参考：

```shell
ohos@user ~ % ace devices
Tools info :[√] OpenHarmony hdc installed
            [√] HarmonyOS hdc installed
            [√] adb installed
            [√] ios-deploy installed
[√] Connected device (2 available)
  •  sdk_gphone64_x86_64 (emulator-5554) [Android]
  •  iPhone 14 Pro Max (1058643C-A725-4E19-AA62-781588C94A7F) [iOS Simulator]
```

### ace create project

创建跨平台应用工程。

如果项目已存在，提示并询问开发者是否删除当前项目。

创建过程中，需要开发者依次填写工程名称和包名称，如果开发者不输入包名称，默认为com.example.工程名。


语法：

```shell
ace create <output directory>
```

- options

| 子命令                | 说明                                       |
| --------------------- | ------------------------------------------ |
| -t \| --template \[type\]     | 指定创建工程                   |
| -h --help             | 显示帮助信息。                             |

- type

type                | 说明                                       |
| --------------------- | ------------------------------------------ |
app | 创建普通arkui-下应用工程 |
library | 创建aar/framewor工程 |
plugin_napi | 创建native工程 |

在当前目录创建test工程：

```shell
ohos@user Desktop % ace create test
? Please enter the project name(test): # 输入工程名称，不输入默认为文件夹名称
? Please enter the bundleName (com.example.test):  # 输入包名，不输入默认为com.example.工程名
? Please enter the runtimeOS (1: OpenHarmony, 2: HarmonyOS): 1 # 输入RuntimeOS系统
Check summary (to see all details, run ace check -v)
[√] ArkUI-X (ArkUI-X SDK version 1.1.1.5)
[√] OpenHarmony toolchains - develop for OpenHarmony devices (OpenHarmony SDK version 4.0.9.6)
[√] HarmonyOS toolchains - develop for HarmonyOS devices (HarmonyOS SDK version 3.1.0)
[√] Android toolchains - develop for Android devices (Android SDK version 34.0.0)
[√] DevEco Studio (version 4.0.3)
[√] Android Studio (version 2022.3)
[√] Xcode - develop for iOS (Xcode 14.3.1)
Tools info :[√] OpenHarmony hdc installed
            [√] HarmonyOS hdc installed
            [√] adb installed
            [√] ios-deploy installed
[√] Connected device (1 available)
  •  iPhone 14 Pro Max (1058643C-A725-4E19-AA62-781588C94A7F) [iOS Simulator]

  √ ACE Tools found no issues.
? The project already exists. Do you want to delete the directory (y / n): n
Failed to create project, project directory already exists.
```

删除已有项目提示：

```shell
The project already exists. Do you want to delete the directory (y / n):
```

删除已有项目成功:

```shell
Delete directory successfully, creating new project...:
```

删除已有项目失败:

```shell
Failed to create project, project directory already exists!
```

### ace new module

新建跨平台应用模块(Module)


需要在新建的跨平台应用工程的根目录下执行，提示输入module名称：

```shell
Please enter the module name:
```

如果此module name已存在，会提示开发者${module name} already exists.，开发者修改名称后，回车确认，可以成功新建出跨平台应用模块(Module)。

### ace new ability

新建跨平台应用Ability


需要在新建的跨平台应用工程的根目录/具体module目录下执行，提示输入Ability名称：

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
| -r --release          | 构建应用程序的类型为release(默认为release)。 |
| --debug               | 构建应用程序的类型为debug。               |
| --nosign              | 构建出未签名的应用程序（仅App）。          |
| -h --help             | 显示帮助信息。                             |
| -s --simulator        | 构建ios模拟器对应包                             |

- fileType

| 参数 | 说明                                                   |
| ---- | ------------------------------------------------------ |
| hap  | 生成OpenHarmony/HarmonyOS应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 生成Android应用 apk 包。                                  |
| ios  | 生成iOS应用 app 包。                                   |
| aar  | 生成Android应用 aar 包。                                   |
| ios-framework  | 生成iOS应用 framework 包。                                   |
| ios-xcframework  | 生成iOS应用 xcframework 包。                                   |

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
命令会根据options提示开发者选择对应平台的设备，如果只有一个设备连接，会直接安装到该设备上。
注：编译Release版本的Apk需要签名才能安装，请通过Android Studio完成签名或者编译Debug版本Apk安装。

- options

| 子命令                | 说明                     |
| --------------------- | ------------------------ |
| --target [moduleName] | 指定目标模块名进行安装。 |
| -d --device [deviceId]| 指定运行应用的设备Id。 |
| -h --help             | 显示帮助信息。                             |

- fileType

| 参数 | 说明                                                   |
| ---- | ------------------------------------------------------ |
| hap  | 安装OpenHarmony/HarmonyOS应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 安装Android应用 apk 包。                                  |
| ios  | 安装iOS应用 app 包。                                   |

安装完成：

```shell
ohos@user % ace install app
[1]:  iPhone 14 Pro (67B40DC8-111C-4B30-9987-08E3BE30016A) [iOS Simulator]
[2]:  iPhone 14 Pro Max (1058643C-A725-4E19-AA62-781588C94A7F) [iOS Simulator]
? Please choose one (or "q" to quit): 2
Install IOS successfully.
```

### ace uninstall

将跨平台应用从连接的设备上卸载。命令会根据options提示开发者选择对应平台的设备，如果只有一个设备连接，会直接卸载该设备上的应用。

语法：

```shell
ace uninstall [options] [fileType]
```

- options

| 子命令                | 说明                   |
| --------------------- | ---------------------- |
| --bundle [bundleName] | 指定卸载应用的包名。   |
| -d --device [deviceId]| 指定运行应用的设备Id。 |
| -h --help             | 显示帮助信息。                             |

- fileType

| 参数 | 说明                                                   |
| ---- | ------------------------------------------------------ |
| hap  | 卸载OpenHarmony/HarmonyOS应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 卸载Android应用 apk 包。                                  |
| ios  | 卸载iOS应用 app 包。                                   |

卸载完成：

```shell
ohos@user % ace uninstall ios --bundle com.example.${projectName}
[1]:  iPhone 14 Pro (67B40DC8-111C-4B30-9987-08E3BE30016A) [iOS Simulator]
[2]:  iPhone 14 Pro Max (1058643C-A725-4E19-AA62-781588C94A7F) [iOS Simulator]
? Please choose one (or "q" to quit): 2
Uninstall IOS successfully.
```

### ace launch

在设备上运行跨平台应用。命令会根据options提示开发者选择对应平台的设备，如果只有一个设备连接，会直接运行该设备上的应用。需要在设备上安装跨平台应用后才能运行。

语法：

```shell
ace launch [options] [fileType]
```

- options

| 子命令                | 说明                   |
| --------------------- | ---------------------- |
| -d --device [deviceId]| 指定运行应用的设备Id。 |
| -h --help             | 显示帮助信息。                             |

- fileType

| 参数 | 说明                                                   |
| ---- | ------------------------------------------------------ |
| hap  | 运行OpenHarmony/HarmonyOS应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 运行Android应用 apk 包。                                  |
| ios  | 运行iOS应用 app 包。                                   |

运行完成：

```shell
ohos@user % ace launch ios
[1]:  iPhone 14 Pro (67B40DC8-111C-4B30-9987-08E3BE30016A) [iOS Simulator]
[2]:  iPhone 14 Pro Max (1058643C-A725-4E19-AA62-781588C94A7F) [iOS Simulator]
? Please choose one (or "q" to quit): 2
Launch IOS successfully.
```

### ace log

滚动展示正在运行的跨平台应用的日志。命令会根据options提示开发者选择对应平台的设备，如果只有一个设备连接，会直接展示该设备上的应用日志。

默认只输出跨平台应用进程相关日志。

语法：

```shell
ace log [options] [fileType]
```

- options

| 子命令              | 说明                   |
| ------------------- | ---------------------- |
| -d --device [deviceId]| 指定运行应用的设备Id。 |
| -h --help             | 显示帮助信息。                             |

- fileType

| 参数 | 说明                                                |
| ---- | --------------------------------------------------- |
| hap  | 查看OpenHarmony/HarmonyOS应用日志，fileType未输入时，默认参数为hap。 |
| apk  | 查看Android应用日志。                                  |
| ios  | 查看iOS应用日志。                                   |

```
ohos@user % ace log ios
[1]:  iPhone 14 Pro (67B40DC8-111C-4B30-9987-08E3BE30016A) [iOS Simulator]
[2]:  iPhone 14 Pro Max (1058643C-A725-4E19-AA62-781588C94A7F) [iOS Simulator]
? Please choose one (or "q" to quit): 2
Filtering the log data using "process == "app""
```

### ace run

运行跨平台应用包。

ace run 先检查设备是否连接，确定设备类型，然后执行跨平台应用构建、安装、启动、输出应用进程log等操作。命令会根据options提示开发者选择对应平台的设备，如果只有一个设备连接，应用会安装到该设备并运行。

在Windows平台上可以构建安装并运行Hap和Apk，在Linux平台上可以构建安装并运行Apk，仅能构建Hap，在Mac平台上可以构建安装并运行Hap、Apk和App。

语法：

```shell
ace run [options] [fileType]
```

- options

| 子命令              | 说明                   |
| ------------------- | ---------------------- |
| -d --device [deviceId]| 指定运行应用的设备Id。 |
| -h --help             | 显示帮助信息。                             |

- fileType

| 参数 | 说明                                                         |
| ---- | ------------------------------------------------------------ |
| hap  | 构建并运行OpenHarmony/HarmonyOS应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 构建并运行Android应用 apk 包。                                  |
| ios  | 构建并运行iOS应用 app 包。                                   |

```
ohos@user % ace run ios
[1]:  iPhone 14 Pro (67B40DC8-111C-4B30-9987-08E3BE30016A) [iOS Simulator]
[2]:  iPhone 14 Pro Max (1058643C-A725-4E19-AA62-781588C94A7F) [iOS Simulator]
? Please choose one (or "q" to quit): 2
```


### ace test
执行跨平台应用包单元测试。

ace test 先检查设备是否连接，确定设备类型，然后执行跨平台应用构建、安装、启动、执行单元测试、输出单元测试结果等操作。

在Windows平台上可以构建安装并测试Apk，在Linux平台上可以构建安装并测试Apk，在Mac平台上可以构建安装并测试Apk和App，暂时不支持iOS模拟器上的单元测试。

相关说明参见 [xts](https://gitee.com/arkui-x/xts)

语法：

```shell
ace test [options] [fileType]
```

- options

| 子命令              | 说明                   |
| ------------------- | ---------------------- |
| -d --device [deviceId]| 指定运行应用的设备Id。 |
| --b [testBundleName] | 指定测试应用的BundleName。 |
| --m [testModuleName] | 指定测试应用的ModuleName。 |
| --unittest [testRunner] | 指定测试应用的testRunner。 |
| --timeout [timeout] | 指定测试应用的单条用例的超时时间。 |
| --skipInstall | 已安装情况跳过安装直接测试.（仍需依赖app/apk包，若指定了'path'则使用'path'下的app/apk包，否则使用默认路径下的app/apk包） |
| --path [path] | 指定应用包路径用于直接安装测试。 |

- fileType

| 参数 | 说明                                                         |
| ---- | ------------------------------------------------------------ |
| apk  | 构建并运行Android应用 apk 包。                                  |
| ios  | 构建并运行iOS应用 app 包。                                    |

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
Manage your ArkUI app development.

Common commands:

  ArkUI create [options] [subcommand]
  Create a new ArkUI project in the specified directory.

  ArkUI run [options] [fileType]
  Run your ArkUI application on an attached device or in an emulator.
    
Usage: ace <command> [options]

Options:
  -V, --version          output the version number
  -d, --device <device>  input device id to specify the device to do something
  -h, --help             display help for command

Available commands:

Environment: 
  check   		 Show information about the installed tooling.
  config   		 Configure ArkUI settings.

Device: 
  devices   		 List the connected devices.

Project: 
  create   		 Create a new ArkUI project.
  new   		 Create a new ability/module to your project.
  build   		 Build an executable app or install bundle.
  clean   		 Delete the build/ directories.

Application: 
  install   		 Install an ArkUI app on an attached device.
  uninstall   		 Uninstall an ArkUI app on an attached device.
  run   		 Run your ArkUI app on an attached device.
  launch   		 Launch  your ArkUI app on an attached device.
  log   		 Show log output for running ArkUI apps.
  test   		 Run ArkUI unit tests for the current project.

Auxiliary: 

Run "ace help <command>" for more information about a command.
```
