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
const installHapPackage = [];
let packageType = '';
function checkInstallFile(projectDir, fileType, moduleList) {
  try {
    const filePathList = [];
    let buildDir;
    if (!moduleList || moduleList.length === 0) {
      console.error('Please input target name.');
      return false;
    }
    // ohos will install all module hap
    if (fileType === 'hap') {
      moduleList.forEach(module => {
        buildDir = path.join(projectDir, module, 'build/default/outputs/default');
        const fileList = fs.readdirSync(buildDir).filter(function(file) {
          return path.extname(file).toLowerCase() === `.${fileType}`;
        });
        let modulePackageName = '';
        if (module !== 'entry') {
          modulePackageName = module + '-entry';
        } else {
          modulePackageName = module;
        }
        if (fileList.length === 1 && fileList[0] === `${modulePackageName}-default-unsigned.${fileType}`) {
          console.log('WARN: Before installing the [' + module + '] hap,please complete the signature.');
        }
        fileList.forEach(file => {
          if (file === `${modulePackageName}-default-signed.${fileType}`) {
            installHapPackage.push(module);
            filePathList.push(path.join(buildDir, file));
          }
        });
      });
    }
    // android and ios only have one apk or app
    if (fileType === 'app') {
      buildDir = path.join(projectDir, '.arkui-x', 'ios', 'build/outputs/app/');
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

    if (fileType === 'apk') {
      buildDir = path.join(projectDir, '.arkui-x', 'android', 'app/build/outputs/apk/');
      const fileList = [];
      fs.readdirSync(buildDir).forEach(dir => {
        if (dir === 'debug' || dir === 'release') {
          fileList.push(`${dir}/` + fs.readdirSync(path.join(buildDir, dir)).filter(file => {
            return path.extname(file).toLowerCase() === `.${fileType}`;
          }));
        }
      });
      if (fileList.length === 1 && fileList[0] === `release/app-release-unsigned.${fileType}`) {
        console.log('\x1B[31m%s\x1B[0m',
          'Warning: Before installing the apk, please sign and rebuild, or build the debug version.');
      }
      if (fileList.includes(`release/app-release.${fileType}`)) {
        filePathList.push(path.join(buildDir, `release/app-release.${fileType}`));
        packageType = 'Release';
      } else if (fileList.includes(`debug/app-debug.${fileType}`)) {
        filePathList.push(path.join(buildDir, `debug/app-debug.${fileType}`));
        packageType = 'Debug';
      }
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
  if (!validInputDevice(device)) {
    return false;
  }
  const installCmd = installCmdConstruct(fileType, toolObj, device);
  let isInstalled = true;
  if (installCmd) {
    try {
      for (let index = 0; index < filePathList.length; index++) {
        const filePath = filePathList[index];
        const result = exec(`${installCmd} ${filePath}`).toString().trim();
        if (result.toLowerCase().includes('fail')) {
          console.error(result);
          isInstalled = false;
        }
      }
    } catch (error) {
      console.error(`Internal error with installing ${fileType}`);
      isInstalled = false;
    }
  } else {
    isInstalled = false;
  }
  let stateStr = 'successfully';
  if (!isInstalled) {
    stateStr = 'failed';
  }
  if (fileType === 'hap') {
    console.log(`Install ${fileType.toUpperCase()} ` + `[${installHapPackage.join('/')}]` + ` ${stateStr}.`);
  } else if (fileType === 'apk') {
    console.log(`Install ${packageType} ${fileType.toUpperCase()} ${stateStr}.`);
  } else {
    console.log(`Install ${fileType.toUpperCase()} ${stateStr}.`);
  }
  return isInstalled;
}

function installCmdConstruct(fileType, toolObj, device) {
  let cmdPath;
  let cmdInstallOption = '';
  let deviceOption = '';
  if (fileType === 'hap') {
    if (!('hdc' in toolObj)) {
      console.error('Internal error with hdc checking');
      return undefined;
    }
    cmdPath = toolObj['hdc'];
    cmdInstallOption = 'app install -r';
    if (device) {
      deviceOption = `-t ${device}`;
    }
  } else if (fileType === 'apk') {
    if (!('adb' in toolObj)) {
      console.error('Internal error with adb checking');
      return undefined;
    }
    cmdPath = toolObj['adb'];
    cmdInstallOption = 'install';
    if (device) {
      deviceOption = `-s ${device}`;
    }
  } else if (fileType === 'app') {
    if (!('ios-deploy' in toolObj)) {
      console.error('Internal error with ios-deploy checking');
      return undefined;
    }
    cmdPath = toolObj['ios-deploy'];
    cmdInstallOption = '--no-wifi --bundle';
    if (device) {
      deviceOption = `--id ${device}`;
    }
  }
  return `${cmdPath} ${deviceOption} ${cmdInstallOption}`;
}
module.exports = install;
