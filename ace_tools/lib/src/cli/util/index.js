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
const { copy } = require('../ace-create/util');
const { devices, getDeviceID, devicesList } = require('../ace-devices');
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

function getModuleList(settingPath) {
  try {
    const moduleList = [];
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
  try {
    const modulePathList = {};
    const settingPath = path.join(projDir, 'build-profile.json5');
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

function getModuleAbilityList(projDir, moduleList) {
  try {
    const moduleAbilityList = [];
    const modulePathList = getModulePathList(projDir);
    for (let index = 0; index < moduleList.length; index++) {
      const moduleJsonPath = path.join(projDir, modulePathList[moduleList[index]],
        'src/main/module.json5');
      const moduleJsonFile = JSON5.parse(fs.readFileSync(moduleJsonPath));
      moduleJsonFile.module.abilities.forEach(component => {
        moduleAbilityList.push(moduleList[index] + '_' + component['name']);
      });
    }
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
    if (dir.includes('.xcodeproj')) {
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
    const pBXBuildIndex = pbxprojFileInfo.lastIndexOf('AppDelegate.h; sourceTree = "<group>"; };');
    const pBXGroupIndex = pbxprojFileInfo.lastIndexOf('/* AppDelegate.h */,');
    const updatepbxprojFileInfo = pbxprojFileInfo.slice(0, pBXBuildIndex + 41) + addPBXBuildInfo +
      pbxprojFileInfo.slice(pBXBuildIndex + 41, pBXGroupIndex + 20) +
      addPBXGroupInfo + pbxprojFileInfo.slice(pBXGroupIndex + 20);
    fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
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
    const addPBXBuildInfoIndex = pbxprojFileInfo.lastIndexOf('/* AppDelegate.m */; };');
    const addPBXFileReferenceIndex = pbxprojFileInfo.lastIndexOf('AppDelegate.m; sourceTree = "<group>"; };');
    const addchildrenIndex = pbxprojFileInfo.lastIndexOf('/* AppDelegate.m */,');
    const addPBXSourcesBuildPhaseIndex = pbxprojFileInfo.lastIndexOf('AppDelegate.m in Sources */,');
    const updatepbxprojFileInfo = pbxprojFileInfo.slice(0, addPBXBuildInfoIndex + 23) + addPBXBuildInfo +
      pbxprojFileInfo.slice(addPBXBuildInfoIndex + 23, addPBXFileReferenceIndex + 41) + addPBXFileReference +
      pbxprojFileInfo.slice(addPBXFileReferenceIndex + 41, addchildrenIndex + 20) + addchildren +
      pbxprojFileInfo.slice(addchildrenIndex + 20, addPBXSourcesBuildPhaseIndex + 28) + addPBXSourcesBuildPhase +
      pbxprojFileInfo.slice(addPBXSourcesBuildPhaseIndex + 28);
    fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
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
    const searchSourcesBuildPhase = '/* main.m in Sources */,';
    const addBuildFileIndex = pbxprojFileInfo.lastIndexOf('/* arkui-x */; };');
    const addFileReferenceIndex = pbxprojFileInfo.lastIndexOf('arkui-x; sourceTree = "<group>"; };');
    const addGroupChildrenIndex = pbxprojFileInfo.lastIndexOf('/* arkui-x */,');
    const addSourcesBuildPhaseIndex = pbxprojFileInfo.lastIndexOf('/* main.m in Sources */,');
    const updatepbxprojFileInfo = pbxprojFileInfo.slice(0, addBuildFileIndex + searchBuildFile.length) +
      addBuildFile + pbxprojFileInfo.slice(addBuildFileIndex + searchBuildFile.length,
        addFileReferenceIndex + searchFileReference.length) +
      addFileReference + pbxprojFileInfo.slice(addFileReferenceIndex + searchFileReference.length,
        addGroupChildrenIndex + searchGroupChildren.length) +
      addGroupChildren + pbxprojFileInfo.slice(addGroupChildrenIndex + searchGroupChildren.length,
        addSourcesBuildPhaseIndex + searchSourcesBuildPhase.length) +
      addSourcesBuildPhase + pbxprojFileInfo.slice(addSourcesBuildPhaseIndex + searchSourcesBuildPhase.length);
    fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
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
    return str
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

function syncHvigor(projectDir) {
  let pathTemplate = path.join(__dirname, 'template');
  const proHvigorVersion = JSON5.parse(fs.readFileSync(path.join(projectDir, 'hvigor/hvigor-config.json5'))).hvigorVersion;
  if (fs.existsSync(pathTemplate)) {
    const tempHvigorVersion = JSON5.parse(fs.readFileSync(
      path.join(pathTemplate, 'ohos_stage/hvigor/hvigor-config.json5'))).hvigorVersion;
    if (isCopyHvigor(proHvigorVersion, tempHvigorVersion)) {
      copy(path.join(pathTemplate, '/ohos_stage/hvigor'), path.join(projectDir, 'hvigor'));
    }
    return true;
  } else {
    pathTemplate = globalThis.templatePath;
    if (fs.existsSync(pathTemplate)) {
      const tempHvigorVersion = JSON5.parse(fs.readFileSync(
        path.join(pathTemplate, 'ohos_stage/hvigor/hvigor-config.json5'))).hvigorVersion;
      if (isCopyHvigor(proHvigorVersion, tempHvigorVersion)) {
        copy(path.join(pathTemplate, '/ohos_stage/hvigor'), path.join(projectDir, 'hvigor'));
      }
      return true;
    } else {
      console.error('Error: Template is not exist!');
      return false;
    }
  }
}

function isCopyHvigor(currentVersion, tempVersion) {
  try {
    const currentVers = currentVersion.match(/(\d+)\.(\d+)\.(\d+).*/).slice(1, 4);
    const tempVers = tempVersion.match(/(\d+)\.(\d+)\.(\d+).*/).slice(1, 4);
    for (let i = 0; i < currentVers.length; i++) {
      if (parseInt(currentVers[i]) === parseInt(tempVers[i])) {
        continue;
      } else if (parseInt(currentVers[i]) < parseInt(tempVers[i])) {
        return true;
      } else {
        return false;
      }
    }
    return false;
  } catch (err) {
    return true;
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
  syncHvigor,
  getModulePathList
};
