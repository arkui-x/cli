/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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

const path = require('path');
const {
  ARKUIX_DIR,
  ANDROID_DIR,
  IOS_DIR,
  ARKUIX_CONFIG_PATH,
  MODULE_TYPE_ENTRY,
  MODULE_TYPE_FEATURE,
  MODULE_TYPE_SHARED,
  MODULE_TYPE_HAR,
  isAndroid,
  isIOS,
  isCrossPlatformModule,
} = require('./constants');
const {
  logError,
  logInfo,
  readJson5,
  writeJson5,
  fileExists,
  ensureDir,
} = require('./utils');
const { copyFileSync, copyFolderSync } = require('./fileOperations');
const { getAppName, getPackageName } = require('./moduleInfo');
const { replaceAndroidProjectInfo, replaceIOSProjectInfo, modifyCrossModule, modifyDirStructure } = require('./platformReplacer');
const { modifyModuleHvigorInfo, modifyProjectHvigorInfo } = require('./hvigorConfig');
const { addModuleInArkuixConfig, addUrlInIosPlist, initProjectInfo, checkProblem } = require('./configManager');
const { createStageInIOS, createStageInAndroid } = require('../ace-create/module/index');

function initArkuixConfig() {
  ensureDir('.arkui-x');
  copyFileSync(`${globalThis.templatePath}/arkui-x-config.json5`, ARKUIX_CONFIG_PATH);
  const jsonData = readJson5(ARKUIX_CONFIG_PATH);
  jsonData.modules = [];
  writeJson5(ARKUIX_CONFIG_PATH, jsonData);
}

function modifyEntryModule(moduleName, platforms) {
  initArkuixConfig();

  const appName = getAppName();
  const packageName = getPackageName();

  if (isAndroid(platforms)) {
    copyFolderSync(`${globalThis.templatePath}/android`, ANDROID_DIR);
    replaceAndroidProjectInfo(appName, packageName);
  }

  if (isIOS(platforms)) {
    copyFolderSync(`${globalThis.templatePath}/ios`, IOS_DIR);
    replaceIOSProjectInfo(appName);
  }

  modifyCrossModule(moduleName, appName, platforms);
  modifyProjectHvigorInfo();
  modifyModuleHvigorInfo(moduleName, MODULE_TYPE_ENTRY);

  if (isAndroid(platforms)) {
    modifyDirStructure(appName);
  }
}

function modifyFeatureModule(moduleName, platforms) {
  let templateDir = path.join(__dirname, 'template');
  if (!fileExists(templateDir)) {
    templateDir = globalThis.templatePath;
  }

  if (isIOS(platforms)) {
    createStageInIOS(moduleName, templateDir, MODULE_TYPE_FEATURE);
    addUrlInIosPlist();
  }

  if (isAndroid(platforms)) {
    createStageInAndroid(moduleName, templateDir, MODULE_TYPE_FEATURE);
  }

  modifyModuleHvigorInfo(moduleName, MODULE_TYPE_FEATURE);
}

function modifySharedModule(moduleName) {
  modifyModuleHvigorInfo(moduleName, MODULE_TYPE_SHARED);
}

function processModuleByType(moduleName, moduleType, platforms) {
  if (moduleType === MODULE_TYPE_ENTRY) {
    modifyEntryModule(moduleName, platforms);
    return true;
  }

  if (moduleType === MODULE_TYPE_FEATURE) {
    if (fileExists(ARKUIX_DIR)) {
      modifyFeatureModule(moduleName, platforms);
    } else {
      modifyEntryModule(moduleName, platforms);
    }
    return true;
  }

  if (moduleType === MODULE_TYPE_SHARED) {
    modifySharedModule(moduleName);
    return true;
  }

  if (moduleType === MODULE_TYPE_HAR) {
    return true;
  }

  return false;
}

function collectCrossPlatformModules(modulesArray, modulesTypeArray) {
  const crossPlatformModules = [];
  for (let i = 0; i < modulesArray.length; i++) {
    if (isCrossPlatformModule(modulesTypeArray[i])) {
      crossPlatformModules.push(modulesArray[i]);
    }
  }
  return crossPlatformModules;
}

function processAllModules(modulesArray, modulesTypeArray, platforms) {
  for (let i = 0; i < modulesArray.length; i++) {
    processModuleByType(modulesArray[i], modulesTypeArray[i], platforms);
  }

  const crossPlatformModules = collectCrossPlatformModules(modulesArray, modulesTypeArray);
  if (crossPlatformModules.length > 0) {
    addModuleInArkuixConfig(crossPlatformModules);
  }

  initProjectInfo();
  checkProblem();

  const { updateCrossPlatformConfig } = require('../ace-create/util');
  updateCrossPlatformConfig(process.cwd(), platforms);

  logInfo('modify HarmonyOS project to ArkUI-X project success!');
}

function processDesignatedModules(modulesArray, modulesTypeArray, platforms) {
  const successModules = [];
  const failedModules = [];
  const crossPlatformModules = [];

  for (let i = 0; i < modulesArray.length; i++) {
    if (processModuleByType(modulesArray[i], modulesTypeArray[i], platforms)) {
      successModules.push(modulesArray[i]);
      if (isCrossPlatformModule(modulesTypeArray[i])) {
        crossPlatformModules.push(modulesArray[i]);
      }
    } else {
      failedModules.push(modulesArray[i]);
    }
  }

  if (crossPlatformModules.length > 0) {
    addModuleInArkuixConfig(crossPlatformModules);
  }

  initProjectInfo();

  const { updateCrossPlatformConfig } = require('../ace-create/util');
  updateCrossPlatformConfig(process.cwd(), platforms);
  checkProblem();

  if (failedModules.length > 0) {
    logError(`Error: modify HarmonyOS modules {${failedModules.join(',')}} to ArkUI-X modules failed!`);
  }
  if (successModules.length > 0) {
    logInfo(`modify HarmonyOS modules {${successModules.join(',')}} to ArkUI-X modules success!`);
  }
}

module.exports = {
  initArkuixConfig,
  modifyEntryModule,
  modifyFeatureModule,
  modifySharedModule,
  processModuleByType,
  collectCrossPlatformModules,
  processAllModules,
  processDesignatedModules,
};
