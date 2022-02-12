# ACE 跨平台命令行工具


ACE Command Tools，是一套为 ACE 开发者提供的命令行工具，包括开发环境检查，新建项目，编译打包，安装调试。



## 目录结构介绍：

```
.
│  .eslintrc            // eslint 插件配置文件
│  LICENSE
│  NOTICE
│  package.json         // ace_tools 配置文件
│  README.md
│  rollup.config.js     // rollup 打包插件配置文件
│
│
├─dist    // 使用 rollup 打包后生成
|      ace
│      ace.cmd
│      ace.ps1
│      ace_tools.js    // 项目入口文件
│      template        // 工程模板
│      ace_tools.js    // 打包后的 ace_tools.js
│      ace_tools.js.map
│
└─src    // 功能实现的代码目录
    ├─ace-build    // 实现 ace build 命令，编译打包项目
    │  │  ace-build.js
    │  │  index.js
    │  │
    │  ├─ace-compiler
    │  │      index.js
    │  │
    │  └─ace-packager
    │          index.js
    │
    ├─ace-check    // 实现 ace check 命令，检查 ace 应用需要依赖的库和工具链
    │      checkDevices.js
    │      checkJavaSdk.js
    │      checkNodejs.js
    │      configs.js
    │      getTool.js
    │      Ide.js
    │      index.js
    │      Info.js
    │      platform.js
    │      Sdk.js
    │      util.js
    │
    ├─ace-config    // 实现 ace config 命令，配置 ace 的设置，包括鸿蒙 sdk 的路径，编译输出的路径，开发证书路径等
    │      index.js
    │
    ├─ace-create    // 实现 ace create 命令，创建一个 ace 应用工程，或 module，或 component
    │  ├─component
    │  │      index.js
    │  │
    │  ├─module
    │  │      index.js
    │  │
    │  ├─project
    │  │      index.js
    │  │
    │  └─template    // 模板
    │      │  template.json
    │      │
    │      ├─app    // 1.0 工程模板：android, ohos, source
    │      │  ├─android
    │      │  │
    │      │  ├─ohos
    │      │  │
    │      │  └─source
    │      │
    │      ├─appv2    // 2.0 工程模板：android, ohos, source
    │      │  ├─android
    │      │  │
    │      │  ├─ohos
    │      │  │
    │      │  └─source
    │      │
    │      ├─module_android   // android 的 module 模板
    │      │
    │      └─module_ohos    // ohos 的 module 模板
    │
    ├─ace-devices    // 实现 ace devices 命令，列出所有连接的设备
    │      index.js
    │
    ├─ace-install    // 实现 ace install 命令，将 ace 应用安装到连接的设备上
    │      index.js
    │
    ├─ace-launch    // 实现 ace launch 命令，在设备上启动 ace 应用
    │      index.js
    │
    ├─ace-log       // 实现 ace log 命令，滚动展示正在运行的 ace 应用的 log
    │      index.js
    │
    ├─ace-run       // 实现 ace run 命令，编译并在设备上运行 ace 应用
    │      index.js
    │
    ├─ace-uninstall    // 实现 ace uninstall 命令，将 ace 应用卸载
    │       index.js
    │
    └─bin
           ace      // 脚本文件，通过 ace 命令来执行框架内业务逻辑
           ace.cmd
           ace.ps1
           ace_tools.js    // 项目入口文件

```



## ace 命令详细说明



+ ### ace config

配置 ace 的设置，包括鸿蒙 sdk 的路径，编译输出的路径，开发证书路径等，若需要去掉一个设置，将其值设置为空即可。 

设置的项为全局统一，暂不支持不同的项目配置不同的值。



语法：

```

ace config [arguments]

```



| 参数 | 说明 |

| ---- | ---- |

|--harmony-sdk| 鸿蒙 sdk 的路径 |

|--android-sdk| 安卓 sdk 的路径 |

|--nodejs-dir| nodejs 路径 |

|--buid-dir| 编译输出的路径 |



+ ### ace check

检查 ace 应用需要依赖的库和工具链。



需要检查的项：

1. NodeJS（必选）
2. Harmony SDK and License（必选）
3. Android SDK and License（可选，如未安装无法编译 apk）
4. DevEco Studio（必选，目前只能通过 IDE 来安装 Harmony SDK）
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

Please enter the ACE version (1: ACE 1.0, 2: ACE 2.0):

```

创建完成:

```

Project created successfully! Target directory：${projectName}

