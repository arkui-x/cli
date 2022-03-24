# 快速指南

## 环境安装

在使用命令行工具创建工程之前，请先检查本地开发环境：

1. NodeJS

   命令行运行 `node -v` 查看本地nodejs版本。如不存在，请自行下载安装新的稳定版本：[NodeJS下载地址](https://nodejs.org/en/download/)。

2. Java

   命令行运行 `java -version` 查看本地Java版本。如不存在，请自行下载安装新的稳定版本，同时配置相关环境变量：[JDK下载地址](https://www.oracle.com/java/technologies/javase-downloads.html)

3. Harmony SDK

   编译 hap 需要，目前Harmony SDK 只支持通过 DevEco 安装获得。如不存在，请自行下载安装对应版本：[DevEco Studio下载地址](https://developer.harmonyos.com/cn/develop/deveco-studio#download)

4. Android SDK

   编译 apk 需要，Android SDK 支持多种方式获得：下载安装 Android Studio 自动获得、仅下载 SDK Manager 安装获得。请自行选择下载Android Studio 或 	SDK tools package：[Android Studio 及 SDK Manager下载地址](https://developer.android.com/studio)

## 依赖安装

有两种方式可以运行框架，分别需要安装相关依赖：

1. 如果获得了项目的源码，则可以在项目根目录下执行

```
npm install . -g
```

安装所需依赖包。

*注：如果命令报错，可能需要多次卸载并执行*

2. 如果获得了打包后的 ace_tools.js 文件和 ace 脚本文件，需要配置 ace 到环境变量：在 Path 中添加 ace 脚本的解压目录。

## 创建应用

接下来从零开始，通过命令行工具完成项目创建，编译打包，安装调试。

首先进入项目的根目录

```
cd ..
cd ace_tools/
```
1. ### 检查开发环境

```
ace check
```

执行 `ace check` 命令可以检查上述的本地开发环境。对于必选项，需要检查通过，否则无法继续接下来的操作。

*注：该命令已经集成在工程创建中，可跳过。建议执行。*

2. ### 检查设备连接

```
ace devices
```

获得当前连接的设备devices 及 deviceID。后续命令的参数需要加 deviceID，可随时执行查看。

*注：该命令已经集成在 ` ace check` 中，可跳过。*

3. ### 配置 ace 设置

```
ace config
```

检查当前是否有设备连接，以便后续应用的安装、启动等操作正确执行。

*注：该命令已经集成在上述 `ace check` 中，可跳过。*

4. ### 创建project

以创建一个 ‘demo’  项目为例：

```
ace create project
? Please enter the project name: demo
? Please enter the packages (com.example.demo):
? Please enter the ACE version (1: 类Web范式, 2: 声明式范式): 2
```

执行 `ace create project` 命令（project 可省略），接着输入项目名 demo ，包名直接回车默认即可。输入“2”代表创建ArkUI声明式应用项目。

一个名为 ‘demo’ 的项目就创建成功了。

## 编写代码

在上述工程创建完成后，便可以修改源码以用于开发调试。

## 项目编译

开始对 'demo' 项目进行编译。编译分为hap 和 apk：

```
cd demo
```

1. 编译hap，默认编译所有Module

   ```
   ace build hap
   ```

   每个Module生成一个hap应用文件，默认路径为 demo/ohos/entry/build/outputs/hap/debug/。

2. 编译hap，只编译指定的Module

   ```
   ace build hap --target moduleName
   ```

   最终会生成一个hap应用文件。默认路径为 demo/ohos/moduleName/build/outputs/hap/debug/。

   *注：多个Module可分别加在 --target 参数后，逗号分开。*

3. 编译apk，默认编译Module为app的模块

   ```
   ace build apk
   ```

   最终生成Module为app的apk应用文件，默认路径为：demo/android/app/build/outputs/bundle/debug/。

4. 编译apk，编译指定的Module

   ```
   ace build apk --target moduleName
   ```

   最终会生成一个apk应用文件。默认路径为：demo/android/moduleName/build/outputs/debug/

   *注：多个Module可分别加在 --target 参数后，逗号分开，生成多个apk。*

## 应用安装

经过上一步的编译之后，已经成功生成了hap包或者apk包。以安装 ‘module1’ 生成的 hap 为例：

```
cd demo
ace install hap --target module1 --device [devideID]
```

将 hap 成功安装到 deviceID 对应的设备上。若不通过 --target 指定，则默认安装所有 module。

*注：对 deviceID 号不清楚，可通过连接手机后使用 ` ace devices` 查看。*

## 应用卸载

对于已经安装在设备上的应用，可以将其卸载。以卸载上一步安装在设备 deviceID 上的 ‘module1’ 的 hap 为例：

```
cd demo
ace uninstall hap --target module1 --device [devideID]
```

有多个 hap 或 apk，若不通过 --target 指定，则默认每个 hap/apk 都卸载。
