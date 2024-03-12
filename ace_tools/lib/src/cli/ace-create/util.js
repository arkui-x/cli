/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const JSON5 = require('json5');
const exec = require('child_process').execSync;
const {
  Platform,
  platform
} = require('../ace-check/platform');
const { getIosProjectName, getCrossPlatformModules, getUUID } = require('../util');

function replaceInfo(files, replaceInfos, strs) {
  files.forEach((filePath, index) => {
    fs.writeFileSync(filePath,
      fs.readFileSync(filePath).toString().replace(new RegExp(replaceInfos[index], 'g'), strs[index]));
  });
}

function rmdir(filePath) {
  if (fs.statSync(filePath).isFile()) {
    fs.unlinkSync(filePath);
  } else {
    fs.readdirSync(filePath).forEach(file => {
      const currentPath = path.join(filePath, file);
      if (fs.statSync(currentPath).isFile()) {
        fs.unlinkSync(currentPath);
      } else {
        rmdir(currentPath);
      }
    });
    fs.rmdirSync(filePath);
  }
}

function copy(src, dst, excludefile) {
  const paths = fs.readdirSync(src).filter(item => {
    return item.substring(0, 1) !== '.' && item !== excludefile;
  });
  paths.forEach(newpath => {
    const srcEle = path.join(src, newpath);
    const dstEle = path.join(dst, newpath);
    if (fs.statSync(srcEle).isFile()) {
      const parentDir = path.parse(dstEle).dir;
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(dstEle, fs.readFileSync(srcEle));
    } else {
      if (!fs.existsSync(dstEle)) {
        fs.mkdirSync(dstEle, { recursive: true });
      }
      copy(srcEle, dstEle, excludefile);
    }
  });
  return true;
}

function createPackageFile(packagePaths, packageArray) {
  packagePaths.forEach(packagePath => {
    const files = fs.readdirSync(packagePath);
    const oldPath = packagePath;
    packageArray.forEach(packageInfo => {
      fs.mkdirSync(path.join(packagePath, packageInfo), { recursive: true });
      packagePath = path.join(packagePath, packageInfo);
    });
    files.forEach(javaFile => {
      const srcEle = path.join(oldPath, javaFile);
      const dstEle = path.join(packagePath, javaFile);
      if (fs.statSync(srcEle).isFile()) {
        fs.writeFileSync(dstEle, fs.readFileSync(srcEle));
        fs.unlinkSync(srcEle);
      }
    });
  });
}

function modifyOpenHarmonyOSConfig(projectPath, openharmonyosVersion) {
  if (openharmonyosVersion === '10') {
    return;
  }
  const buildProfile = path.join(projectPath, 'build-profile.json5');
  if (fs.existsSync(buildProfile)) {
    const buildProfileInfo = JSON5.parse(fs.readFileSync(buildProfile));
    const productsInfo = buildProfileInfo.app.products;
    for (let index = 0; index < productsInfo.length; index++) {
      productsInfo[index].compileSdkVersion = Number(openharmonyosVersion);
      productsInfo[index].compatibleSdkVersion = Number(openharmonyosVersion);
    }
    fs.writeFileSync(buildProfile, JSON.stringify(buildProfileInfo, '', '  '));
  }
}

