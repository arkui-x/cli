# ArkUI跨平台应用构建命令行工具

ACE Command Tools，是一套为跨平台应用开发者提供的命令行工具，其功能包括开发环境检查，新建项目，编译打包，安装调试等。



## ACE命令行介绍

### ace config

设置 ace工具链相关配置，包括OpenHarmony sdk 路径，安卓sdk路径、nodejs 路径、编译输出路径等。 

语法：

```shell

ace config [options] <path>

```

| 参数          | 说明                |
| ------------- | ------------------- |
| --openharmony-sdk | OpenHarmony SDK路径。 |
| --android-sdk | Android SDK路径。    |
| --nodejs-dir  | nodejs 路径。        |
| --buid-dir    | 编译输出的路径。     |
| --deveco-studio-path | DevEco Studio安装路径（可选参数）。 |
| --android-studio-path | Android Studio安装路径（可选参数）。 |
| --java-sdk | JDK路径。 |

### ace check

查验跨平台应用开发环境。

需要检查的项：

| 检查内容         | 说明                         | Windows | Linux | Mac  |
| ---------------- | ---------------------------- | ------- | ----- | ---- |
| NodeJS           | nodejs 路径                  | 是      | 是    | 是   |
| OpenHarmony SDK  | OpenHarmony SDK路径          | 是      | 是    | 是   |
| Android SDK      | Android SDK路径              | 是      | 是    | 是   |
| DevEco Studio    | DevEco Studio安装路径        | 是      | 否    | 是   |
| Android Studio   | Android Studio安装路径       | 是      | 是    | 是   |
| 连接设备         | 当前连接的所有设备           | 是      | 是    | 是   |
| xcode            | 当前xcode的版本号            | 否      | 否    | 是   |
| libimobiledevice | 当前libimobiledevice的版本号 | 否      | 否    | 是   |
| ios-deploy       | 当前ios-deploy的版本号       | 否      | 否    | 是   |

语法：

```shell

ace check

```

无参数

执行结果参考：

```shell
ohos@user ~ % ace check
[√] OpenHarmony toolchains - develop for OpenHarmony devices
  • SDK at /Users/ohos/Desktop/sdk
  • Node.js Runtime Environment at /usr/local/bin/node
[√] Android toolchains - develop for Android devices
  • SDK at /Users/ohos/Library/Android/sdk
[√] DevEco Studio
  • DevEco Studio at /Applications/deveco-studio.app
[!] Android Studio
  ! Android Studio is not installed, you can install in https://developer.android.google.cn/studio
  • Java Sdk at /Library/Java/JavaVirtualMachines/jdk-18.0.2.1.jdk/Contents/Home
[√] iOS toolchains - develop for iOS devices
  • Xcode 13.3Build version 13E113
  • idevicesyslog 1.3.0
  • 1.11.4
Tools info :[×] hdc is not installed [√] adb installed [√] ios-deploy installed
[√] Connected device (1 available)
  • iOS Devices	[....] Found 00008020-001C0D92146A002E (N841AP, iPhone XR, iphoneos, arm64e, 15.0, 19A346) a.k.a. 'iPhone Xr 15.0' connected through USB.

  √ Ace-check found no issues.
```



### ace devices

列出当前所有连接的设备，Windows和Linux平台上可以查询到当前连接的安卓和鸿蒙设备；

Mac平台上可以查询到当前连接的安卓，鸿蒙和ios设备。



语法：

```shell

ace devices

```

无参数

执行结果参考：

```shell
ohos@user ~ % ace devices
Tools info :[×] hdc is not installed [√] adb installed [√] ios-deploy installed
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

删除已有项目成失败:

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

提示输入项目版本：

```shell

Please enter the ACE version (1: 声明式范式, 2: 类Web范式):

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

### ace build

构建跨平台应用安装包。

语法：

```shell

ace build [options] [fileType]

```

