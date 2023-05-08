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
function uninstall(fileType, device, bundle) {
  let toolObj;
  if (openHarmonySdkDir) {
    toolObj = getToolByType(fileType, OpenHarmony);
  } else if (harmonyOsSdkDir) {
    toolObj = getToolByType(fileType, HarmonyOS);
  } else {
    toolObj = getToolByType(fileType);
  }
  if (!toolObj) {
    console.error('There are not install tool, please check');
    return false;
  }
  if (validInputDevice(device)) {
    let successFlag;
    if (fileType == 'hap') {
      successFlag = uninstallHap(toolObj, device, bundle);
      if (!successFlag && openHarmonySdkDir && harmonyOsSdkDir) {
        toolObj = getToolByType(fileType, HarmonyOS);
        successFlag = uninstallHap(toolObj, device, bundle);
      }
    } else if (fileType == 'apk') {
      successFlag = uninstallApk(toolObj, device, bundle);
    } else if (fileType == 'app') {
      successFlag = uninstallApp(toolObj, device, bundle);
    }
    if (successFlag) {
      console.log(`Uninstall ${fileType.toUpperCase()} successfully.`);
    } else {
      console.error(`Uninstall ${fileType.toUpperCase()} failed.`);
    }
    return successFlag;
  } else {
    return false;
  }
}
function uninstallApp(toolObj, device, bundle) {
  let cmdPath;
  let cmdUninstallOption;
  let deviceOption;
  if ('ios-deploy' in toolObj) {
    cmdPath = toolObj['ios-deploy'];
    cmdUninstallOption = '--uninstall_only --bundle_id';
    deviceOption = device ? `--id ${device}` : '';
  } else {
    console.error('Internal error with ios-deploy checking');
    return false;
  }
  const cmdUninstall = `${cmdPath} ${deviceOption} ${cmdUninstallOption} ${bundle}`;
  try {
    const result = exec(`${cmdUninstall}`).toString().trim();
    if ((result.includes('Fail')) || (result.includes('failed'))) {
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
  let commands = [];
  if ('adb' in toolObj) {
    cmdPath = toolObj['adb'];
    cmdUninstallOption = 'uninstall';
    deviceOption = device ? `-s ${device}` : '';
  } else {
    console.error('Internal error with adb checking');
    return false;
  }
  const cmdUninstall = `${cmdPath} ${deviceOption} ${cmdUninstallOption} ${bundle}`;
  commands.push(`${cmdUninstall}`);
  try {
    const result = exec(`${commands}`).toString().trim();
    if ((result.includes('Fail')) || (result.includes('failed'))) {
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
  let commands = [];
  if ('hdc' in toolObj) {
    cmdPath = toolObj['hdc'];
    cmdUninstallOption = 'app uninstall';
    deviceOption = device ? `-t ${device}` : '';
  } else {
    console.error('Internal error with hdc checking');
    return false;
  }
  const cmdUninstall = `${cmdPath} ${deviceOption} ${cmdUninstallOption} ${bundle}`;
  commands.push(`${cmdUninstall}`);
  try {
    const result = exec(`${commands}`).toString().trim();
    if ((result.includes('Fail')) || (result.toLowerCase().includes('failed'))) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}
module.exports = uninstall;
