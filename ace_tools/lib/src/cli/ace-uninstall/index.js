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

const exec = require('child_process').execSync;

const { getToolByType } = require('../ace-check/getTool');
const { validInputDevice } = require('../util');
const { openHarmonySdkDir, harmonyOsSdkDir } = require('../ace-check/configs');
const { isSimulator, getIosVersion } = require('../ace-devices/index');
function uninstall(fileType, device, bundle) {
  let toolObj;
  if (!validInputDevice(device)) {
    return false;
  }
  if (openHarmonySdkDir) {
    toolObj = getToolByType(fileType, 'OpenHarmony');
  } else if (harmonyOsSdkDir) {
    toolObj = getToolByType(fileType, 'HarmonyOS');
  } else {
    toolObj = getToolByType(fileType);
  }
  if (!toolObj) {
    console.error('\x1B[31m%s\x1B[0m', 'There are not install tool, please check');
    return false;
  }
  let successFlag;
  if (fileType === 'hap' || fileType === 'haphsp') {
    successFlag = uninstallHap(toolObj, device, bundle);
    if (!successFlag && openHarmonySdkDir && harmonyOsSdkDir) {
      toolObj = getToolByType(fileType, 'HarmonyOS');
      successFlag = uninstallHap(toolObj, device, bundle);
    }
  } else if (fileType === 'apk') {
    successFlag = uninstallApk(toolObj, device, bundle);
  } else if (fileType === 'ios') {
    successFlag = uninstallApp(toolObj, device, bundle);
  }
  const fileTypeDict = {
    'ios': 'iOS APP',
    'apk': 'APK',
    'hap': 'HAP',
    'haphsp': 'HAP',
  };
  if (successFlag) {
    console.log(`${fileTypeDict[fileType]} uninstalled.`);
  } else {
    console.error('\x1B[31m%s\x1B[0m', `${fileTypeDict[fileType]} uninstalled failed.`);
  }
  return successFlag;
}
function uninstallApp(toolObj, device, bundle) {
  let cmdPath = '';
  let cmdUninstallOption = '';
  let deviceOption = '';
  if (isSimulator(device)) {
    cmdPath = 'xcrun simctl uninstall';
    deviceOption = device ? device : 'booted';
  } else if ('xcrun devicectl' in toolObj && Number(getIosVersion(device).split('.')[0]) >= 17) {
    cmdPath = toolObj['xcrun devicectl'] + ' device uninstall app ';
    deviceOption = device ? `--device ${device}` : '';
  } else if ('ios-deploy' in toolObj && Number(getIosVersion(device).split('.')[0]) < 17) {
    cmdPath = toolObj['ios-deploy'];
    cmdUninstallOption = '--uninstall_only --bundle_id';
    deviceOption = device ? `--id ${device}` : '';
  } else {
    console.error('\x1B[31m%s\x1B[0m', `ios-deploy is not installed or Xcode's version is below 15.0`);
    return false;
  }
  const cmdUninstall = `${cmdPath} ${deviceOption} ${cmdUninstallOption} ${bundle}`;
  try {
    const result = exec(`${cmdUninstall}`).toString().trim();
    if (result.includes('Fail') || result.includes('failed')) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}
function uninstallApk(toolObj, device, bundle) {
  let cmdPath;
  let cmdUninstallOption;
  let deviceOption;
  const commands = [];
  if ('adb' in toolObj) {
    cmdPath = toolObj['adb'];
    cmdUninstallOption = 'uninstall';
    deviceOption = device ? `-s ${device}` : '';
  } else {
    console.error('\x1B[31m%s\x1B[0m', 'Internal error with adb checking');
    return false;
  }
  const cmdUninstall = `${cmdPath} ${deviceOption} ${cmdUninstallOption} ${bundle}`;
  commands.push(`${cmdUninstall}`);
  try {
    const result = exec(`${commands}`).toString().trim();
    if (result.includes('Fail') || result.includes('failed')) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

function uninstallHap(toolObj, device, bundle) {
  let cmdPath;
  let cmdUninstallOption;
  let deviceOption;
  const commands = [];
  if ('hdc' in toolObj) {
    cmdPath = toolObj['hdc'];
    cmdUninstallOption = 'app uninstall';
    deviceOption = device ? `-t ${device}` : '';
  } else {
    console.error('\x1B[31m%s\x1B[0m', 'Internal error with hdc checking');
    return false;
  }
  const cmdUninstall = `${cmdPath} ${deviceOption} ${cmdUninstallOption} ${bundle}`;
  commands.push(`${cmdUninstall}`);
  try {
    const result = exec(`${commands}`).toString().trim();
    if (result.toLowerCase().includes('fail')) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}
module.exports = uninstall;
