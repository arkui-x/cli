/*
 * Copyright (c) 2021 Huawei Device Co., Ltd.
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
const exec = require('child_process').execSync;
const lodash = require('lodash');

const { getTool } = require('../ace-check/getTool');
const checkDevices = require('../ace-check/checkDevices');

function validDevices(device) {
  const devices = checkDevices(true) || [];
  if (devices.length === 0) {
    console.error('Error: no connected device.');
    return false;
  }
  const allDevices = checkDevices() || [];
  if (!device && allDevices.length > 1) {
    console.error(`Error: more than one device/emulator, use 'ace uninstall --device <deviceId>'.`);
    return false;
  }
  if (device && devices.indexOf(`${device}\tdevice`) === -1) {
    console.error(`Error: device ${device} not found.`);
    return false;
  }
  return true;
}

function getModuleList(settingPath) {
  const moduleList = [];
  try {
    if (fs.existsSync(settingPath)) {
      let settingStr = fs.readFileSync(settingPath).toString().trim();
      if (settingStr === 'include') {
        console.error(`There is no modules in project.`);
        return [];
      }
      settingStr = settingStr.split(`'`);
      if (settingStr.length % 2 === 0) {
        console.error(`Please check ${settingPath}.`);
        return [];
      } else {
        for (let index = 1; index < settingStr.length - 1; index++) {
          const moduleItem = settingStr[index].trim();
          if (moduleItem === '') {
            console.error(`Please check ${settingPath}.`);
            return [];
          } else if (moduleItem === ',') {
            continue;
          } else {
            moduleList.push(moduleItem.slice(1, settingStr[index].length));
          }
        }
        return moduleList;
      }
    }
  } catch (error) {
    console.error(`Please check ${settingPath}.`);
    return [];
  }
}

function getBundleName(projectDir, moduleList) {
  const manifestPathList = [];
  moduleList.forEach(module => {
    manifestPathList.push(path.join(projectDir, '/source', module, 'manifest.json'));
  });
  const bundleNameList = [];
  try {
    manifestPathList.forEach(manifestPath => {
      if (fs.existsSync(manifestPath)) {
        const bundleName = JSON.parse(fs.readFileSync(manifestPath)).appID;
        if (!bundleName) {
          console.error(`Please check appID in ${manifestPath}.`);
          return false;
        }
        bundleNameList.push(bundleName);
      }
    });
    return lodash.uniqWith(bundleNameList);
  } catch (error) {
    console.error(`Please check appID in manifest.json.`);
    return false;
  }
}

function isProjectRootDir(currentDir) {
  const ohosGradlePath = path.join(currentDir, 'ohos/settings.gradle');
  const androidGradlePath = path.join(currentDir, 'android/settings.gradle');
  try {
    fs.accessSync(ohosGradlePath);
    fs.accessSync(androidGradlePath);
    return true;
  } catch (error) {
    return false;
  }
}

function uninstall(fileType, device, moduleListInput) {
  if (!isProjectRootDir(process.cwd())) {
    console.error('Please go to the root directory of project.');
    return false;
  }
  const projectDir = process.cwd();
  const settingPath = path.join(projectDir, 'ohos/settings.gradle');
  let moduleList = getModuleList(settingPath);
  if (!moduleList) {
    console.error('There is no module in project.');
    return false;
  }
  if (moduleListInput) {
    const inputModules = moduleListInput.split(' ');
    for (let i = 0; i < inputModules.length; i++) {
      if (inputModules[i] === 'app') {
        inputModules[i] = 'entry';
      }
      if (!moduleList.includes(inputModules[i])) {
        console.error('Please input correct module name.');
        return false;
      }
    }
    moduleList = inputModules;
  }
  const bundleNameList = getBundleName(projectDir, moduleList);
  if (!bundleNameList) {
    console.error('There is no file to install');
    return false;
  }
  const toolObj = getTool();
  if (toolObj && validDevices(device)) {
    let cmdPath;
    let cmdUninstallOption;
    let deviceOption;
    let commands = [];
    const cmdStopOption = 'shell am force-stop';

    if ('hdc' in toolObj) {
      cmdPath = toolObj['hdc'];
      cmdUninstallOption = 'app uninstall';
      if (device) {
        deviceOption = `-t ${device}`;
      } else {
        deviceOption = '';
      }
    } else if ('adb' in toolObj) {
      cmdPath = toolObj['adb'];
      cmdUninstallOption = 'uninstall';
      if (device) {
        deviceOption = `-s ${device}`;
      } else {
        deviceOption = '';
      }
    } else {
      console.error('Internal error with hdc and adb checking');
      return false;
    }

    bundleNameList.forEach(bundleName => {
      const cmdStop = `${cmdPath} ${deviceOption} ${cmdStopOption} ${bundleName}`;
      const cmdUninstall = `${cmdPath} ${deviceOption} ${cmdUninstallOption} ${bundleName}`;
      commands.push(`${cmdStop} && ${cmdUninstall}`);
    });
    commands = commands.join(' && ');
    try {
      exec(`${commands}`);
      console.log(`Uninstall ${fileType.toUpperCase()} successfully.`);
      return true;
    } catch (error) {
      console.error(`Uninstall ${fileType.toUpperCase()} failed.` + error);
      return false;
    }
  }
}

module.exports = uninstall;
