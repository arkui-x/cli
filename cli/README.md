# ArkUI跨平台应用构建命令行工具

ACE Command Tools，是一套为 ACE 开发者提供的命令行工具，包括开发环境检查，新建项目，编译打包，安装调试。



## ACE命令行介绍

+ ### ace config

配置 ace 的设置，包括鸿蒙 sdk 的路径，编译输出的路径，开发证书路径等，若需要去掉一个设置，将其值设置为空即可。 

设置的项为全局统一，暂不支持不同的项目配置不同的值。

语法：

```

ace config [arguments]

```



| 参数          | 说明                |
| ------------- | ------------------- |
| --openharmony-sdk | OpenHarmony SDK路径 |
| --android-sdk | Android SDK路径     |
| --nodejs-dir  | nodejs 路径         |
| --buid-dir    | 编译输出的路径      |

+ ### ace check

检查 ace 应用需要依赖的库和工具链。



需要检查的项：

1. NodeJS（必选）
2. OpenHarmony SDK and License（必选）
3. Android SDK and License（必选）
4. DevEco Studio（可选）
5. Android Studio（可选）
6. 设备是否连接（可选，如未连接，不能执行 install, launch, log, run）



语法：

```

ace check

```

无参数

+ ### ace devices

列出所有连接的设备，结果同 adb devices。



语法：

```

ace devices

```

无参数

+ ### ace create project

创建一个新的 ace 应用。



1. 如果在一个已经存在的 ace 工程中执行，则会修复这个功能，将缺失的文件补齐。

2. 如果项目已存在，需要警告开发者，并询问是否删除当前项目。



创建过程中，需要开发者依次填写工程名称和包名称，其中包名称自动生成，开发者可回车确认。

包名默认为com.example.工程名。



语法：

```

ace create project <output directory>

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

packageName不能重复，并且创建hap与apk不能通用一个packageName。


+ ### ace create module

提示输入module名称：

```

Please input module name:

```

+ ### ace create component

提示输入component名称：

```

Please input component name:

```

+ ### ace build

编译打包该项目。



语法：

```

ace build [arguments] <subcommand>

```



| 子命令 | 说明                  |
| ------ | --------------------- |
| Hap    | 生成鸿蒙应用 hap 包。 |
| Apk    | 生成安卓应用 apk 包。 |

+ ### ace install

将 ace 应用安装到连接的设备上。



语法：

```

ace install <subcommand>

```



| 子命令 | 说明                       |
| ------ | -------------------------- |
| hap    | 安装鸿蒙应用 hap 包。 默认 |
| Apk    | 安装安卓应用 apk 包。      |

+ ### ace launch

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
| Apk    | 启动安卓应用 apk 包。      |

+ ### ace log

滚动展示正在运行的 ace 应用的 log。

默认只输出 ace 进程的 log。



语法：

```

ace log

```

无参数



+ ### ace run

编译并在设备上运行 ace 应用。



ace run 是 ace devices, ace build, ace install, ace launch 和 ace log 的合集。

ace run 先检查设备是否连接，确定设备类型。



语法：

```

ace run [subcommand]

```



| 子命令 | 说明                             |
| ------ | -------------------------------- |
| hap    | 编译并运行鸿蒙应用 hap 包。 默认 |
| Apk    | 编译并运行安卓应用 apk 包。      |

+ ### ace help

ace 命令行工具帮助。



语法：

```

ace help <subcommand>

```



| 子命令  | 说明                                                   |
| ------- | ------------------------------------------------------ |
| device  | 列出所有连接的设备，结果同 adb devices。               |
| check   | 检查 ace 应用需要依赖的库和工具链。                    |
| config  | 配置 ace 的设置，包括鸿蒙 sdk 的路径，编译输出的路径等 |
| init    | 创建一个新的 ace 应用。                                |
| build   | 编译打包该项目。                                       |
| install | 将 ace 应用安装到连接的设备上。                        |
| launch  | 在设备上运行 ace 应用。                                |
| log     | 滚动展示正在运行的 ace 应用的 log。                    |
| run     | 编译并在设备上运行 ace 应用。                          |
