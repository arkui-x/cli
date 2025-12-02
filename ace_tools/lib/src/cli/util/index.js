/*
 * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
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
const path = require('path');
const JSON5 = require('json5');
const crypto = require('crypto');
const { getDeviceID, devicesList } = require('../ace-devices');
const { Platform, platform } = require('../ace-check/platform');
const { devEcoStudioVersion } = require('../ace-check/configs');
global.HarmonyOS = 'HarmonyOS';
global.OpenHarmony = 'OpenHarmony';

function isProjectRootDir(currentDir) {
  const ohosBuildProfilePath = path.join(currentDir, 'build-profile.json5');
  const androidGradlePath = path.join(currentDir, '.arkui-x/android/settings.gradle');
  try {
    fs.accessSync(ohosBuildProfilePath);
    fs.accessSync(androidGradlePath);
    return true;
  } catch (error) {
    console.error(`Operation failed. Go to your project directory and try again.`);
    return false;
  }
}

function getUUID(pbxprojFilePath) {
  if (!fs.existsSync(pbxprojFilePath)) {
    console.log('pbxproj file path not exit');
    return;
  }
  try {
    const fileInfo = fs.readFileSync(pbxprojFilePath);
    const newUUID = crypto.randomUUID().replace(/-/g, '').slice(0, 24).toUpperCase();

    if (fileInfo.includes(newUUID)) {
      return getUUID(pbxprojFilePath);
    } else {
      return newUUID;
    }
  } catch (error) {
    console.log('read pbxproj file error');
  }
}

/**
 * function generateUUID
 *  if new UUID exists in textWithUUIDs or generatedIdSet
 *  generateUUID will auto generate a New one
 * @param {*} textWithUUIDs text string With UUID
 * @param {*} generatedIdSet Set Object to keep the generated UUID,
 *              call new Set() to create Set Object before call generateUUID
 * @returns new UUID String
 */
function generateUUID(textWithUUIDs, generatedIdSet) {
  try {
    const newUUID = crypto.randomUUID().replace(/-/g, '').slice(0, 24).toUpperCase();
    if (textWithUUIDs && textWithUUIDs.includes(newUUID) ||
      generatedIdSet && generatedIdSet.has(newUUID)) {
      return generateUUID(textWithUUIDs, generatedIdSet);
    } else {
      if (generatedIdSet) {
        generatedIdSet.add(newUUID);
      }
      return newUUID;
    }
  } catch (error) {
    console.log('generateUUID error', error);
  }
}

function getModuleList(projectDir) {
  const moduleList = [];
  const settingPath = path.join(projectDir, 'build-profile.json5');
  try {
    if (fs.existsSync(settingPath)) {
      const buildProfileInfo = JSON5.parse(fs.readFileSync(settingPath).toString());
      for (let index = 0; index < buildProfileInfo.modules.length; index++) {
        moduleList.push(buildProfileInfo.modules[index].name);
      }
      return moduleList;
    } else {
      console.error(`Please check ${settingPath}.`);
      return null;
    }
  } catch (error) {
    console.error(`Please check ${settingPath}.`);
    return null;
  }
}

function getModulePathList(projDir) {
  const modulePathList = {};
  const settingPath = path.join(projDir, 'build-profile.json5');
  try {
    if (fs.existsSync(settingPath)) {
      const buildProfileInfo = JSON5.parse(fs.readFileSync(settingPath).toString());
      for (let index = 0; index < buildProfileInfo.modules.length; index++) {
        modulePathList[buildProfileInfo.modules[index].name] = buildProfileInfo.modules[index].srcPath;
      }
      return modulePathList;
    } else {
      console.error(`Please check ${settingPath}.`);
      return null;
    }
  } catch (error) {
    console.error(`Please check ${settingPath}.`);
    return null;
  }
}

function getModuleAbilityList(projDir, moduleName) {
  try {
    const moduleAbilityList = [];
    const modulePathList = getModulePathList(projDir);
    const moduleJsonPath = path.join(projDir, modulePathList[moduleName],
      'src/main/module.json5');
    const moduleJsonFile = JSON5.parse(fs.readFileSync(moduleJsonPath));
    moduleJsonFile.module.abilities.forEach(component => {
      moduleAbilityList.push(moduleName + '_' + component['name']);
    });
    return moduleAbilityList;
  } catch (error) {
    console.error(`Please check ${projDir}.`);
    return null;
  }
}