function modifyHarmonyOSConfig(projectPath, moduleName, sdkVersion) {
  const buildProfile = path.join(projectPath, 'build-profile.json5');
  const configFile = [path.join(projectPath, moduleName, 'src/main/module.json5'),
    path.join(projectPath, moduleName, 'src/ohosTest/module.json5')];
  const deviceTypeName = 'deviceTypes';

  if (fs.existsSync(buildProfile)) {
    const buildProfileInfo = JSON5.parse(fs.readFileSync(buildProfile));
    const productsInfo = buildProfileInfo.app.products;
    for (let index = 0; index < productsInfo.length; index++) {
      if (productsInfo[index].name === 'default' && productsInfo[index].runtimeOS !== 'HarmonyOS') {
        switch (sdkVersion) {
          case '10': {
            productsInfo[index].compileSdkVersion = '4.0.0(10)';
            productsInfo[index].compatibleSdkVersion = '4.0.0(10)';
            productsInfo[index].runtimeOS = 'HarmonyOS';
            break;
          }
          case '11': {
            productsInfo[index].compileSdkVersion = '4.1.0(11)';
            productsInfo[index].compatibleSdkVersion = '4.1.0(11)';
            productsInfo[index].runtimeOS = 'HarmonyOS';
            break;
          }
          default: {
            productsInfo[index].compileSdkVersion = '4.0.0(10)';
            productsInfo[index].compatibleSdkVersion = '4.0.0(10)';
            productsInfo[index].runtimeOS = 'HarmonyOS';
            break;
          }
        }
      }
    }
    fs.writeFileSync(buildProfile, JSON.stringify(buildProfileInfo, '', '  '));
  }

  configFile.forEach(config => {
    if (fs.existsSync(config)) {
      const configFileInfo = JSON5.parse(fs.readFileSync(config));
      configFileInfo.module[deviceTypeName] = ['phone'];
      fs.writeFileSync(config, JSON.stringify(configFileInfo, '', '  '));
    }
  });
}

function modifyNativeCppConfig(projectPath, projectName, destDir) {
  const cMakeFile = path.join(projectPath, `.arkui-x/android/${destDir}/src/main/cpp/CMakeLists.txt`);
  try {
    fs.writeFileSync(cMakeFile, fs.readFileSync(cMakeFile).toString().replace(/appNameValue/g, projectName));

    const buildGradle = path.join(projectPath, `.arkui-x/android/${destDir}/build.gradle`);
    if (fs.existsSync(buildGradle)) {
      const buildGradleInfo = fs.readFileSync(buildGradle, 'utf8').toString();
      const searchAbi = `testInstrumentationRunner "android.support.test.runner.AndroidJUnitRunner"`;
      const searchNative = 'sourceSets {';
      const addAbiIndex = buildGradleInfo.lastIndexOf(searchAbi);
      const searchNativeIndex = buildGradleInfo.lastIndexOf(searchNative);
      const addAbi = `\n
        ndk {
            abiFilters "arm64-v8a"
        }
    `;
      const addPackage = `
    externalNativeBuild {
        cmake {
            path file('src/main/cpp/CMakeLists.txt')
            version '3.22.1'
        }
    }
    `;
      const updateBuildGradleInfo = buildGradleInfo.slice(0, addAbiIndex + searchAbi.length) + addAbi +
        buildGradleInfo.slice(addAbiIndex + searchAbi.length, searchNativeIndex) + addPackage +
        buildGradleInfo.slice(searchNativeIndex);
      fs.writeFileSync(buildGradle, updateBuildGradleInfo);
    }
    return true;
  } catch (e) {
    console.error('\x1B[31m%s\x1B[0m', `modify ${cMakeFile} failed.`);
    return false;
  }
}

function addCrosssPlatform(projectPath, module) {
  try {
    if (!fs.existsSync(path.join(projectPath, '.arkui-x'))) {
      fs.mkdirSync(path.join(projectPath, '.arkui-x'), { recursive: true });
    }
    const crossFile = path.join(projectPath, '.arkui-x/arkui-x-config.json5');
    if (fs.existsSync(crossFile)) {
      const crossInfo = JSON5.parse(fs.readFileSync(crossFile).toString());
      if (!crossInfo.modules.includes(module)) {
        crossInfo.modules.push(module);
      }
      fs.writeFileSync(crossFile, JSON.stringify(crossInfo, '', '  '));
    } else {
      const data = `{
  "crossplatform": true,
  "modules": [
    "${module}",
  ]
}`;
      fs.writeFileSync(crossFile, data);
    }
  } catch (err) {
    console.log('add cross platform failed\n', err);
  }
}