```

packageName不能重复，并且创建hap与apk不能通用一个packageName。


**注： ACE 2.0 项目目前只支持创建，不支持后续编译打包等操作！**


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



| 子命令 | 说明 |

| ---- | ---- |

| hap | 生成鸿蒙应用 hap 包。 |

| apk | 生成安卓应用 apk 包。 |



+ ### ace install

将 ace 应用安装到连接的设备上。



语法：

```

ace install <subcommand>

```



| 子命令 | 说明 |

| ---- | ---- |

| hap | 安装鸿蒙应用 hap 包。 默认|

| apk | 安装安卓应用 apk 包。 |



+ ### ace launch

在设备上运行 ace 应用。



语法：

```

ace launch [arguments] <subcommand>

```



| 参数 | 说明 |

| ---- | ---- |

| --entry | 指定启动的入口文件，若是 hap，默认入口文件为 config.json 中配置的，若是 apk，默认入口文件是 Manifest.json 中配置的。 |



| 子命令 | 说明 |

| ---- | ---- |

| hap | 启动鸿蒙应用 hap 包。 默认|

| apk | 启动安卓应用 apk 包。 |



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



| 子命令 | 说明 |

| ---- | ---- |

| hap | 编译并运行鸿蒙应用 hap 包。 默认|

| apk | 编译并运行安卓应用 apk 包。 |



+ ### ace help

ace 命令行工具帮助。



语法：

```

ace help <subcommand>