function validInputDevice(device) {
  const devicesArr = devicesList;
  if (!device) {
    if (devicesArr.available.length === 1) {
      return true;
    } else if (devicesArr.available.length > 1) {
      console.error(`Error: more than one devices/emulators found, please use '--device <deviceId>'.`);
      return false;
    } else {
      console.error(`Error: Device not found.`);
      return false;
    }
  } else {
    for (let i = 0; i < devicesArr.available.length; i++) {
      if (getDeviceID(devicesArr.available[i]) === device) {
        return true;
      }
    }
    console.error(`Error: Device not found.`);
    return false;
  }
}

function getCurrentProjectSystem(projDir) {
  let currentSystem = '';
  const configFile = path.join(projDir, 'build-profile.json5');
  if (!fs.existsSync(configFile)) {
    console.error(`Please check build-profile.json5 existing.`);
    return null;
  }
  const buildProfileInfo = JSON5.parse(fs.readFileSync(configFile).toString()).app.products;
  for (let index = 0; index < buildProfileInfo.length; index++) {
    if (buildProfileInfo[index].name === 'default') {
      if (buildProfileInfo[index].runtimeOS === 'HarmonyOS') {
        currentSystem = 'HarmonyOS';
      } else {
        currentSystem = 'OpenHarmony';
      }
      break;
    }
  }
  return currentSystem;
}

function isNativeCppTemplate(projDir) {
  const checkFile = path.join(projDir, `${getModulePathList(projDir)['entry']}/build-profile.json5`);
  if (!fs.existsSync(checkFile)) {
    return false;
  }
  const fileInfo = fs.readFileSync(checkFile).toString();
  return fileInfo.includes('CMakeLists.txt');
}

function getAarName(projectDir) {
  const aarName = [];
  const aarConfigPath = path.join(projectDir, '.arkui-x/android/settings.gradle');
  if (!fs.existsSync(aarConfigPath)) {
    return aarName;
  }
  fs.readFileSync(aarConfigPath).toString().split(/\r\n|\n|\r/gm).forEach(line => {
    if (line.indexOf('include') !== -1 && line.split("'")[1].substring(1) !== 'app') {
      aarName.push(line.split("'")[1].substring(1));
    }
  });
  return aarName;
}

function getFrameworkName(projectDir) {
  const frameworkName = [];
  const iosDir = fs.readdirSync(path.join(projectDir, '.arkui-x/ios'));
  iosDir.forEach(dir => {
    if (dir.includes('.xcodeproj') && dir !== 'app.xcodeproj') {
      frameworkName.push(dir.split('.')[0]);
    }
  });
  return frameworkName;
}