function signIOS(configFile) {
  if (platform !== Platform.MacOS) {
    return true;
  }
  try {
    exec('which security', { stdio: 'pipe' });
    exec('which openssl', { stdio: 'pipe' });
    const files = [];
    const replaceInfos = [];
    const strs = [];
    const identityResult = [];
    const findIdentityCmd = 'security find-identity -p codesigning -v';
    const result = exec(`${findIdentityCmd}`, { stdio: 'pipe' }).toString().split('\n').filter(item => {
      return (/^\s*\d+\).+"(.+Develop(ment|er).+)"$/g).exec(item);
    });
    result.forEach(item => {
      identityResult.push((/^\s*\d+\).+"(.+Develop(ment|er).+)"$/g).exec(item)[1]);
    });
    if (identityResult.length === 0) {
      return false;
    }
    const identity = identityResult[0].match(RegExp(/.*\(([a-zA-Z0-9]+)\)/))[1];
    const findCertificateCmd = `security find-certificate -c ${identity} -p | openssl x509 -subject`;
    const certificateResult = exec(`${findCertificateCmd}`, { stdio: 'pipe' }).toString().match(RegExp(/OU\s*=\s*([a-zA-Z0-9]+)/))[1];

    files.push(configFile);
    replaceInfos.push('Manual');
    strs.push('Automatic');
    files.push(configFile);
    replaceInfos.push('MCN34247SC');
    strs.push(certificateResult);
    files.push(configFile);
    replaceInfos.push('iPhone Distribution: ');
    strs.push('Apple Development');
    files.push(configFile);
    replaceInfos.push('shiseido sc adhoc');
    strs.push('');
    replaceInfo(files, replaceInfos, strs);
    console.log(`Signing iOS app for device deployment using developer identity: "${identityResult[0]}"`);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

function copyTemp(src, dst, excludefile) {
  if (fs.statSync(src).isFile()) {
    const parentDir = path.parse(dst).dir;
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(dst, fs.readFileSync(src));
    return;
  }
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
  }
  const paths = fs.readdirSync(src).filter(item => {
    return item !== excludefile;
  });
  paths.forEach(newpath => {
    const srcEle = path.join(src, newpath);
    const dstEle = path.join(dst, newpath);
    if (fs.statSync(srcEle).isFile()) {
      const parentDir = path.parse(dstEle).dir;
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(dstEle, fs.readFileSync(srcEle));
    } else {
      if (!fs.existsSync(dstEle)) {
        fs.mkdirSync(dstEle, { recursive: true });
      }
      copy(srcEle, dstEle, excludefile);
    }
  });
  return true;
}

function getFileList(projectDir) {
  let fileList = [];
  fs.readdirSync(projectDir).forEach(file => {
    const projectFilePath = path.join(projectDir, file);
    if (fs.lstatSync(projectFilePath).isDirectory()) {
      if (fs.readdirSync(projectFilePath).length > 0) {
        fileList = fileList.concat(getFileList(projectFilePath));
      } else {
        fileList.push(projectFilePath);
      }
    } else {
      fileList.push(projectFilePath);
    }
  });
  return fileList;
}

function getTempPath(outputDir) {
  const tempDir = os.tmpdir();
  const projectTempPath = path.join(tempDir, 'aceProject', outputDir).replaceAll('\\', '/');
  return projectTempPath;
}

