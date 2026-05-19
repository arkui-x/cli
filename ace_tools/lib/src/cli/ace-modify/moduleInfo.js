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
const {
  BUILD_PROFILE_PATH,
  APP_JSON5_PATH,
  STRING_RESOURCE_PATH,
} = require('./constants');
const { readJson5, logError } = require('./utils');

function getModulePath(moduleName) {
  if (!fs.existsSync(BUILD_PROFILE_PATH)) {
    return '';
  }
  const jsonObj = readJson5(BUILD_PROFILE_PATH);
  if (!jsonObj.modules || !Array.isArray(jsonObj.modules)) {
    return '';
  }
  const found = jsonObj.modules.find(m => m.name === moduleName);
  return found ? found.srcPath : '';
}

function getModuleAbility(moduleName) {
  const modulePath = getModulePath(moduleName);
  if (!modulePath) {
    return '';
  }
  const moduleJsonPath = `${modulePath}/src/main/module.json5`;
  if (!fs.existsSync(moduleJsonPath)) {
    return '';
  }
  const jsonObj = readJson5(moduleJsonPath);
  if (!jsonObj.module || !jsonObj.module.mainElement) {
    return '';
  }
  return jsonObj.module.mainElement;
}

function getModuleType(moduleName, modulePath) {
  const moduleJsonPath = `${modulePath}/src/main/module.json5`;
  if (!fs.existsSync(moduleJsonPath)) {
    logError(`Error: module ${moduleName} is not HarmonyOS module!`);
    return '';
  }
  const jsonObj = readJson5(moduleJsonPath);
  if (!jsonObj.module || !jsonObj.module.type) {
    logError(`Error: module ${moduleName} has no type definition!`);
    return '';
  }
  return jsonObj.module.type;
}

function getAppName() {
  if (!fs.existsSync(APP_JSON5_PATH)) {
    return '';
  }
  const jsonObj = readJson5(APP_JSON5_PATH);
  if (!jsonObj.app || !jsonObj.app.bundleName) {
    return '';
  }
  return jsonObj.app.bundleName;
}

function getPackageName() {
  if (!fs.existsSync(STRING_RESOURCE_PATH)) {
    return '';
  }
  const jsonObj = readJson5(STRING_RESOURCE_PATH);
  if (!jsonObj.string || !Array.isArray(jsonObj.string)) {
    return '';
  }
  const found = jsonObj.string.find(item => item.name === 'app_name');
  return found ? found.value : '';
}

function collectModulesFromBuildProfile() {
  if (!fs.existsSync(BUILD_PROFILE_PATH)) {
    return null;
  }
  const jsonObj = readJson5(BUILD_PROFILE_PATH);
  if (!jsonObj.modules || !Array.isArray(jsonObj.modules)) {
    return null;
  }

  const modules = [];
  const moduleTypes = [];
  const entryModules = [];

  for (const mod of jsonObj.modules) {
    if (!mod.name || !mod.srcPath) {
      continue;
    }
    const moduleType = getModuleType(mod.name, mod.srcPath);
    modules.push(mod.name);
    moduleTypes.push(moduleType);
    if (moduleType === 'entry') {
      entryModules.push(mod.name);
    }
  }

  return { modules, moduleTypes, entryModules };
}

function collectDesignatedModulesFromBuildProfile(designatedModules) {
  if (!fs.existsSync(BUILD_PROFILE_PATH)) {
    return null;
  }
  const jsonObj = readJson5(BUILD_PROFILE_PATH);
  if (!jsonObj.modules || !Array.isArray(jsonObj.modules)) {
    return null;
  }

  const modulesArray = [];
  const modulesTypeArray = [];
  const entryTypeArray = [];
  let hasFeatureModule = false;

  for (const mod of jsonObj.modules) {
    if (!designatedModules.includes(mod.name)) {
      continue;
    }
    const moduleType = getModuleType(mod.name, mod.srcPath);
    modulesArray.push(mod.name);
    modulesTypeArray.push(moduleType);
    if (moduleType === 'entry') {
      entryTypeArray.push(mod.name);
    }
    if (moduleType === 'feature') {
      hasFeatureModule = true;
    }
  }

  return { modulesArray, modulesTypeArray, entryTypeArray, hasFeatureModule };
}

function getModuleSrcPath(moduleName) {
  return getModulePath(moduleName);
}

function getModuleJsonPath(moduleName) {
  const modulePath = getModulePath(moduleName);
  if (!modulePath) {
    return '';
  }
  return `${modulePath}/src/main/module.json5`;
}

module.exports = {
  getModulePath,
  getModuleAbility,
  getModuleType,
  getAppName,
  getPackageName,
  collectModulesFromBuildProfile,
  collectDesignatedModulesFromBuildProfile,
  getModuleSrcPath,
  getModuleJsonPath,
};