function addFileToPbxproj(pbxprojFilePath, fileName, fileType, moduleName) {
  if (fileType === 'headfile') {
    const headFileUUID = getUUID(pbxprojFilePath);
    if (headFileUUID === undefined) {
      console.log('get UUID Failed');
      return false;
    }
    const addPBXBuildInfo = '\n		' + headFileUUID + ' /* ' + fileName +
      ' */ = {isa = PBXFileReference; fileEncoding = 4; lastKnownFileType = sourcecode.c.h; path = ' +
      fileName + '; sourceTree = "<group>"; };';
    const addPBXGroupInfo = '\n				' + headFileUUID + ' /* ' + fileName + ' */,';
    const pbxprojFileInfo = fs.readFileSync(pbxprojFilePath).toString();
    if (!pbxprojFileInfo.includes(' /* ' + fileName + ' */,')) {
      const pBXBuildIndex = pbxprojFileInfo.lastIndexOf('AppDelegate.h; sourceTree = "<group>"; };');
      const pBXGroupIndex = pbxprojFileInfo.lastIndexOf('AppDelegate.h */,');
      const updatepbxprojFileInfo = pbxprojFileInfo.slice(0, pBXBuildIndex + 41) + addPBXBuildInfo +
        pbxprojFileInfo.slice(pBXBuildIndex + 41, pBXGroupIndex + 20) +
        addPBXGroupInfo + pbxprojFileInfo.slice(pBXGroupIndex + 20);
      fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
    }
  } else if (fileType === 'sourcefile') {
    const sourceFileFirstUUID = getUUID(pbxprojFilePath);
    const sourceFileSecondUUID = getUUID(pbxprojFilePath);
    if (sourceFileFirstUUID === undefined || sourceFileSecondUUID === undefined) {
      console.log('get UUID Failed');
      return false;
    }
    const addPBXBuildInfo = '\n		' + sourceFileFirstUUID + ' /* ' + fileName +
      ' in Sources */ = {isa = PBXBuildFile; fileRef = ' + sourceFileSecondUUID + ' /* ' + fileName + ' */; };';
    const addPBXFileReference = '\n		' + sourceFileSecondUUID + ' /* ' + fileName +
      ' */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.cpp.objcpp; path = ' + fileName +
      '; sourceTree = "<group>"; };';
    const addchildren = '\n				' + sourceFileSecondUUID + ' /* ' + fileName + ' */,';
    const addPBXSourcesBuildPhase = '\n				' + sourceFileFirstUUID + ' /* ' + fileName + ' in Sources */,';
    const pbxprojFileInfo = fs.readFileSync(pbxprojFilePath).toString();
    if (!pbxprojFileInfo.includes(' /* ' + fileName + ' in Sources */,')) {
      const addPBXBuildInfoIndex = pbxprojFileInfo.lastIndexOf('AppDelegate.m */; };');
      const addPBXFileReferenceIndex = pbxprojFileInfo.lastIndexOf('AppDelegate.m; sourceTree = "<group>"; };');
      const addchildrenIndex = pbxprojFileInfo.lastIndexOf('AppDelegate.m */,');
      const addPBXSourcesBuildPhaseIndex = pbxprojFileInfo.lastIndexOf('AppDelegate.m in Sources */,');
      const updatepbxprojFileInfo = pbxprojFileInfo.slice(0, addPBXBuildInfoIndex + 23) + addPBXBuildInfo +
        pbxprojFileInfo.slice(addPBXBuildInfoIndex + 23, addPBXFileReferenceIndex + 41) + addPBXFileReference +
        pbxprojFileInfo.slice(addPBXFileReferenceIndex + 41, addchildrenIndex + 20) + addchildren +
        pbxprojFileInfo.slice(addchildrenIndex + 20, addPBXSourcesBuildPhaseIndex + 28) + addPBXSourcesBuildPhase +
        pbxprojFileInfo.slice(addPBXSourcesBuildPhaseIndex + 28);
      fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
    }
  } else if (fileType === 'cfile') {
    const cBuildFileUUID = getUUID(pbxprojFilePath);
    const cFileReferenceUUID = getUUID(pbxprojFilePath);
    if (cBuildFileUUID === undefined || cFileReferenceUUID === undefined) {
      console.log('get UUID Failed');
      return false;
    }
    const addBuildFile = '\n		' + cBuildFileUUID + ' /* ' + fileName +
      ' in Sources */ = {isa = PBXBuildFile; fileRef = ' + cFileReferenceUUID + ' /* ' + fileName + ' */; };';
    const addFileReference = '\n		' + cFileReferenceUUID + ' /* ' + fileName +
      ' */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.cpp.cpp; name = ' + fileName +
      '; path = ../../' + moduleName + '/src/main/cpp/' + fileName + '; sourceTree = "<group>"; };';
    const addGroupChildren = '\n				' + cFileReferenceUUID + ' /* ' + fileName + ' */,';
    const addSourcesBuildPhase = '\n				' + cBuildFileUUID + ' /* ' + fileName + ' in Sources */,';
    const pbxprojFileInfo = fs.readFileSync(pbxprojFilePath).toString();
    const searchBuildFile = '/* arkui-x */; };';
    const searchFileReference = 'arkui-x; sourceTree = "<group>"; };';
    const searchGroupChildren = '/* arkui-x */,';
    const searchSourcesBuildPhase = 'AppDelegate.m in Sources */,';
    const addBuildFileIndex = pbxprojFileInfo.lastIndexOf('/* arkui-x */; };');
    const addFileReferenceIndex = pbxprojFileInfo.lastIndexOf('arkui-x; sourceTree = "<group>"; };');
    const addGroupChildrenIndex = pbxprojFileInfo.lastIndexOf('/* arkui-x */,');
    const addSourcesBuildPhaseIndex = pbxprojFileInfo.lastIndexOf('AppDelegate.m in Sources */,');
    const updatepbxprojFileInfo = pbxprojFileInfo.slice(0, addBuildFileIndex + searchBuildFile.length) +
      addBuildFile + pbxprojFileInfo.slice(addBuildFileIndex + searchBuildFile.length,
      addFileReferenceIndex + searchFileReference.length) +
      addFileReference + pbxprojFileInfo.slice(addFileReferenceIndex + searchFileReference.length,
      addGroupChildrenIndex + searchGroupChildren.length) +
      addGroupChildren + pbxprojFileInfo.slice(addGroupChildrenIndex + searchGroupChildren.length,
      addSourcesBuildPhaseIndex + searchSourcesBuildPhase.length) +
      addSourcesBuildPhase + pbxprojFileInfo.slice(addSourcesBuildPhaseIndex + searchSourcesBuildPhase.length);
    fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
  } else if (fileType === 'resource') {
    const resourceBuildFileUUID = getUUID(pbxprojFilePath);
    const resourceFileReferenceUUID = getUUID(pbxprojFilePath);
    if (resourceBuildFileUUID === undefined || resourceFileReferenceUUID === undefined) {
      console.log('get UUID Failed');
      return false;
    }
    const addBuildFile = '\n		' + resourceBuildFileUUID + ' /* ' + fileName +
      ' in Resources */ = {isa = PBXBuildFile; fileRef = ' + resourceFileReferenceUUID + ' /* ' + fileName + ' */; };';
    const addFileReference = '\n		' + resourceFileReferenceUUID + ' /* ' + fileName +
      ' */ = {isa = PBXFileReference; lastKnownFileType = folder; path = ' + fileName + '; sourceTree = "<group>"; };';
    const addGroupChildren = '\n				' + resourceFileReferenceUUID + ' /* ' + fileName + ' */,';
    const addResourcesBuildPhase = '\n				' + resourceBuildFileUUID + ' /* ' + fileName + ' in Resources */,';
    const pbxprojFileInfo = fs.readFileSync(pbxprojFilePath).toString();
    if (!pbxprojFileInfo.includes(' /* ' + fileName + ' in Resources */,')) {
      const searchBuildFile = '/* main.m */; };';
      const searchFileReference = 'main.m; sourceTree = "<group>"; };';
      const searchGroupChildren = '/* Products */,';
      const searchResourcesBuildPhase = '/* LaunchScreen.storyboard in Resources */,';
      const addBuildFileIndex = pbxprojFileInfo.lastIndexOf(searchBuildFile);
      const addFileReferenceIndex = pbxprojFileInfo.lastIndexOf(searchFileReference);
      const addGroupChildrenIndex = pbxprojFileInfo.lastIndexOf(searchGroupChildren);
      const addResourcesBuildPhaseIndex = pbxprojFileInfo.lastIndexOf(searchResourcesBuildPhase);
      const updatepbxprojFileInfo = pbxprojFileInfo.slice(0, addBuildFileIndex + searchBuildFile.length) +
        addBuildFile + pbxprojFileInfo.slice(addBuildFileIndex + searchBuildFile.length,
        addFileReferenceIndex + searchFileReference.length) +
        addFileReference + pbxprojFileInfo.slice(addFileReferenceIndex + searchFileReference.length,
        addGroupChildrenIndex + searchGroupChildren.length) +
        addGroupChildren + pbxprojFileInfo.slice(addGroupChildrenIndex + searchGroupChildren.length,
        addResourcesBuildPhaseIndex + searchResourcesBuildPhase.length) +
        addResourcesBuildPhase + pbxprojFileInfo.slice(addResourcesBuildPhaseIndex + searchResourcesBuildPhase.length);
      fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
    }
  } else {
    console.log('filetype error');
    return false;
  }
  return true;
}