function getProjectInfo(currentProjectPath) {
  const projectInfo = {};
  if (fs.existsSync(path.join(currentProjectPath, 'oh-package.json5'))) {
    const nameInfo = fs.readFileSync(path.join(currentProjectPath, 'oh-package.json5'), 'utf8').toString();
    projectInfo.projectName = JSON5.parse(nameInfo)['name'];
  }
  if (fs.existsSync(path.join(currentProjectPath, '/AppScope/app.json5'))) {
    const bundleNameInfo = fs.readFileSync(path.join(currentProjectPath, '/AppScope/app.json5'), 'utf8').toString();
    projectInfo.bundleName = JSON5.parse(bundleNameInfo)['app']['bundleName'];
  } else {
    projectInfo.bundleName = 'com.example.' + projectInfo.projectName;
  }
  if (fs.existsSync(path.join(currentProjectPath, 'build-profile.json5'))) {
    const versionInfo = fs.readFileSync(path.join(currentProjectPath, 'build-profile.json5'), 'utf8').toString();
    projectInfo.compileSdkVersion = JSON5.parse(versionInfo)['app']['products'][0]['compileSdkVersion'];
    projectInfo.runtimeOS = JSON5.parse(versionInfo)['app']['products'][0]['runtimeOS'];
  } else {
    projectInfo.compileSdkVersion = '10';
    projectInfo.runtimeOS = 'OpenHarmony';
  }
  return projectInfo;
}

function createAndroidTaskInBuildGradle(projectPath) {
  const buildGradle = path.join(projectPath, `.arkui-x/android/app/build.gradle`);
  if (!fs.existsSync(buildGradle)) {
    return;
  }
  const buildGradleInfo = fs.readFileSync(buildGradle, 'utf8').toString();
  const searchFeatures = 'buildToolsVersion "30.0.3"';
  const delFeaturesIndex = buildGradleInfo.lastIndexOf(searchFeatures);
  if (delFeaturesIndex === -1) {
    return;
  }
  const addPackage = `\n

    //Select whether you want to execute the compile arkts script.
    def configBuildFlag = false

    task ArkTSBuildTask {
      preBuild.dependsOn ArkTSBuildTask
      doLast {
        if (configBuildFlag) {
          def os = System.getProperty("os.name").toLowerCase()
          if (os.contains("win")) {
            exec {
              commandLine 'cmd', '/c', '.\\\\buildArkTs'
              workingDir file( project.projectDir.getAbsolutePath() + '\\\\..' )
            }
          } else {
            exec {
              commandLine 'sh', '-c', 'chmod +x ./buildArkTs && ./buildArkTs'
              workingDir file( project.projectDir.getAbsolutePath() + '/..' )
            }
          }
        }
      }
    }`;
  const updateBuildGradleInfo = buildGradleInfo.slice(0, delFeaturesIndex + searchFeatures.length) + addPackage +
    buildGradleInfo.slice(delFeaturesIndex + searchFeatures.length);
  fs.writeFileSync(buildGradle, updateBuildGradleInfo);

}

function createAndroidAndIosBuildArktsShell(projectPath, ohpmPath, arkuiXSdkPath) {
  const moduleList = getCrossPlatformModules(projectPath).join(',');
  const taskIncommandLine = getAndroidAndIosBuildArktsShell(projectPath, moduleList, arkuiXSdkPath, ohpmPath);
  const batIncommandLine = getWindowsBuildArktsShell(projectPath, moduleList, arkuiXSdkPath, ohpmPath);
  try {
    fs.writeFileSync(path.join(projectPath, '.arkui-x/android/buildArkTs.bat'), batIncommandLine, 'utf8');
    fs.writeFileSync(path.join(projectPath, '.arkui-x/android/buildArkTs'), taskIncommandLine, 'utf8');
    fs.writeFileSync(path.join(projectPath, '.arkui-x/ios/buildArkTs.sh'), taskIncommandLine, 'utf8');
  } catch (err) {
    console.log(err);
  }
}

