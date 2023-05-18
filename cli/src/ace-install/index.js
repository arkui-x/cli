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

const fs = require('fs');
const path = require('path');
const exec = require('child_process').execSync;

const { getToolByType } = require('../ace-check/getTool');
const { isProjectRootDir, validInputDevice, getCurrentProjectSystem } = require('../util');
function checkInstallFile(projectDir, fileType, moduleList) {
  try {
    const filePathList = [];
    let buildDir;
    if (!moduleList || moduleList.length == 0) {
      console.error('Please input target name.');
      return false;
    }
    //ohos will install all module hap
    if (fileType === 'hap') {
      moduleList.forEach(module => {
        buildDir = path.join(projectDir, 'ohos', module, 'build/default/outputs/default');
        const fileList = fs.readdirSync(buildDir).filter(function (file) {
          return path.extname(file).toLowerCase() === `.${fileType}`;
        });
        fileList.forEach(file => {
          if (module !== 'entry') {
            module = module + '-entry';
          }
          if (file === `${module}-default-signed.${fileType}`) {
            filePathList.push(path.join(buildDir, file));
          }
        });
      });
    }
    //android and ios only have one apk or app
    if (fileType === 'apk' || fileType === 'app') {
      buildDir = fileType == "apk" ? path.join(projectDir, 'android', 'app/build/outputs/apk/debug/') :
        path.join(projectDir, 'ios', 'build/outputs/app/');
      const fileList = fs.readdirSync(buildDir).filter(file => {
        return path.extname(file).toLowerCase() === `.${fileType}`;
      });
      if (fileList && fileList.length > 1) {
        console.error(`Found more than 1 ${fileType} in ${buildDir}.Please inspect.`);
        return false;
      }
      fileList.forEach(file => {
        filePathList.push(path.join(buildDir, file));
      });
    }
    return filePathList;
  } catch (error) {
    console.error(`Please check install file.`);
    return [];
  }
}

function install(fileType, device, moduleListInput) {
  const projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  moduleListInput = moduleListInput.split(' ');
  const filePathList = checkInstallFile(projectDir, fileType, moduleListInput);
  if (!filePathList || filePathList.length === 0) {
    console.error('There is no file to install');
    return false;
  }
  const currentSystem = getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('current system is unknown.');
    return false;
  }
  const toolObj = getToolByType(fileType, currentSystem);
  if (!toolObj) {
    console.error('There is no install tool, please check');
    return false;
  }
  if (validInputDevice(device)) {
    let successFlag;
    if (fileType == 'hap') {
      successFlag = installHap(toolObj, filePathList, device);
    } else if (fileType == 'apk') {
      successFlag = installApk(toolObj, filePathList, device);
    } else if (fileType == 'app') {
      successFlag = installApp(toolObj, filePathList, device);
    }
    if (successFlag) {
      console.log(`Install ${fileType.toUpperCase()} successfully.`);
    } else {
      console.log(`Install ${fileType.toUpperCase()} failed.`);
    }
    return successFlag;
  }
  return false;
}
function installHap(toolObj, filePathList, device) {
  let cmdPath;
  let cmdInstallOption;
  let deviceOption;
  if ('hdc' in toolObj) {
    cmdPath = toolObj['hdc'];
    cmdInstallOption = 'app install -r';
    if (device) {
      deviceOption = `-t ${device}`;
    } else {
      deviceOption = '';
    }
  } else {
    console.error('Internal error with hdc checking');
    return false;
  }
  try {
    for (let index = 0; index < filePathList.length; index++) {
      const filePath = filePathList[index];
      const cmdPush = `${cmdPath} ${deviceOption} ${cmdInstallOption} ${filePath}`;
      const result = exec(`${cmdPush}`).toString().trim();
      if (result.toLowerCase().includes('fail')) {
        console.error(result);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Internal error with installing hap');
    return false;
  }
}

function installApk(toolObj, filePathList, device) {
  let cmdPath;
  let cmdInstallOption;
  let deviceOption;
  if ('adb' in toolObj) {
    cmdPath = toolObj['adb'];
    cmdInstallOption = 'install';
    if (device) {
      deviceOption = `-s ${device}`;
    } else {
      deviceOption = '';
    }
  } else {
    console.error('Internal error with adb checking');
    return false;
  }
  try {
    for (let index = 0; index < filePathList.length; index++) {
      const filePath = filePathList[index];
      const cmdInstall = `${cmdPath} ${deviceOption} ${cmdInstallOption} ${filePath}`;
      const result = exec(`${cmdInstall}`).toString().trim();
      if (result.includes('Failure')) {
        console.error(result);
        return false;
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}

function installApp(toolObj, filePathList, device) {
  let cmdPath;
  let cmdInstallOption;
  let deviceOption;
  if ('ios-deploy' in toolObj) {
    cmdPath = toolObj['ios-deploy'];
    cmdInstallOption = '--no-wifi';
    if (device) {
      deviceOption = `--id ${device}`;
    } else {
      deviceOption = '';
    }
  } else {
    console.error('Internal error with ios-deploy checking');
    return false;
  }
  try {
    for (let index = 0; index < filePathList.length; index++) {
      const filePath = filePathList[index];
      const cmdInstall = `${cmdPath} ${deviceOption} --bundle ${filePath} ${cmdInstallOption}`;
      const result = exec(`${cmdInstall}`).toString().trim();
      if (result.includes('Failure')) {
        console.error(result);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Internal error with installing app');
    return false;
  }
}
module.exports = install;