function isAppProject(projectDir) {
  const settingsGradle = path.join(projectDir, '.arkui-x/android/settings.gradle');
  return fs.readFileSync(settingsGradle).toString().includes(`include ':app'`);
}

function getAbsolutePath(str) {
  if (path.isAbsolute(str)) {
    return str;
  } else {
    return path.join(process.cwd(), str);
  }
}

function getCrossPlatformModules(projectDir) {
  const crossFile = path.join(projectDir, '.arkui-x/arkui-x-config.json5');
  if (fs.existsSync(crossFile)) {
    const crossInfo = JSON5.parse(fs.readFileSync(crossFile).toString());
    return crossInfo.modules;
  }
  return [];
}

function modifyAndroidAbi(projectDir, cmd, fileType) {
  try {
    let abiFilters;
    if (!cmd || !cmd.targetPlatform) {
      abiFilters = ['arm64'];
    } else {
      abiFilters = cmd.targetPlatform.split(',');
    }
    cleanLibs(projectDir, abiFilters, fileType);
    if (!isNativeCppTemplate(projectDir)) {
      return;
    }
    const dir = 'app';
    const buildGradle = path.join(projectDir, `.arkui-x/android/${dir}/build.gradle`);
    if (fs.existsSync(buildGradle)) {
      const buildGradleInfo = fs.readFileSync(buildGradle, 'utf8').split(/\r\n|\n|\r/gm);
      for (let i = 0; i < buildGradleInfo.length; i++) {
        if (buildGradleInfo[i].includes('abiFilters')) {
          buildGradleInfo[i] = `            abiFilters`;
          abiFilters.forEach(abi => {
            if (abi === 'arm64') {
              buildGradleInfo[i] += ` "arm64-v8a",`;
            } else if (abi === 'arm') {
              buildGradleInfo[i] += ` "armeabi-v7a",`;
            } else if (abi === 'x86_64') {
              buildGradleInfo[i] += ` "x86_64",`;
            }
          });
          buildGradleInfo[i] = buildGradleInfo[i].slice(0, -1);
          break;
        }
      }
      fs.writeFileSync(buildGradle, buildGradleInfo.join('\r\n'));
    }
  } catch (err) {
    console.log(err);
  }
}