function createIosScriptInPbxproj(projectPath) {
  const pbxProjInfoPath = path.join(projectPath, `.arkui-x/ios/${getIosProjectName(projectPath)}.xcodeproj/project.pbxproj`);
  const scriptInfoUuid = getUUID(pbxProjInfoPath);
  const scriptInfo = `${scriptInfoUuid} /* Run Script */,`;
  const PBXNativeTarget = 'buildPhases = (';
  const endPbxNativeTarget = '/* End PBXNativeTarget section */';
  const scriptPbxproj =
    `/* Begin PBXShellScriptBuildPhase section */
      ${scriptInfoUuid} /* Run Script */ = {
          isa = PBXShellScriptBuildPhase;
          buildActionMask = 2147483647;
          files = (
          );
          inputPaths = (
          );
          name = "Run My Script";
          outputPaths = (
          );
          runOnlyForDeploymentPostprocessing = 0;
          shellPath = "/bin/sh";
          shellScript = '# Select whether you want to execute the compile arkts script.`+ `\n` + "configBuildFlag=false" +
    `\n` + `if [ "$configBuildFlag" = "false" ]; then` + `\n\t` + "exit 0" + `\n` + "fi" + `\n` +
    "sh ${SRCROOT}/buildArkTs.sh" + `';
      };
/* End PBXShellScriptBuildPhase section */`;
  if (!fs.existsSync(pbxProjInfoPath)) {
    return;
  }
  const pbxProjInfo = fs.readFileSync(pbxProjInfoPath, 'utf8').toString();
  const PBXNativeTargetIndex = pbxProjInfo.lastIndexOf(PBXNativeTarget);
  const endPbxNativeTargetIndex = pbxProjInfo.lastIndexOf(endPbxNativeTarget);
  if (PBXNativeTargetIndex === -1 || endPbxNativeTargetIndex === -1) {
    return;
  }
  const updatePbxProjInfo = pbxProjInfo.slice(0, PBXNativeTargetIndex + PBXNativeTarget.length) + `\n\t\t\t\t` + scriptInfo +
    pbxProjInfo.slice(PBXNativeTargetIndex + PBXNativeTarget.length, endPbxNativeTargetIndex + endPbxNativeTarget.length) + `\n\n` +
    scriptPbxproj + pbxProjInfo.slice(endPbxNativeTargetIndex + endPbxNativeTarget.length);
  fs.writeFileSync(pbxProjInfoPath, updatePbxProjInfo);

}

