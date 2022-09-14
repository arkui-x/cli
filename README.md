# 快速指南

## 环境安装

在使用命令行工具创建工程之前，请先检查本地开发环境：

1. NodeJS

   命令行运行 `node -v` 查看本地nodejs版本。如不存在，请自行下载安装新的稳定版本：[NodeJS下载地址](https://nodejs.org/en/download/)。建议下载14.19.1以上版本。

2. Java

   命令行运行 `java -version` 查看本地Java版本。如不存在，请自行下载安装新的稳定版本，同时配置相关环境变量：[JDK下载地址](https://repo.huaweicloud.com/openjdk/)。建议下载JDK11.0.2以上版本。

3. OpenHarmony SDK

   编译 hap 需要，OpenHarmony SDK 支持通过安装DevEco Studio获得，也可通过SDK Manager获得。[DevEco Studio及SDK Manager下载地址](https://developer.harmonyos.com/cn/develop/deveco-studio)

   **SDK Manager下载SDK推荐配置路径及方式：**

   [Linux]
   ```
   // 配置环境变量
   export OpenHarmony_HOME=/home/usrername/path-to-ohsdk
   export PATH=${OpenHarmony_HOME}/toolchains/versioncode:${PATH}
   ```

   [Mac]
   ```
   // 配置环境变量
   export OpenHarmony_HOME=/Users/usrername/path-to-ohsdk
   export PATH=$OpenHarmony_HOME/toolchains/versioncode:$PATH
   ```

   [Windows]
   ```
   // 配置环境变量
   set OpenHarmony_HOME=/Users/usrername/path-to-ohsdk
   set PATH=%PATH%;%OpenHarmony_HOME%/toolchains/versioncode
   ```

4. Android SDK

   编译 apk 需要，Android SDK 支持通过安装Android Studio获得、也可通过SDK Manager获得。[Android Studio及SDK Manager下载地址](https://developer.android.com/studio)

   **SDK Manager下载SDK推荐配置路径及方式：**

   [Linux]
   ```
   // 配置环境变量
   export ANDROID_HOME=/home/usrername/path-to-android-sdk
   export PATH=${ANDROID_HOME}/tools:${ANDROID_HOME}/tools/bin:${ANDROID_HOME}/build-tools/28.0.3:${ANDROID_HOME}/platform-tools:${PATH}
   ```

   [Mac]
   ```
   // 配置环境变量
   export ANDROID_HOME=/Users/usrername/path-to-android-sdk
   export PATH=$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/build-tools/28.0.3:$ANDROID_HOME/platform-tools:$PATH
   ```

   [Windows]
   ```
   // 配置环境变量
   set ANDROID_HOME=/home/usrername/path-to-android-sdk
   set PATH=%PATH%;%ANDROID_HOME%/tools;%ANDROID_HOME%/tools/bin;%ANDROID_HOME%/build-tools/28.0.3;%ANDROID_HOME%/platform-tools
   ```

## 依赖安装

有两种方式可以运行框架，分别需要安装相关依赖：

1. 如果获得了项目的源码，则可以在项目根目录执行安装命令，安装cli依赖包。

   ```
   npm install . -g
   ```

*注：如遇到全局安装失败，可先执行npm install，再执行npm install . -g*

2. 如果获得了打包后的 ace_tools.js 文件和 ace 脚本文件，可配置ace脚本到环境变量，使能ACE Tools命令行工具。

## 创建应用

接下来从零开始，通过命令行工具完成项目创建和编译打包。

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

*注：开发环境检查主要针对SDK和IDE的默认安装和下载路径；如果通过SDK Manager下载SDK，会检查默认环境变量：ANDROID_HOME和OpenHarmony_HOME是否配置。*

2. ### 检查设备连接

   ```
   ace devices
   ```

获得当前连接的设备devices 及 deviceID。后续命令的参数需要加 deviceID，可随时执行查看。

*注：该命令已经集成在 ` ace check` 中，可跳过。*

3. ### 开发环境路径配置

   ```
   ace config
   ```

如果开发者没有按照IDE和SDK默认路径进行安装和下载，可通过此命令进行自定义路径配置。

4. ### 创建project

   以创建一个 ‘demo’  项目为例：

   ```
   ace create project
   ? Please enter the project name: demo
   ? Please enter the packages (com.example.demo):com.example.demo
   ? Please enter the ACE version (1: 类Web范式, 2: 声明式范式): 2
   ```

执行 `ace create project` 命令（project 可省略），接着输入项目名 demo ，包名直接回车默认即可。输入“2”代表创建ArkUI声明式应用项目。

一个名为 ‘demo’ 的项目就创建成功了。

## 编写代码

在上述工程创建完成后，便可以修改源码以用于开发调试。

## 项目编译

开始对 'demo' 项目进行编译。编译分为hap 、apk和app：

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

5. 编译app，默认编译Module为app的模块

   ```
   ace build app
   ```

最终生成Module为app的app应用文件，默认路径为：demo/ios/build/outputs/app/

6. 编译app，编译指定的Module

   ```
   ace build app --target moduleName
   ```

最终会生成一个app应用文件。默认路径为：demo/ios/moduleName/build/outputs/app/

## 应用安装和卸载

开始对编译出的应用包进行安装，先进入到demo工程目录下

   ```
cd demo
   ```

1. 安装hap应用安装包

   ```
   ace install hap
   ```

2. 安装hap应用到指定的设备上

   ```
   ace install hap -d[deviceId]
   ```

3. 安装apk应用安装包

   ```
   ace install apk
   ```

4. 安装apk应用安装包到指定的设备上

   ```
   ace install apk -d[deviceId]
   ```

5. 安装app应用安装包

   ```
   ace install app
   ```

6. 安装app应用安装包到指定的设备上

   ```
   ace install app -d[deviceId] 
   ```

7. 卸载hap应用安装包

   ```
   ace uninstall hap -bundle[bundleName]
   ```

8. 卸载指定设备上的hap应用安装包

   ```
   ace uninstall hap -bundle[bundleName] -d[deviceId]
   ```

9. 卸载apk应用安装包

   ```
   ace uninstall apk -bundle[bundleName]
   ```

10. 卸载指定设备上的apk应用安装包

    ```
    ace uninstall apk -bundle[bundleName] -d[deviceId]
    ```

11. 卸载app应用安装包

    ```
    ace uninstall app -bundle[bundleName]
    ```

12. 卸载指定设备上的app应用安装包

    ```
    ace uninstall app -bundle[bundleName] -d[deviceId]
    ```

## 运行应用

1. 运行hap应用

   ```
   ace run hap
   ```

2. 在指定的设备上运行hap应用

   ```
   ace run hap -d[deviceId]
   ```

3. 运行apk应用

   ```
   ace run apk
   ```

4. 在指定的设备上运行apk应用

   ```
   ace run apk -d[deviceId] 
   ```

5. 运行app应用

   ```
   ace run app
   ```

6. 在指定的设备上运行app应用

   ```
   ace run app -d[deviceId]
   ```

## 清理编译结果

清除所有编译结果(hap、apk、app)

  ```
ace clean
  ```

## 输出日志文件

滚动输出正在运行的应用日志信息

1. 输出hap应用日志

  ```
ace log hap
  ```

2. 输出指定的设备上运行hap应用日志

  ```
ace log hap -d[deviceId]
  ```

3. 输出apk应用日志

  ```
ace log apk
  ```

4. 输出指定的设备上运行apk应用日志

  ```
ace log apk -d[deviceId]
  ```

5. 输出app应用日志

  ```
ace log app
  ```

6. 输出指定的设备上运行app应用日志

  ```
ace log app -d[deviceId] 
  ```

## 帮助工具

展示可以支持的命令信息

  ```
ace help
  ```

支持单个指令支持查询

```
ace build --help
```

