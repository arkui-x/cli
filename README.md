# ArkUI跨平台应用构建命令行工具

ACE Command Tools，是一套为 ACE 开发者提供的命令行工具，包括开发环境检查，新建项目，编译打包，安装调试。



## ACE命令行介绍

### ace config

配置 ace 的设置，包括鸿蒙 sdk 路径，安卓sdk路径、nodejs 路径、编译输出的路径等，若需要去掉一个设置，将其值设置为空即可。 

设置的项为全局统一，暂不支持不同的项目配置不同的值。

语法：

```

ace config [options]

```

| 参数          | 说明                |
| ------------- | ------------------- |
| --openharmony-sdk | OpenHarmony SDK路径 |
| --android-sdk | Android SDK路径     |
| --nodejs-dir  | nodejs 路径         |
| --buid-dir    | 编译输出的路径      |
| --deveco-studio-path | DevEco Studio安装路径（可选参数） |
| --android-studio-path | Android Studio安装路径（可选参数） |
| --java-sdk | JDK路径 |

### ace check

检查 ace 应用需要依赖的库和工具链。

需要检查的项：

| 检查内容         | 说明                         | 必选项 | Windows | Linux | Mac  |
| ---------------- | ---------------------------- | ------ | ------- | ----- | ---- |
| NodeJS           | nodejs 路径                  | 是     | 是      | 是    | 是   |
| OpenHarmony SDK  | OpenHarmony SDK路径          | 是     | 是      | 是    | 是   |
| Android SDK      | Android SDK路径              | 是     | 是      | 是    | 是   |
| DevEco Studio    | DevEco Studio安装路径        | 否     | 是      | 否    | 是   |
| Android Studio   | Android Studio安装路径       | 否     | 是      | 是    | 是   |
| 连接设备         | 当前连接的所有设备           | 否     | 是      | 是    | 是   |
| xcode            | 当前xcode的版本号            | 是     | 否      | 否    | 是   |
| libimobiledevice | 当前libimobiledevice的版本号 | 是     | 否      | 否    | 是   |
| ios-deploy       | 当前ios-deploy的版本号       | 是     | 否      | 否    | 是   |

语法：

```

ace check

```

无参数



### ace devices

列出当前所有连接的设备，Windows和Linux平台上可以查询到当前连接的安卓和鸿蒙设备；

Mac平台上可以查询到当前连接的安卓，鸿蒙和ios设备。



语法：

```

ace devices

```

无参数

### ace create project

创建一个新的ace应用工程。



1. 如果在一个已经存在的 ace 工程中执行，则会修复这个功能，将缺失的文件补齐。

2. 如果项目已存在，需要警告开发者，并询问是否删除当前项目。



创建过程中，需要开发者依次填写工程名称和包名称，其中包名称自动生成，开发者可回车确认。

包名默认为com.example.工程名；项目版本如果开发者不输入，点击回车默认为类Web范式。



语法：

```

ace create project <project name>

```

删除已有项目提示：

```

The project already exists. Do you want to delete the directory (Y / N):

```

删除已有项目成功和失败:

```

Delete directory successfully, creating new project...:

Failed to create project, project directory already exists!

```

提示输入工程名称：

```

Please input project name:

```

提示输入包名:

```

Please input package name: com.example.${projectName}:

```

提示输入项目版本：

```

Please enter the ACE version (1: 类Web范式, 2: 声明式范式):

```

创建完成:

```

Project created successfully! Target directory：${projectName}

```

注：packageName不能重复，并且创建hap与apk不能通用一个packageName。

### ace create module

新建ace应用模块(Module)



需要在新建的ace应用工程的source文件下执行，提示输入module名称：

```

Please input module name:

```

如果此module name已存在，会提示开发者${module name} already exists.，开发者修改名称后，回车确认，可以成功新建出ace应用模块(Module)。

### ace build

构建ace应用安装包。

语法：

```

ace build [options] [fileType]

```

在Windows和Linux平台上只能构建出Hap和Apk，在Mac平台上能构建出Hap、Apk和App。

- options

| 参数                  | 说明                                     |
| --------------------- | ---------------------------------------- |
| --target [moduleName] | 指定目标模块名进行构建                   |
| -r --release          | 构建应用程序的类型为release(默认为Debug) |
| --nosign              | 构建出未签名的应用程序                   |
| -h, --help            | 显示帮助信息                             |

- fileType

| 参数 | 说明                  |
| ---- | --------------------- |
| hap  | 生成鸿蒙应用 hap 包。 |
| apk  | 生成安卓应用 apk 包。 |
| app  | 生成iOS应用 app 包。  |

### ace install

将 ace 应用安装到连接的设备上。



语法：

```

ace install <subcommand>

```



| 子命令 | 说明                       |
| ------ | -------------------------- |
| hap    | 安装鸿蒙应用 hap 包。 默认 |
| apk    | 安装安卓应用 apk 包。      |
| app    | 安装iOS应用 app 包。       |

### ace launch

在设备上运行 ace 应用。

语法：

```

ace launch [arguments] <subcommand>

```



| 参数    | 说明                                                         |
| ------- | ------------------------------------------------------------ |
| --entry | 指定启动的入口文件，若是 hap，默认入口文件为 config.json 中配置的，若是 apk，默认入口文件是 Manifest.json 中配置的。 |



| 子命令 | 说明                       |
| ------ | -------------------------- |
| hap    | 启动鸿蒙应用 hap 包。 默认 |
| apk    | 启动安卓应用 apk 包。      |

### ace log

滚动展示正在运行的 ace 应用的 log。

默认只输出 ace 进程的 log。



语法：

```

ace log

```

无参数



### ace run

编译并在设备上运行 ace 应用。



ace run 是 ace devices, ace build, ace install, ace launch 和 ace log 的合集。

ace run 先检查设备是否连接，确定设备类型。

在Windows和Linux平台上只可以编译并运行Hap和Apk，在iOS平台上可以编译并运行Hap、Apk和App。

语法：

```

ace run [fileType]

```



| 子命令 | 说明                             |
| ------ | -------------------------------- |
| hap    | 编译并运行鸿蒙应用 hap 包。 默认 |
| apk    | 编译并运行安卓应用 apk 包。      |
| app    | 编译并运行iOS应用 app 包。       |

### ace help

ace 命令行工具帮助。



语法：

```

ace help <subcommand>

```



| 子命令  | 说明                                                         |
| ------- | ------------------------------------------------------------ |
| devices | 列出所有连接的设备。                                         |
| check   | 检查 ace 应用需要依赖的库和工具链。                          |
| config  | 包括鸿蒙 sdk 路径，安卓sdk路径、nodejs 路径、编译输出的路径等。 |
| create  | 创建一个新的ace应用或者模块(Module)。                        |
| build   | 构建跨平台应用安装包。                                       |
| install | 将 ace 应用安装到连接的设备上。                              |
| launch  | 在设备上运行 ace 应用。                                      |
| log     | 滚动展示正在运行的 ace 应用的 log。                          |
| run     | 编译并在设备上运行 ace 应用。                                |