function getWindowsBuildArktsShell(projectDir, moduleList, arkuiXSdkPath, ohpmPath) {
  return `@echo off
setlocal enabledelayedexpansion

if "%~1" neq "" goto :copyStageBundleToAndroidAndIOS

@REM It is an ACE compilation flag that cannot be manually modified.
set isAceBuildFlag=%ACEBUILDFLAG%
if "%isAceBuildFlag%" == "true" goto :eof

@REM Select whether you want to execute the compile arkts script.
set scriptBuildFlag=true
if "%scriptBuildFlag%" == "false" goto :eof

set project_path=${projectDir}
set ohpm_path=${ohpmPath}
set arkuiXSdkPath=${arkuiXSdkPath}

@REM You can change the module name you want to compile.
set moduleLists=${moduleList}

@REM You can change the android arkuix path to the specified path.
set android_arkuix_path=%project_path%\\.arkui-x\\android\\app\\src\\main\\assets\\arkui-x

@REM You can change the android systemRes path to the specified path.
set android_systemRes_path=%project_path%\\.arkui-x\\android\\app\\src\\main\\assets\\arkui-x\\systemres

@REM You can change the ios arkuix path to the specified path.
set ios_arkuix_path=%project_path%\\.arkui-x\\ios\\arkui-x

@REM You can change the ios systemRes path to the specified path.
set ios_systemRes_path=%project_path%\\.arkui-x\\ios\\arkui-x\\systemres

cd /d %project_path%
call %ohpm_path% update

call ./hvigorw default@CompileArkTS -p module=%moduleLists%

:copyStageBundleToAndroidAndIOS
    call :deleteFile %ios_arkuix_path%
    call :deleteFile %android_arkuix_path%
    call :copyStageBundleToAndroidAndIOSByTarget default
    set "systemResPath=%arkuiXSdkPath%\\engine\\systemres"
    xcopy "!systemResPath!" "%ios_systemRes_path%" /s /e /i /y >nul
    xcopy "!systemResPath!" "%android_systemRes_path%" /s /e /i /y >nul
exit /b

:deleteFile
    setlocal enabledelayedexpansion
    set "folders=%moduleLists%"
    for %%i in (%folders%) do (
        set "path=%~1/%%i"
        if exist "!path!" (
             rmdir /s /q "!path!"
        )
    )
    endlocal
exit /b

:copyStageBundleToAndroidAndIOSByTarget
setlocal
set "folders=%moduleLists%"
for %%i in (%folders%) do (
    set "src=%project_path%\\%%i\\build\\default\\intermediates\\loader_out\\%~1\\ets"
    set "resindex=%project_path%\\%%i\\build\\default\\intermediates\\res\\%~1\\resources.index"
    set "resPath=%project_path%\\%%i\\build\\default\\intermediates\\res\\%~1\\resources"
    set "moduleJsonPath=%project_path%\\%%i\\build\\default\\intermediates\\res\\%~1\\module.json"
    set "destClassName=%%i%~2"
    set "distAndroid=%android_arkuix_path%\\!destClassName!\\ets"
    set "distIOS=%ios_arkuix_path%\\!destClassName!\\ets"
    set "resindexAndroid=%android_arkuix_path%\\!destClassName!\\resources.index"
    set "resPathAndroid=%android_arkuix_path%\\!destClassName!\\resources"
    set "moduleJsonPathAndroid=%android_arkuix_path%\\!destClassName!\\module.json"
    set "resindexIOS=%ios_arkuix_path%\\!destClassName!\\resources.index"
    set "resPathIOS=%ios_arkuix_path%\\!destClassName!\\resources"
    set "moduleJsonPathIOS=%ios_arkuix_path%\\!destClassName!\\module.json"
    md "!distAndroid!" 2>nul
    xcopy "!src!" "!distAndroid!" /s /e /i /y >nul
    xcopy "!resPath!" "!resPathAndroid!" /s /e /i /y >nul
    copy "!resindex!" "!resindexAndroid!" >nul
    copy "!moduleJsonPath!" "!moduleJsonPathAndroid!" >nul
    md "!distIOS!" 2>nul
    xcopy "!src!" "!distIOS!" /s /e /i /y >nul
    xcopy "!resPath!" "!resPathIOS!" /s /e /i /y >nul
    copy "!resindex!" "!resindexIOS!" >nul
    copy "!moduleJsonPath!" "!moduleJsonPathIOS!" >nul
)
exit /b`;
}