function validOptions(inputValue, optionValues) {
  let errInput = '';
  const inputArr = inputValue.split(',');
  for (let i = 0; i < inputArr.length; i++) {
    if (!optionValues.includes(inputArr[i])) {
      errInput = inputArr[i];
      break;
    }
  }
  return errInput;
}

function cleanLibs(projectDir, abiFilters, fileType) {
  let deleteLibDir;
  const dir = fileType === 'aar' ? getAarName(projectDir)[0] : 'app';
  if (!abiFilters.includes('arm')) {
    deleteLibDir = path.join(projectDir, `.arkui-x/android/${dir}/libs/armeabi-v7a`);
    fs.rmSync(deleteLibDir, { recursive: true, force: true });
  }
  if (!abiFilters.includes('arm64')) {
    deleteLibDir = path.join(projectDir, `.arkui-x/android/${dir}/libs/arm64-v8a`);
    fs.rmSync(deleteLibDir, { recursive: true, force: true });
  }
  if (!abiFilters.includes('x86_64')) {
    deleteLibDir = path.join(projectDir, `.arkui-x/android/${dir}/libs/x86_64`);
    fs.rmSync(deleteLibDir, { recursive: true, force: true });
  }
}

function getSdkVersionMap() {
  const sdkVersionMap = new Map([
    ['10', new Map([['devEcoVersion', '4.0.0'], ['compileSdkVersion', '4.0.0(10)'], ['compatibleSdkVersion', '4.0.0(10)'], ['modelVersion', '4.0.0'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '3.1.1']])],
    ['11', new Map([['devEcoVersion', '4.1.0'], ['compileSdkVersion', '4.1.0(11)'], ['compatibleSdkVersion', '4.1.0(11)'], ['modelVersion', '4.1.0'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '3.1.1']])],
    ['12', new Map([['devEcoVersion', '5.0.3'], ['compileSdkVersion', '5.0.0(12)'], ['compatibleSdkVersion', '5.0.0(12)'], ['modelVersion', '5.0.0'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '4.2.3']])],
    ['13', new Map([['devEcoVersion', '5.0.5'], ['compileSdkVersion', '5.0.1(13)'], ['compatibleSdkVersion', '5.0.1(13)'], ['modelVersion', '5.0.1'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '4.2.4']])],
    ['14', new Map([['devEcoVersion', '5.0.7'], ['compileSdkVersion', '5.0.2(14)'], ['compatibleSdkVersion', '5.0.2(14)'], ['modelVersion', '5.0.2'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '4.2.7']])],
    ['15', new Map([['devEcoVersion', '5.0.9'], ['compileSdkVersion', '5.0.3(15)'], ['compatibleSdkVersion', '5.0.3(15)'], ['modelVersion', '5.0.3'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '4.2.12']])],
    ['16', new Map([['devEcoVersion', '5.0.11'], ['compileSdkVersion', '5.0.4(16)'], ['compatibleSdkVersion', '5.0.4(16)'], ['modelVersion', '5.0.4'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '4.2.22']])],
    ['17', new Map([['devEcoVersion', '5.0.13'], ['compileSdkVersion', '5.0.5(17)'], ['compatibleSdkVersion', '5.0.5(17)'], ['modelVersion', '5.0.5'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '4.2.27']])],
    ['18', new Map([['devEcoVersion', '5.1.0'], ['compileSdkVersion', '5.1.0(18)'], ['compatibleSdkVersion', '5.1.0(18)'], ['modelVersion', '5.1.0'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '4.2.17']])],
    ['19', new Map([['devEcoVersion', '5.1.1'], ['compileSdkVersion', '5.1.1(19)'], ['compatibleSdkVersion', '5.1.1(19)'], ['modelVersion', '5.1.1'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '4.19.2']])],
    ['20', new Map([['devEcoVersion', '6.0.0'], ['compileSdkVersion', '6.0.0(20)'], ['compatibleSdkVersion', '6.0.0(20)'], ['modelVersion', '6.0.0'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '4.20.3']])],
    ['21', new Map([['devEcoVersion', '6.0.1'], ['compileSdkVersion', '6.0.1(21)'], ['compatibleSdkVersion', '6.0.1(21)'], ['modelVersion', '6.0.1'], ['runtimeOS', 'HarmonyOS'], ['hvigor-ohos-arkui-x-plugin', '4.21.0']])],
  ]);
  return sdkVersionMap;
}