```



| 子命令 | 说明 |

| ---- | ---- |

| device | 列出所有连接的设备，结果同 adb devices。 |

| check | 检查 ace 应用需要依赖的库和工具链。 |

| config | 配置 ace 的设置，包括鸿蒙 sdk 的路径，编译输出的路径等 |

| init | 创建一个新的 ace 应用。 |

| build | 编译打包该项目。 |

| install | 将 ace 应用安装到连接的设备上。 |

| launch | 在设备上运行 ace 应用。 |

| log | 滚动展示正在运行的 ace 应用的 log。 |

| run | 编译并在设备上运行 ace 应用。 |





## 新手使用



### 环境安装

在使用命令行工具创建工程之前，请先检查本地开发环境：

1. NodeJS

    命令行运行 `node -v` 查看本地nodejs版本。如不存在，请自行下载安装新的稳定版本：[NodeJS下载地址](https://nodejs.org/en/download/)。

2. Java

    命令行运行 `java -version` 查看本地Java版本。如不存在，请自行下载安装新的稳定版本，同时配置相关环境变量：[JDK下载地址](https://www.oracle.com/java/technologies/javase-downloads.html)

3. Harmony SDK

   编译 hap 需要，目前Harmony SDK 只支持通过 DevEco 安装获得。如不存在，请自行下载安装对应版本：[DevEco Studio下载地址](https://developer.harmonyos.com/cn/develop/deveco-studio#download)

4. Android SDK

   编译 apk 需要，Android SDK 支持多种方式获得：下载安装 Android Studio 自动获得、仅下载 SDK Manager 安装获得。请自行选择下载Android Studio 或 	SDK tools package：[Android Studio 及 SDK Manager下载地址](https://developer.android.com/studio)

   **注：默认配置SDK版本是29，如果下载了不同版本，请在项目中对应位置进行修改。**



### 依赖安装：

有两种方式可以运行框架，分别需要安装相关依赖：

1. 如果获得了项目的源码，则可以在项目根目录下执行

```
npm install . -g
```

安装所需依赖包。

*注：如果命令报错，可能需要多次卸载并执行*



2. 如果获得了打包后的 ace_tools.js 文件和 ace 脚本文件，需要配置 ace 到环境变量：在 Path 中添加 ace 脚本的解压目录。



### 创建应用：

接下来从零开始，通过命令行工具完成项目创建，编译打包，安装调试。

首先进入项目的根目录

```
cd ..
cd ace_tools/
```



1. ##### 检查开发环境

```
ace check
```

执行 `ace check` 命令可以检查上述的本地开发环境。对于必选项，需要检查通过，否则无法继续接下来的操作。

*注：该命令已经集成在工程创建中，可跳过。建议执行。*



2. ##### 检查设备连接

```
ace devices
```

获得当前连接的设备devices 及 deviceID。后续命令的参数需要加 deviceID，可随时执行查看。

*注：该命令已经集成在 ` ace check` 中，可跳过。*



3. ##### 配置 ace 设置

```
ace config
```

检查当前是否有设备连接，以便后续应用的安装、启动等操作正确执行。

*注：该命令已经集成在上述 `ace check` 中，可跳过。*



4. ##### 创建project

以创建一个 ‘demo’  项目为例：

```
ace create project
? Please enter the project name: demo
? Please enter the packages (com.example.demo):
? Please enter the ACE version (1: ACE 1.0, 2: ACE 2.0): 1
```

执行 `ace create project` 命令（project 可省略），接着输入项目名 demo ，包名直接回车默认即可。输入“1”代表创建ace1.0项目。

一个名为 ‘demo’ 的项目就创建成功了。



5. ##### 创建module

以创建一个 ‘module1’  模块为例：

```
cd demo
cd source
ace create module
? Please enter the module name: module1
```

在 demo/source 目录下执行 `ace create module` 命令，接着输入模块名 module1 即可。

一个名为 ‘module1’ 的模块就创建成功了。



6. ##### 创建component

以创建一个‘default1’ 组件为例：

```
cd source
cd module1
ace create component
? Please enter the component name: default1
```

在 source/module1 目录下执行 `ace create component `命令，接着输入组件名 default1 即可。

一个名为 ‘default1’ 的组件就创建成功了。



7. ##### 编写代码

在上述module、component创建完成后，便可以修改源码以用于开发调试。



8. ##### 签名配置

在对 'demo' 项目进行编译之前，需要为其申请签名文件。参考资料：

https://developer.harmonyos.com/cn/docs/documentation/doc-guides/create_csr-0000001053702411

https://developer.harmonyos.com/cn/docs/documentation/doc-guides/apply_certificate-0000001053822402

https://developer.huawei.com/consumer/cn/doc/distribution/app/agc-harmonyapp-debugharmonyapp



9. ##### 项目编译

开始对 'demo' 项目进行编译。编译分为hap 和 apk：

```
cd demo
```

1. 编译hap，默认编译所有module

   ```
   ace build hap
   ```

   最终会生成一个hap应用文件。默认路径为 demo/ohos/entry/build/outputs/hap/debug/。



2. 编译hap，只编译module1

   ```
   ace build hap --target module1
   ```

   最终会生成一个hap应用文件。默认路径为 demo/ohos/module1/build/outputs/hap/debug/。

   *注：多个module可分别加在 --target 参数后，逗号分开。*



3. 编译apk，默认全部编译

   ```
   ace build apk
   ```

   最终会生成一个aab应用文件。默认路径为：demo/android/app/build/outputs/bundle/debug/



4. 编译apk，编译module1

   ```
   ace build apk --target module1
   ```

   最终会生成一个apk应用文件。默认路径为：demo/android/module1/build/outputs/debug/

   *注：多个module可分别加在 --target 参数后，逗号分开，生成多个apk。*



10. ##### 应用安装


经过上一步的编译之后，已经成功生成了hap包或者apk包。以安装 ‘module1’ 生成的 hap 为例：

```
cd demo
ace install hap --target module1 --device [devideID]
```

将 hap 成功安装到 deviceID 对应的设备上。若不通过 --target 指定，则默认安装所有 module。

*注：对 deviceID 号不清楚，可通过连接手机后使用 ` ace devices` 查看。*



11. ##### 应用启动

hap安装之后，通过命令启动设备上的应用。以启动上一步安装的 ‘module1’ 的 hap 为例：

```
cd demo
ace launch hap --target module1 --device [devideID]
```



12. ##### 查看log

成功启动后，便可以通过查看应用的 log 进行开发调试：

```
cd demo
ace log
```

*注：默认只输出 ace 进程的 log。*



13. ##### 应用卸载

对于已经安装在设备上的应用，可以将其卸载。以卸载上一步安装在设备 deviceID 上的 ‘module1’ 的 hap 为例：

```
cd demo
ace uninstall hap --target module1 --device [devideID]
```

有多个 hap 或 apk，若不通过 --target 指定，则默认每个 hap/apk 都卸载。



14. ##### 快速实现编译安装启动

ace run 是 ace devices, ace build, ace install, ace launch 和 ace log 的合集，通过一条命令可快速实现项目的编译、打包、安装、启动及log打印。综合以上所有操作的为例：

```
cd demo
ace run hap --target module1 --device [devideID]
```

对于hap，如果有多个module，则默认编译全部，启动默认的entry；对于apk，如果有多个module，则默认编译全部，得到aab，不支持安装、启动等后续操作。多个设备需用 --device 进行指定。