function getAndroidAndIosBuildArktsShell(projectDir, moduleList, arkuiXSdkPath, ohpmPath) {
  return `#!/bin/bash
# It is an ACE compilation flag that cannot be manually modified.
isAceBuildFlag="$ACEBUILDFLAG"
if [ "$isAceBuildFlag" = "true" ]; then
  exit 0
fi

# Select whether you want to execute the compile arkts script.
scriptBuildFlag=true
if [ "$scriptBuildFlag" = "false" ]; then
  exit 0
fi

project_path="${projectDir}"
ohpm_path="${ohpmPath}"
arkuiXSdkPath="${arkuiXSdkPath}"

# You can change the module name you want to compile.
moduleLists=${moduleList}

# You can change the android arkuix path to the specified path.
android_arkuix_path="$project_path/.arkui-x/android/app/src/main/assets/arkui-x"

# You can change the android systemRes path to the specified path.
android_systemRes_path="$project_path/.arkui-x/android/app/src/main/assets/arkui-x/systemres"

# You can change the ios arkuix path to the specified path.
ios_arkuix_path="$project_path/.arkui-x/ios/arkui-x"

# You can change the ios systemRes path to the specified path.
ios_systemRes_path="$project_path/.arkui-x/ios/arkui-x/systemres"

cd $project_path
$ohpm_path update
${platform !== Platform.Windows ? `chmod 755 hvigorw` : ''}
./hvigorw default@CompileArkTS -p module=$moduleLists
IFS=',' read -ra folders <<< "$moduleLists"

copyStageBundleToAndroidAndIOS() {
    deleteFile "$ios_arkuix_path"
    deleteFile "$android_arkuix_path"
    copyStageBundleToAndroidAndIOSByTarget "default" ""
    systemResPath="$arkuiXSdkPath/engine/systemres"
    copy "$systemResPath" "$ios_systemRes_path" 
    copy "$systemResPath" "$android_systemRes_path"
}

deleteFile() {
    for folder in "` + '${folders[@]}' + `"
    do
        local path="$1/$folder"
        if [ -d "$path" ]; then
            rm -rf "$path"
        fi
    done
}

copyStageBundleToAndroidAndIOSByTarget() {
    for folder in "` + '${folders[@]}' + `"
    do
        local src="$project_path/$folder/build/default/intermediates/loader_out/$1/ets"
        local resindex="$project_path/$folder/build/default/intermediates/res/$1/resources.index"
        local resPath="$project_path/$folder/build/default/intermediates/res/$1/resources"
        local moduleJsonPath="$project_path/$folder/build/default/intermediates/res/$1/module.json"
        local destClassName="$folder$2"
        local distAndroid="$android_arkuix_path/$destClassName/ets"
        local distIOS="$ios_arkuix_path/$destClassName/ets"
        local resindexAndroid="$android_arkuix_path/$destClassName/resources.index"
        local resPathAndroid="$android_arkuix_path/$destClassName/resources"
        local moduleJsonPathAndroid="$android_arkuix_path/$destClassName/module.json"
        local resindexIOS="$ios_arkuix_path/$destClassName/resources.index"
        local resPathIOS="$ios_arkuix_path/$destClassName/resources"
        local moduleJsonPathIOS="$ios_arkuix_path/$destClassName/module.json"
        mkdir -p "$distAndroid"
        copy "$src" "$distAndroid"
        copy "$resPath" "$resPathAndroid"
        cp "$resindex" "$resindexAndroid"
        cp "$moduleJsonPath" "$moduleJsonPathAndroid"
        mkdir -p "$distIOS"
        copy "$src" "$distIOS"
        copy "$resPath" "$resPathIOS"
        cp "$resindex" "$resindexIOS"
        cp "$moduleJsonPath" "$moduleJsonPathIOS"
    done
}

copy() {
  local src="$1"
  local dst="$2"
  for item in "$src"/*; do
    if [[ "` + '${item##*/}' + `" != "." ]]; then
      src_file="$src/` + '${item##*/}' + `"
      dst_file="$dst/` + '${item##*/}' + `"
      if [[ -f "$src_file" ]]; then
        parent_dir="$(dirname "$dst_file")"
        if [ ! -d "$parent_dir" ]; then
            mkdir -p "$parent_dir"
        fi
        cp "$src_file" "$dst_file"
      elif [[ -d "$src_file" ]]; then
        if [ ! -d "$dst_file" ]; then
            mkdir -p "$dst_file"
        fi
        copy "$src_file" "$dst_file"
      fi
    fi
  done
}

copyStageBundleToAndroidAndIOS`;
}

module.exports = {
  copy,
  rmdir,
  createPackageFile,
  replaceInfo,
  modifyHarmonyOSConfig,
  modifyNativeCppConfig,
  addCrosssPlatform,
  signIOS,
  modifyOpenHarmonyOSConfig,
  copyTemp,
  getFileList,
  getTempPath,
  getProjectInfo,
  createAndroidTaskInBuildGradle,
  createAndroidAndIosBuildArktsShell,
  createIosScriptInPbxproj
};
