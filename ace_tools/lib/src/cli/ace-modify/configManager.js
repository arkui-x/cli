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

const fs = require('fs');
const plist = require('plist');
const {
  ARKUIX_CONFIG_PATH,
  IOS_INFO_PLIST,
  BUILD_PROFILE_PATH,
  BUILD_PROFILE_PROBLEM_KEY,
} = require('./constants');
const {
  logError,
  logWarn,
  readJson5,
  writeJson5,
  fileExists,
} = require('./utils');
const { getAppName } = require('./moduleInfo');

function addModuleInArkuixConfig(hspModules) {
  if (!hspModules || hspModules.length === 0) {
    return;
  }

  if (!fileExists(ARKUIX_CONFIG_PATH)) {
    logError(`Error: The project does not contain the .arkui-x/arkui-x-config.json5 file. please modify an entry/feature type module as the cross-platform entry!`);
    return;
  }

  const jsonObj = readJson5(ARKUIX_CONFIG_PATH);
  if (!jsonObj.modules) {
    jsonObj.modules = [];
  }

  for (const module of hspModules) {
    if (!jsonObj.modules.includes(module)) {
      jsonObj.modules.push(module);
    }
  }

  writeJson5(ARKUIX_CONFIG_PATH, jsonObj);
}

function getArkuixConfig() {
  if (!fileExists(ARKUIX_CONFIG_PATH)) {
    return null;
  }
  return readJson5(ARKUIX_CONFIG_PATH);
}

function updateArkuixConfig(updater) {
  if (!fileExists(ARKUIX_CONFIG_PATH)) {
    return false;
  }
  const jsonObj = readJson5(ARKUIX_CONFIG_PATH);
  updater(jsonObj);
  writeJson5(ARKUIX_CONFIG_PATH, jsonObj);
  return true;
}

function addUrlInIosPlist() {
  if (!fileExists(IOS_INFO_PLIST)) {
    logError(`Error: iOS Info.plist not found at ${IOS_INFO_PLIST}`);
    return;
  }

  const infoPlistContent = fs.readFileSync(IOS_INFO_PLIST, 'utf8');
  const infoPlist = plist.parse(infoPlistContent);
  const bundleName = getAppName();

  if (!bundleName) {
    logError(`Error: Failed to get bundle name for iOS plist configuration`);
    return;
  }

  ensureBundleUrlTypes(infoPlist, bundleName);

  const updatedContent = plist.build(infoPlist);
  fs.writeFileSync(IOS_INFO_PLIST, updatedContent, 'utf8');
}

function ensureBundleUrlTypes(infoPlist, bundleName) {
  if (!infoPlist.CFBundleURLTypes) {
    infoPlist.CFBundleURLTypes = [];
  }

  if (infoPlist.CFBundleURLTypes.length > 0) {
    if (!infoPlist.CFBundleURLTypes[0].CFBundleURLSchemes) {
      infoPlist.CFBundleURLTypes[0].CFBundleURLSchemes = [];
    }
    infoPlist.CFBundleURLTypes[0].CFBundleURLSchemes = [bundleName];
  } else {
    infoPlist.CFBundleURLTypes.push({
      CFBundleURLSchemes: [bundleName],
    });
  }
}

function checkProblem() {
  if (!fileExists(BUILD_PROFILE_PATH)) {
    return;
  }
  const data = fs.readFileSync(BUILD_PROFILE_PATH, 'utf8');
  if (data.includes(BUILD_PROFILE_PROBLEM_KEY)) {
    logWarn(`WARN: arkui-x project must delete the '${BUILD_PROFILE_PROBLEM_KEY}' Setting Items in build-profile.json5`);
  }
}

function initProjectInfo() {
  const { PROJECT_INFO_PATH, PROJECT_INFO_TEMPLATE } = require('./constants');
  const { writeProjectInfoFile } = require('./utils');
  writeProjectInfoFile(PROJECT_INFO_PATH, PROJECT_INFO_TEMPLATE);
}

module.exports = {
  addModuleInArkuixConfig,
  getArkuixConfig,
  updateArkuixConfig,
  addUrlInIosPlist,
  ensureBundleUrlTypes,
  checkProblem,
  initProjectInfo,
};