function getArkuixPluginWithModelVersion(modelVersion) {
  const sdkVersionMap = getSdkVersionMap();
  let arkuixPluginVersion = '4.2.3';
  sdkVersionMap.forEach((value, key) => {
    const lModelVersion = value.get('modelVersion');
    if (lModelVersion === modelVersion) {
      arkuixPluginVersion = value.get('hvigor-ohos-arkui-x-plugin');
    }
  });
  return arkuixPluginVersion;
}

function getSdkVersionWithModelVersion(modelVersion) {
  const sdkVersionMap = getSdkVersionMap();
  let sdkVersion = '';
  sdkVersionMap.forEach((value, key) => {
    const lModelVersion = value.get('modelVersion');
    if (lModelVersion === modelVersion) {
      sdkVersion = key;
    }
  });
  return sdkVersion;
}

function getShowSdkVersion() {
  let sdkVersionMap = getSdkVersionMap();
  let showMap = new Map();
  let index = 1;
  sdkVersionMap.forEach((value, key) => {
    showMap.set(index.toString(), key);
    index = index + 1;
  });
  return showMap;
}

function isHaveSdkVersion(sdkVersion) {
  let sdkVersionMap = getSdkVersionMap();
  return sdkVersionMap.has(sdkVersion);
}

function getSdkVersionWithCompileSdkVersion(compileSdkVersion) {
  let sdkVersionMap = getSdkVersionMap();
  let sdkVersion = '';
  sdkVersionMap.forEach((value, key) => {
    let lcompileSdkVersion = value.get('compileSdkVersion');
    if (lcompileSdkVersion === compileSdkVersion) {
      sdkVersion = key;
    }
  });
  return sdkVersion;
}

function getSdkVersionWithDevEcoVersion(devEcoVersion) {
  let nowDevEcoVersion = devEcoVersion;
  let sdkVersionMap = getSdkVersionMap();
  let sdkVersion = '';
  sdkVersionMap.forEach((value, key) => {
    let ldevEcoVersion = value.get('devEcoVersion');
    if (ldevEcoVersion === nowDevEcoVersion || nowDevEcoVersion.startsWith(ldevEcoVersion)) {
      sdkVersion = key;
    }
  });
  return sdkVersion;
}

function getCompileSdkVersionWithSdkVersion(sdkVersion) {
  let sdkVersionMap = getSdkVersionMap();
  if (!(sdkVersionMap.has(sdkVersion))) {
    return '';
  }
  let sdkVersionData = sdkVersionMap.get(sdkVersion);
  return sdkVersionData.get('compileSdkVersion');
}

function getCompatibleSdkVersionWithSdkVersion(sdkVersion) {
  let sdkVersionMap = getSdkVersionMap();
  if (!(sdkVersionMap.has(sdkVersion))) {
    return '';
  }
  let sdkVersionData = sdkVersionMap.get(sdkVersion);
  return sdkVersionData.get('compatibleSdkVersion');
}

function getRuntimeOSWithSdkVersion(sdkVersion) {
  let sdkVersionMap = getSdkVersionMap();
  if (!(sdkVersionMap.has(sdkVersion))) {
    return '';
  }
  let sdkVersionData = sdkVersionMap.get(sdkVersion);
  return sdkVersionData.get('runtimeOS');
}

function getModelVersionWithSdkVersion(sdkVersion) {
  let sdkVersionMap = getSdkVersionMap();
  if (!(sdkVersionMap.has(sdkVersion))) {
    return '';
  }
  let sdkVersionData = sdkVersionMap.get(sdkVersion);
  return sdkVersionData.get('modelVersion');
}

