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
    console.error(`Error: more than one device/emulator, use 'ace install --device <deviceId>'.`);
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

function filterModuleByJson(projectDir, moduleList) {
  try {
    moduleList.forEach(module => {
      const jsonPath = path.join(projectDir, 'ohos', module, 'src/main/config.json');
      const jsonObj = JSON.parse(fs.readFileSync(jsonPath));
      if (jsonObj.module.distro.deliveryWithInstall === false) {
        moduleList.pop(module);
      }
    });
    return moduleList;
  } catch (error) {
    console.error('Please check deliveryWithInstall in config.json.');
    return [];
  }
}

function checkInstallFile(projectDir, fileType, moduleList) {
  try {
    const filePathList = [];
    let buildDir;
    moduleList.forEach(module => {
      if (fileType === 'hap') {
        buildDir = path.join(projectDir, 'ohos', module, 'build/outputs/hap/debug');
        const fileList = fs.readdirSync(buildDir).filter(function(file) {
          return path.extname(file).toLowerCase() === `.${fileType}`;
        });
        fileList.forEach(file => {
          if (module !== 'entry') {
            module = module + '-entry';
          }
          if (file === `${module}-debug-standard-signed.${fileType}`) {
            filePathList.push(path.join(buildDir, file));
            return true;
          }
        });
      } else if (fileType === 'apk') {
        if (module === 'entry') {
          module = 'app';
        }
        buildDir = path.join(projectDir, 'android', module, 'build/outputs/apk/debug');
        const fileList = fs.readdirSync(buildDir).filter(function(file) {
          return path.extname(file).toLowerCase() === `.${fileType}`;
        });
        fileList.forEach(file => {
          if (file === `${module}-debug.${fileType}`) {
            filePathList.push(path.join(buildDir, file));
            return true;
          }
        });
      }
    });
    return filePathList;
  } catch (error) {
    console.error(`Please check install file.`);
    return [];
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

function install(fileType, device, moduleListInput) {
  if (!isProjectRootDir(process.cwd())) {
    console.error('Please go to the root directory of project.');
    return false;
  }
  const projectDir = process.cwd();
  const settingPath = path.join(projectDir, 'ohos/settings.gradle');
  let moduleList = getModuleList(settingPath);
  if (!moduleList || moduleList.length === 0) {
    console.error('There is no module in project.');
    return false;
  }

  moduleList = filterModuleByJson(projectDir, moduleList);

  if (!moduleList || moduleList.length === 0) {
    console.error('There is no module in project.');
    return false;
  }
  if (moduleListInput && moduleListInput !== true) {
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
  const filePathList = checkInstallFile(projectDir, fileType, moduleList);
  if (!filePathList || filePathList.length === 0) {
    console.error('There is no file to install');
    return false;
  }
  const toolObj = getTool();
  if (validDevices(device) && toolObj) {
    let commands = [];
    let cmdPath;
    let cmdInstallOption;
    let cmdPushOption;
    let deviceOption;

    if ('hdc' in toolObj) {
      cmdPath = toolObj['hdc'];
      cmdPushOption = 'file send';
      cmdInstallOption = 'app install';
      if (device) {
        deviceOption = `-t ${device}`;
      } else {
        deviceOption = '';
      }
    } else if ('adb' in toolObj) {
      cmdPath = toolObj['adb'];
      cmdPushOption = 'push';
      cmdInstallOption = 'install';
      if (device) {
        deviceOption = `-s ${device}`;
      } else {
        deviceOption = '';
      }
    } else {
      console.error('Internal error with hdc and adb checking');
      return false;
    }

    const errorMessage = `Install ${fileType.toUpperCase()} failed.`;
    const successMessage = `Install ${fileType.toUpperCase()} successfully.`;
    if (fileType === 'hap') {
      const id = Math.floor(new Date().getTime() * Math.random()).toString(32);
      filePathList.forEach(filePath => {
        const cmdPush = `${cmdPath} ${deviceOption} ${cmdPushOption} ${filePath} /sdcard/${id}/${path.basename(filePath)}`;
        commands.push(cmdPush);
      });
      commands = commands.join(' && ');
      try {
        exec(`${commands}`);
        const cmdInstall = `${cmdPath} ${deviceOption} shell bm install -p /sdcard/${id}`;
        const result = exec(`${cmdInstall}`).toString().trim();
        if (result.includes('Failure')) {
          console.error(result);
          console.error(errorMessage);
          return false;
        }
        const cmdRemove = `${cmdPath} shell rm -rf /sdcard/${id}`;
        exec(`${cmdRemove}`);
        console.log(successMessage);
        return true;
      } catch (error) {
        console.error(errorMessage);
        return false;
      }
    } else if (fileType === 'apk') {
      try {
        for (let index = 0; index < filePathList.length; index++) {
          const filePath = filePathList[index];
          const cmdInstall = `${cmdPath} ${deviceOption} ${cmdInstallOption} ${filePath}`;
          const result = exec(`${cmdInstall}`).toString().trim();
          if (result.includes('Failure')) {
            console.error(result);
            console.error(errorMessage);
            return false;
          }
        }
        console.log(successMessage);
        return true;
      } catch (error) {
        console.error(errorMessage);
        return false;
      }
    }
  }
}

module.exports = install;