在Windows和Linux平台上可构建Hap和Apk，在Mac平台上可构建Hap、Apk和App。

注：在DevEco Studio中打开要编译的工程配置自动签名，单击File > Project Structure > Project > Signing Configs界面勾选“Automatically generate signature”，等待自动签名完成即可，再执行ace build即可构建出签名hap安装包；在Mac上编译App之前需要使用Xcode打开对应ios工程，在Build settings的Singing进行签名配置，再执行编译命令。

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
| hap  | 生成鸿蒙应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 生成安卓应用 apk 包。                                  |
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

| 子命令              | 说明               |
| ------------------- | ------------------ |
| -d [deviceId]       | 指定安装的设备Id。 |
| --device [deviceId] | 指定安装的设备Id。 |

- fileType

| 参数 | 说明                                                   |
| ---- | ------------------------------------------------------ |
| hap  | 安装鸿蒙应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 安装安卓应用 apk 包。                                  |
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
| hap  | 卸载鸿蒙应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 卸载安卓应用 apk 包。                                  |
| app  | 卸载iOS应用 app 包。                                   |

卸载完成：

```shell
ohos@user % ace uninstall --bundle com.example.${projectName} app
Uninstall APP successfully.
```



### ace log

滚动展示正在运行的跨平台应用的 log。

默认只输出跨平台应用进程相关 log。



语法：

```shell

ace log [options] [fileType]

```

- options

| 子命令              | 说明                   |
| ------------------- | ---------------------- |
| -d [deviceId]       | 指定卸载应用的设备Id。 |
| --device [deviceId] | 指定卸载应用的设备Id。 |

- fileType

| 参数 | 说明                                                |
| ---- | --------------------------------------------------- |
| hap  | 查看鸿蒙应用日志，fileType未输入时，默认参数为hap。 |
| apk  | 查看安卓应用日志。                                  |
| app  | 查看iOS应用日志。                                   |



### ace run

运行跨平台应用包。

ace run 先检查设备是否连接，确定设备类型，然后执行跨平台应用构建、安装、启动、输出应用进程log等操作。

在Windows和Linux平台上可以构建安装并运行Hap和Apk，在Mac平台上可以构建安装并运行Hap、Apk和App。

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
| hap  | 构建并运行鸿蒙应用 hap 包，fileType未输入时，默认参数为hap。 |
| apk  | 构建并运行安卓应用 apk 包。                                  |
| app  | 构建并运行iOS应用 app 包。                                   |

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
| config    | 设置 ace工具链相关配置，包括OpenHarmony sdk 路径，安卓sdk路径、nodejs 路径、编译输出路径等。 |
| create    | 创建一个新的跨平台应用或者模块(Module)。                     |
| build     | 构建跨平台应用安装包。                                       |
| install   | 将跨平台应用安装到连接的设备上。                             |
| uninstall | 将跨平台应用从设备上卸载。                                   |
| launch    | 在设备上运行跨平台应用。                                     |
| log       | 滚动展示正在运行的跨平台应用的 log。                         |
| run       | 运行跨平台应用包。                                           |
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
  create [subcommand]             create ace project/module/component
  check                           check sdk environment
  devices                         list the connected devices.
  config [options]                
          --openharmony-sdk [OpenHarmony SDK]
          --android-sdk   [Android Sdk]
          --deveco-studio-path [DevEco Studio Path]
          --android-studio-path [Android Studio Path]
          --build-dir     [Build Dir]
          --nodejs-dir    [Nodejs Dir]
          --java-sdk      [Java Sdk]
  build [options] [fileType]      build hap/apk/app of moduleName
  install [options] [fileType]    install hap/apk/app on device
  uninstall [options] [fileType]  uninstall hap/apk/app on device
  run [options] [fileType]        run hap/apk on device
  launch [options] [fileType]     launch hap/apk on device
  log [fileType]                  show debug log
  clean                           clean project
  help [command]                  display help for command
```