function getSdkVersion(projectDir) {
  const buildProfilePath = path.join(projectDir, 'build-profile.json5');
  const hvigorfilePath = path.join(projectDir, '/hvigor/hvigor-config.json5');
  const integrateFilePath = path.join(projectDir, '.hvigor/cache/meta.json');
  if (fs.existsSync(buildProfilePath)) {
    const buildProfileInfo = JSON5.parse(fs.readFileSync(buildProfilePath).toString());
    if (buildProfileInfo.app.products[0].runtimeOS === 'OpenHarmony') {
      return buildProfileInfo.app.products[0].compileSdkVersion;
    }
    let nowSdkVersion = getSdkVersionWithDevEcoVersion(devEcoStudioVersion);
    if (nowSdkVersion !== '') {
      return nowSdkVersion;
    }
    if ('compileSdkVersion' in buildProfileInfo.app.products[0]) {
      return getSdkVersionWithCompileSdkVersion(buildProfileInfo.app.products[0].compileSdkVersion);
    } else {
      const hvigorfileInfo = JSON5.parse(fs.readFileSync(hvigorfilePath).toString());
      if (hvigorfileInfo.modelVersion) {
        return getSdkVersionWithModelVersion(hvigorfileInfo.modelVersion);
      } else {
        if (fs.existsSync(integrateFilePath)) {
          const intergrateInfo = JSON5.parse(fs.readFileSync(integrateFilePath).toString());
          return getSdkVersionWithCompileSdkVersion(intergrateInfo.compileSdkVersion);
        }
      }
    }
  } else {
    return null;
  }
}

function checkProjectType(projectDir) {
  if (fs.existsSync(projectDir, '.projectInfo')) {
    const filePath = path.join(projectDir, '.projectInfo');
    const content = fs.readFileSync(filePath, 'utf8').toString();
    const template = JSON5.parse(content).projectTemplate;
    return template;
  } else {
    return false;
  }
}

function getAndroidModule(projectDir) {
  const moduleName = [];
  const settingsGradle = path.join(projectDir, '.arkui-x/android/settings.gradle');
  if (!fs.existsSync(settingsGradle)) {
    return moduleName;
  }
  fs.readFileSync(settingsGradle).toString().split(/\r\n|\n|\r/gm).forEach(line => {
    if (line.indexOf(`include ':`) !== -1) {
      moduleName.push(line.split("'")[1].substring(1));
    }
  });
  return moduleName;
}

function getIosProjectName(projectDir) {
  let iosName = '';
  const iosDir = fs.readdirSync(path.join(projectDir, '.arkui-x/ios'));
  for (let i = 0; i < iosDir.length; i++) {
    if (iosDir[i].includes('.xcodeproj')) {
      iosName = iosDir[i].split('.')[0];
      break;
    }
  }
  iosName = iosName || 'app';
  return iosName;
}

function getModuleType(projectDir, modulePath) {
  let moduleType = '';
  const hvigorFile = path.join(projectDir, modulePath, 'hvigorfile.ts');
  const checkFile = path.join(projectDir, modulePath, 'build-profile.json5');
  if (fs.existsSync(hvigorFile) && fs.existsSync(checkFile)) {
    const hvigorInfo = fs.readFileSync(hvigorFile).toString();
    const checkInfo = fs.readFileSync(checkFile).toString();
    if (hvigorInfo.includes('HapTasks')) {
      if (checkInfo.includes('CMakeLists.txt')) {
        moduleType = 'NativeC++';
      } else {
        moduleType = 'EmptyAbility';
      }
    } else if (hvigorInfo.includes('hspTasks')) {
      if (checkInfo.includes('CMakeLists.txt')) {
        moduleType = 'ShareC++';
      } else {
        moduleType = 'ShareAbility';
      }
    }
  }
  return moduleType;
}

function getHspModuleList(projectDir) {
  const hspModuleList = [];
  const modulePathList = getModulePathList(projectDir);
  if (modulePathList === null || Object.keys(modulePathList).length === 0) {
    return hspModuleList;
  }
  Object.keys(modulePathList).forEach(module => {
    const moduleType = getModuleType(projectDir, modulePathList[module]);
    if (moduleType.includes('Share')) {
      hspModuleList.push(module);
    }
  });
  return hspModuleList;
}

