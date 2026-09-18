/*
 * Copyright (c) 2022 Huawei Device Co., Ltd.
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

const compiler = require('./ace-compiler');
const packager = require('./ace-packager');
const { getConfig } = require('../ace-config');
const { commandLineToolsDir, devEcoStudioDir, devEcoStudioVersion } = require('../ace-check/configs');
const { getSdkVersionWithModelVersion, getModelVersionWithSdkVersion, replaceInfoByLine, getIsArkuixProject, checkProjectType } = require('../util/index');
const { Platform, platform } = require('../ace-check/platform');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');

function checkIsPluginProject() {
  const projectDir = process.cwd();
  let projectType = false;
  try {
    projectType = checkProjectType(projectDir);
  } catch (e) {
    console.error('\x1B[31m%s\x1B[0m',
      'Failed to read project type: ' + e.message);
  }
  const pluginProjectTypes = ['ffi', 'plugin', 'package'];
  if (pluginProjectTypes.includes(projectType)) {
    return true;
  }
  const crossConfigPath = path.join(projectDir, '.arkui-x', 'crossplatform-config.json5');
  if (fs.existsSync(crossConfigPath)) {
    return true;
  }
  console.error('\x1B[31m%s\x1B[0m',
    'ace build plugin can only be used in a cross-platform plugin project created with ' +
    'ace create -t plugin, ace create -t ffi, or ace create -t package. ' +
    'The current project is not a cross-platform plugin project. ' +
    'Please navigate to the plugin project directory and try again.');
  return false;
}

function build(target, cmd) {
  if (target === 'plugin') {
    if (!checkIsPluginProject()) {
      return;
    }
    if (checkVersion(target, cmd) && compiler(target, cmd)) {
      packager(target, cmd);
    }
    return;
  }
  if (checkVersion(target, cmd) && compiler(target, cmd)) {
    packager(target, cmd);
  }
}

function checkVersion(target, cmd) {
  if (!(getIsArkuixProject())) {
    return true;
  }
  if (checkDevEcoVersion()) {
    return true;
  }
  const apiVersion = getProjectApiVersion();
  const devVersion = getDevVersion();
  const runtimeOSStr = getRuntimeOS();
  if (runtimeOSStr !== 'HarmonyOS' || apiVersion <= 11) {
    return true;
  }
  if (apiVersion > devVersion) {
    console.error('\x1B[31m%s\x1B[0m', `error: current devEco is not support apiVersion:${apiVersion},please upgrade devEco`);
    return false;
  } else if (apiVersion < devVersion) {
    inquirer.prompt([{
      name: 'repair',
      type: 'input',
      message: `not find project configuration sdk,The project structure and configuration need to be upgraded before use. Whether to upgrade？(Y/N):`,
      validate(val) {
        return true;
      },
    }]).then(answersModules => {
      if (answersModules.repair !== 'Y' && answersModules.repair !== 'y') {
        console.log('The project structure and configuration need to be upgraded before use.');
      } else {
        upgradProjectConfig(apiVersion, devVersion);
        if (compiler(target, cmd)) {
          packager(target, cmd);
        }
      }
    });
    return false;
  } else {
    return true;
  }
}

function checkDevEcoVersion() {
  let nowDevEcoVersion = devEcoStudioVersion;
  if (nowDevEcoVersion === 'unknown' || nowDevEcoVersion === '') {
    return false;
  }
  let versionArray = nowDevEcoVersion.split('.');
  if (versionArray.length === 0) {
    return false;
  }
  return (parseInt(versionArray[0]) >= 6) ? true : false;
}

function upgradProjectConfig(apiVersion, devVersion) {
  if (apiVersion >= devVersion || apiVersion <= 11) {
    return;
  }
  const files = [];
  const replaceInfos = [];
  const strs = [];

  const projectDir = process.cwd();
  const hvigorfile = path.join(projectDir, '/hvigor/hvigor-config.json5');
  files.push(hvigorfile);
  const projectModelVersion = getProjectModelVersion();
  replaceInfos.push(projectModelVersion);
  const devSupportModelVersion = getModelVersionWithSdkVersion(`${devVersion}`);
  strs.push(devSupportModelVersion);
  
  const ohPackagePath = path.join(projectDir, '/oh-package.json5');
  const data = fs.readFileSync(ohPackagePath, 'utf8');
  const jsonObj = JSON5.parse(data);
  const ohPackageModelVersion = jsonObj.modelVersion;
  if (ohPackageModelVersion) {
    if (ohPackageModelVersion !== devSupportModelVersion) {
      files.push(ohPackagePath);
      replaceInfos.push(ohPackageModelVersion);
      strs.push(devSupportModelVersion);
    }
  }

  replaceInfoByLine(files, replaceInfos, strs);
}

function getRuntimeOS() {
  const projectDir = process.cwd();
  const buildProfileFilePath = `${projectDir}/build-profile.json5`;
  const data = fs.readFileSync(buildProfileFilePath, 'utf8');
  const jsonObj = JSON5.parse(data);
  let runtimeOSStr = '';
  if (jsonObj.app.products.length > 0) {
    runtimeOSStr = jsonObj.app.products[0].runtimeOS;
  }
  return runtimeOSStr;
}

function getProjectApiVersion() {
  const projectModelVersion = getProjectModelVersion();
  const apiVersionStr = getSdkVersionWithModelVersion(projectModelVersion);
  let apiVersion = 11;
  if (apiVersionStr !== '') {
    apiVersion = Number(apiVersionStr);
  }
  return apiVersion;
}

function getProjectModelVersion() {
  const projectDir = process.cwd();
  const hvigorConfigFilePath = `${projectDir}/hvigor/hvigor-config.json5`;
  const data = fs.readFileSync(hvigorConfigFilePath, 'utf8');
  const jsonObj = JSON5.parse(data);
  const projectModelVersion = jsonObj.modelVersion;
  return projectModelVersion;
}

function getDevVersion() {
  let devSdkPath = `${devEcoStudioDir}/Contents/sdk/default/sdk-pkg.json`;
  if (platform === Platform.Windows) {
    devSdkPath = `${devEcoStudioDir}\\sdk\\default\\sdk-pkg.json`;
  } else if (platform === Platform.Linux) {
    devSdkPath = `${commandLineToolsDir}/sdk/default/sdk-pkg.json`;
  }
  const data = fs.readFileSync(devSdkPath, 'utf8');
  const jsonObj = JSON5.parse(data);
  const devVersion = jsonObj.data.apiVersion;
  const devVersionNumber = Number(devVersion);
  return devVersionNumber;
}

module.exports = {build, getDevVersion};