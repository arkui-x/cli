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
const devices = require('../ace-devices');
global.HarmonyOS = 'HarmonyOS';
global.OpenHarmony = 'OpenHarmony';

function isProjectRootDir(currentDir) {
  const ohosBuildProfilePath = path.join(currentDir, 'ohos/build-profile.json5');
  const androidGradlePath = path.join(currentDir, 'android/settings.gradle');
  try {
    fs.accessSync(ohosBuildProfilePath);
    fs.accessSync(androidGradlePath);
    return true;
  } catch (error) {
    console.error(`Please go to your projectDir and run again.`);
    return false;
  }
}

function getModuleList(settingPath) {
  try {
    const moduleList = [];
    if (fs.existsSync(settingPath)) {
      const buildProfileInfo = JSON.parse(fs.readFileSync(settingPath).toString());
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

function getModuleAbilityList(projDir, moduleList) {
  try {
    const moduleAbilityList = [];
    for (let index = 0; index < moduleList.length; index++) {
      const moduleJsonPath = path.join(projDir, 'source', moduleList[index],
        'src/main/module.json5');
      const moduleJsonFile = JSON.parse(fs.readFileSync(moduleJsonPath));
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

function getCurrentProjectVersion(projDir) {
  let templateVer = '';
  const checkDir = path.join(projDir, 'source/entry/src/main');
  if (!fs.existsSync(checkDir)) {
    return templateVer;
  }
  const paths = fs.readdirSync(checkDir);
  paths.forEach(childDir => {
    if (childDir == 'ets') {
      templateVer = 'ets';
    } else if (childDir == 'js') {
      templateVer = 'js';
    }
  });
  return templateVer;
}

function isStageProject(projDir) {
  const checkFile = path.join(projDir, 'entry/build-profile.json5');
  if (!fs.existsSync(checkFile)) {
    return false;
  }
  const fileInfo = fs.readFileSync(checkFile).toString();
  return fileInfo.includes('stageMode');
}

function validInputDevice(device) {
  const devicesArr = devices();
  if (!device) {
    if (devicesArr.available.length == 1) {
      return true;
    } else if (devicesArr.available.length > 1) {
      console.error(`Error: more than one devices/emulators found, please use '--device <deviceId>'.`);
      return false;
    } else {
      console.error(`Error: device not found.`);
      return false;
    }
  } else {
    for (let i = 0; i < devicesArr.available.length; i++) {
      if (getDeviceID(devicesArr.available[i]) == device) {
        return true;
      }
    }
    console.error(`Error: device not found.`);
    return false;
  }
}

function getManifestPath(projectDir) {
  const version = getCurrentProjectVersion(projectDir);
  if (version == '') {
    console.log('project is not exists');
    return false;
  }
  return path.join(projectDir, 'source/entry/src/main', version, 'MainAbility/manifest.json');
}

function getCurrentProjectSystem(projDir) {
  let currentSystem = '';
  let configFile = path.join(projDir, 'ohos/entry/build-profile.json5');
  configFile = fs.existsSync(configFile) ? configFile : path.join(projDir, 'source/entry/build-profile.json5');
  if (!fs.existsSync(configFile)) {
    console.error(`Please check entry/build-profile.json5 existing.`);
    return null;
  }
  let buildProfileInfo = JSON5.parse(fs.readFileSync(configFile).toString());
  for (let index = 0; index < buildProfileInfo.targets.length; index++) {
    if (buildProfileInfo.targets[index].name === 'default') {
      if (buildProfileInfo.targets[index].runtimeOS == HarmonyOS) {
        currentSystem = HarmonyOS;
      } else {
        currentSystem = OpenHarmony;
      }
      break;
    }
  }
  return currentSystem;
}

function getDeviceID(device) {
  let id;
  if (device.split(/[\t\s]+/)[0] == 'iOS') {
    id = device.split(/[\t\s]+/)[4];
  } else {
    id = device.split(/[\t\s]+/)[2];
  }
  return id;
}


module.exports = {
  isProjectRootDir,
  getModuleList,
  getCurrentProjectVersion,
  validInputDevice,
  getManifestPath,
  isStageProject,
  getModuleAbilityList,
  getCurrentProjectSystem
};