function validInputModule(projectDir, inputModules, fileType) {
  const moduleListAll = getModuleList(projectDir);
  const hspModuleList = getHspModuleList(projectDir);
  const crossPlatformModules = getCrossPlatformModules(projectDir);
  let moduleListSpecified;
  if (fileType === 'hap') {
    moduleListSpecified = moduleListAll.filter(element => !hspModuleList.includes(element));
  } else if (fileType === 'haphsp') {
    moduleListSpecified = moduleListAll;
  } else if (fileType === 'hsp') {
    moduleListSpecified = hspModuleList;
  } else {
    moduleListSpecified = crossPlatformModules;
  }
  for (let i = 0; i < inputModules.length; i++) {
    if (!moduleListAll.includes(inputModules[i])) {
      console.error('\x1B[31m%s\x1B[0m', `Module "${inputModules[i]}" is not exist, please input correct module.`);
      return false;
    }

    if (!moduleListSpecified.includes(inputModules[i])) {
      console.error('\x1B[31m%s\x1B[0m', `Module "${inputModules[i]}" does not support current type.`);
      return false;
    }
  }
  return true;
}

function getLaunchModule(projectDir, inputModules) {
  const moduleList = inputModules.split(',');
  const entryModule = getEntryModule(projectDir);
  if (entryModule && moduleList.includes(entryModule)) {
    return entryModule;
  }
  const hspModule = getHspModuleList(projectDir);
  const targetName = moduleList.filter(element => !hspModule.includes(element));

  if (targetName.length === 0) {
    console.error('\x1B[31m%s\x1B[0m', 'no module to launch.');
    return null;
  } else {
    return targetName[0];
  }
}

function getEntryModule(projectDir) {
  let entryModule;
  const moduleList = getModulePathList(projectDir);
  if (!moduleList) {
    return '';
  }
  for (let i = 0; i < Object.values(moduleList).length; i++) {
    const moduleJson = path.join(projectDir, Object.values(moduleList)[i], 'src/main/module.json5');
    const jsonInfo = JSON5.parse(fs.readFileSync(moduleJson).toString());
    if (jsonInfo.module.type === 'entry') {
      entryModule = jsonInfo.module.name;
      break;
    }
  }
  if (!entryModule) {
    console.error('\x1B[31m%s\x1B[0m', 'no entry module found!');
  }
  return entryModule;
}

function setDevEcoSdkInEnv(DevEcoDir) {
  if (DevEcoDir) {
    const environment = process.env;
    if (platform === Platform.Windows && fs.existsSync(DevEcoDir + '\\sdk')) {
      environment['DEVECO_SDK_HOME'] = DevEcoDir + '\\sdk';
      environment['Path'] = DevEcoDir + '\\sdk;' + environment['Path'];
    } else if (platform === Platform.MacOS && fs.existsSync(DevEcoDir + '/Contents/sdk')) {
      environment['DEVECO_SDK_HOME'] = DevEcoDir + '/Contents/sdk';
      environment['PATH'] = DevEcoDir + '/Contents/sdk:' + environment['PATH'];
    } else {
      console.log('DevEcoDir is not IntergrateIDE, setDevEcoSdkInEnv failed.');
    }
  } else {
    console.log('DevEcoDir is required, DevEcoDir is null.');
  }
}

function replaceInfo(files, replaceInfos, strs) {
  for (let i = 0; i < files.length; i++) {
    const data = fs.readFileSync(files[i], 'utf8');
    if (data === undefined) {
      return;
    }
    const lines = data.split('\n');
    for (let j = 0; j < lines.length; j++) {
      if (lines[j].includes(replaceInfos[i])) {
        const newLine = lines[j].replaceAll(replaceInfos[i], strs[i]);
        lines[j] = newLine;
      }
    }
    const newData = lines.join('\n');
    fs.writeFileSync(files[i], newData, 'utf8');
  }
}

module.exports = {
  isProjectRootDir,
  getModuleList,
  validInputDevice,
  getModuleAbilityList,
  getCurrentProjectSystem,
  isNativeCppTemplate,
  getAarName,
  getFrameworkName,
  getUUID,
  generateUUID,
  addFileToPbxproj,
  isAppProject,
  getAbsolutePath,
  getCrossPlatformModules,
  modifyAndroidAbi,
  validOptions,
  getSdkVersion,
  getModulePathList,
  checkProjectType,
  getAndroidModule,
  getIosProjectName,
  getModuleType,
  getHspModuleList,
  validInputModule,
  getLaunchModule,
  getEntryModule,
  setDevEcoSdkInEnv,
  getShowSdkVersion,
  isHaveSdkVersion,
  getCompileSdkVersionWithSdkVersion,
  getCompatibleSdkVersionWithSdkVersion,
  getRuntimeOSWithSdkVersion,
  getModelVersionWithSdkVersion,
  getSdkVersionWithModelVersion,
  replaceInfo,
  getArkuixPluginWithModelVersion,
};
