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
const { isProjectRootDir, validInputDevice, getCurrentProjectSystem, getModulePathList,
  getHspModuleList, validInputModule, getEntryModule } = require('../util');
const { isSimulator, getIosVersion } = require('../ace-devices/index');
const installHapPackage = [];
let packageType = '';
const ohFileType = [];
function checkInstallFile(projectDir, fileType, moduleList, installFilePath, cmd) {
  let buildDir;
  try {
    const filePathList = [];
    const entryName = getEntryModule(projectDir);
    if (installFilePath) {
      filePathList.push(installFilePath);
      return filePathList;
    }
    if (!moduleList || moduleList.length === 0) {
      console.error('\x1B[31m%s\x1B[0m', 'Please input target name.');
      return false;
    }
    // ohos will install all module hap
    if (fileType === 'haphsp') {
      const modulePathList = getModulePathList(projectDir);
      const hspModuleList = getHspModuleList(projectDir);
      let inputFileType;
      moduleList.forEach(module => {
        let modulePackageName = '';
        if (hspModuleList.includes(module)) {
          inputFileType = 'hsp';
          modulePackageName = module;
        } else {
          inputFileType = 'hap';
          if (module !== entryName) {
            modulePackageName = module + '-' + entryName;
          } else {
            modulePackageName = module;
          }
        }
        buildDir = path.join(projectDir, modulePathList[module], 'build/default/outputs/default');
        const fileList = fs.readdirSync(buildDir).filter(function(file) {
          return path.extname(file).toLowerCase() === `.${inputFileType}`;
        });
        if (fileList.length === 1 && fileList[0] === `${modulePackageName}-default-unsigned.${inputFileType}`) {
          console.error('\x1B[31m%s\x1B[0m',
          `Error: Before installing the [${module}] ${inputFileType}, please complete the signature.`);
        }
        fileList.forEach(file => {
          if (file === `${modulePackageName}-default-signed.${inputFileType}`) {
            ohFileType.push(inputFileType);
            installHapPackage.push(module);
            filePathList.push(path.join(buildDir, file));
          }
        });
      });
    }
    if (fileType === 'hap' || fileType === 'hsp') {
      const modulePathList = getModulePathList(projectDir);
      moduleList.forEach(module => {
        buildDir = path.join(projectDir, modulePathList[module], 'build/default/outputs/default');
        const fileList = fs.readdirSync(buildDir).filter(function(file) {
          return path.extname(file).toLowerCase() === `.${fileType}`;
        });
        let modulePackageName = '';
        if (fileType === 'hap' && module !== entryName) {
          modulePackageName = module + '-' + entryName;
        } else {
          modulePackageName = module;
        }
        if (fileList.length === 1 && fileList[0] === `${modulePackageName}-default-unsigned.${fileType}`) {
          console.error('\x1B[31m%s\x1B[0m', `Error: Before installing the ${module} ${fileType},please complete the signature.`);
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
    if (fileType === 'ios') {
      buildDir = path.join(projectDir, '.arkui-x', 'ios', 'build/outputs/app/');
      const fileList = fs.readdirSync(buildDir).filter(file => {
        return path.extname(file).toLowerCase() === `.app`;
      });
      if (fileList && fileList.length > 1) {
        console.error('\x1B[31m%s\x1B[0m', `Found more than 1 app in ${buildDir}.Please inspect.`);
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
        if (dir === 'debug' || dir === 'release' || dir === 'profile') {
          fileList.push(`${dir}/` + fs.readdirSync(path.join(buildDir, dir)).filter(file => {
            return path.extname(file).toLowerCase() === `.${fileType}`;
          }));
        }
      });
      if (cmd) {
        if (cmd.debug) {
          filePathList.push(path.join(buildDir, `debug/app-debug.${fileType}`));
          packageType = 'Debug';
        } else if (cmd.profile) {
          filePathList.push(path.join(buildDir, `profile/app-profile.${fileType}`));
          packageType = 'Profile';
        } else {
          filePathList.push(path.join(buildDir, `release/app-release.${fileType}`));
          packageType = 'Release';
        }
      } else {
        if (fileList.includes(`release/app-release.${fileType}`)) {
          filePathList.push(path.join(buildDir, `release/app-release.${fileType}`));
          packageType = 'Release';
        } else if (fileList.includes(`debug/app-debug.${fileType}`)) {
          filePathList.push(path.join(buildDir, `debug/app-debug.${fileType}`));
          packageType = 'Debug';
        } else if (fileList.includes(`profile/app-profile.${fileType}`)) {
          filePathList.push(path.join(buildDir, `profile/app-profile.${fileType}`));
          packageType = 'Profile';
        }
      }
    }
    return filePathList;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', `Please check install file, path: ${buildDir}`);
    return [];
  }
}

function install(fileType, device, cmd, installFilePath) {
  if (cmd && cmd.path && !installFilePath) {
    installPath(fileType, device, cmd.path);
    return;
  }
  const projectDir = process.cwd();
  if (!installFilePath && !isProjectRootDir(projectDir)) {
    return false;
  }
  if (installFilePath && !isInstallFileExist(fileType, installFilePath)) {
    return false;
  }
  if (!validInputDevice(device)) {
    return false;
  }
  if (fileType === 'ios') {
    const buildDir = path.join(projectDir, '.arkui-x', 'ios', 'build', 'app.build');
    if (isSimulator(device) && fs.existsSync(path.join(buildDir, 'Release-iphoneos'))) {
      console.error('\x1B[31m%s\x1B[0m', 'Run "ace build ios -s" or "--simulator" to build an iOS APP file for the emulator first.');
      return false;
    }
    if (!isSimulator(device) && fs.existsSync(path.join(buildDir, 'Release-iphonesimulator'))) {
      console.error('\x1B[31m%s\x1B[0m', 'Your app is an emulator app. Run "ace build ios" to build an iOS APP file first.');
      return false;
    }
  }
  let moduleListInput = cmd.target;
  if (!moduleListInput) {
    if (fileType === 'hsp') {
      const hspModuleList = getHspModuleList(projectDir);
      if (hspModuleList.length === 0) {
        console.error('\x1B[31m%s\x1B[0m', `Install falied, no hsp module.`);
        return false;
      }
      moduleListInput = hspModuleList;
    } else {
      moduleListInput = [getEntryModule(projectDir)];
    }
  } else {
    moduleListInput = moduleListInput.split(',');
  }

  if (!validInputModule(projectDir, moduleListInput, fileType)) {
    return false;
  }
  const filePathList = checkInstallFile(projectDir, fileType, moduleListInput, installFilePath, cmd);
  if (!filePathList || filePathList.length === 0) {
    console.error('\x1B[31m%s\x1B[0m', 'There is no file to install');
    return false;
  }
  const currentSystem = installFilePath ? ' ' : getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('\x1B[31m%s\x1B[0m', 'current system is unknown.');
    return false;
  }
  const toolObj = getToolByType(fileType, currentSystem);
  if (!toolObj) {
    console.error('\x1B[31m%s\x1B[0m', 'There is no install tool, please check');
    return false;
  }
  return execInstallCmd(fileType, toolObj, device, filePathList);
}

function installCmdConstruct(fileType, toolObj, device) {
  let cmdPath;
  let cmdInstallOption = '';
  let deviceOption = '';
  if (fileType === 'hap' || fileType === 'hsp' || fileType === 'haphsp') {
    if (!('hdc' in toolObj)) {
      console.error('\x1B[31m%s\x1B[0m', 'Internal error with hdc checking');
      return undefined;
    }
    cmdPath = toolObj['hdc'];
    cmdInstallOption = 'app install -r';
    if (device) {
      deviceOption = `-t ${device}`;
    }
  } else if (fileType === 'apk') {
    if (!('adb' in toolObj)) {
      console.error('\x1B[31m%s\x1B[0m', 'Internal error with adb checking');
      return undefined;
    }
    cmdPath = toolObj['adb'];
    cmdInstallOption = 'install';
    if (device) {
      deviceOption = `-s ${device}`;
    }
  } else if (fileType === 'ios') {
    if (isSimulator(device)) {
      cmdPath = 'xcrun simctl install';
      if (device) {
        deviceOption = device;
      } else {
        deviceOption = 'booted';
      }
    } else {
      if ('ios-deploy' in toolObj && Number(getIosVersion(device).split('.')[0]) < 17) {
        cmdPath = toolObj['ios-deploy'];
        cmdInstallOption = '--no-wifi --bundle';
        if (device) {
          deviceOption = `--id ${device}`;
        }
      } else if ('xcrun devicectl' in toolObj && Number(getIosVersion(device).split('.')[0]) >= 17) {
        cmdPath = toolObj['xcrun devicectl'] + ' device install app';
        if (device) {
          deviceOption = `--device ${device}`;
        }
      } else {
        console.error('\x1B[31m%s\x1B[0m', `ios-deploy is not installed or Xcode's version is below 15.0`);
      }
    }
  }
  return `${cmdPath} ${deviceOption} ${cmdInstallOption}`;
}

function isInstallFileExist(fileType, installFilePath) {
  try {
    if (!fs.existsSync(installFilePath)) {
      console.error('\x1B[31m%s\x1B[0m', `Install file not found.`);
      return false;
    }
    fileType = fileType === 'ios' ? 'app' : fileType;
    if (path.extname(installFilePath).toLowerCase() !== `.${fileType}`) {
      console.error('\x1B[31m%s\x1B[0m', `Install file is not match to file type`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', `Please check install file.\n`, error);
    return false;
  }
}

function installPath(fileType, device, filePath) {
  const filePathList = [];
  const fileExtnameList = [];
  const fileList = filePath.split(',');
  if (fileType === 'haphsp') {
    fileExtnameList.push(...['hap', 'hsp']);
  } else {
    fileExtnameList.push(fileType === 'ios' ? 'app' : `${fileType}`);
  }

  for (let i = 0; i < fileList.length; i++) {
    if (!fs.existsSync(fileList[i])) {
      console.error('\x1B[31m%s\x1B[0m', `Current path "${fileList[i]}" not found.`);
      return false;
    }

    if (fs.statSync(fileList[i]).isFile()) {
      const fileExtname = path.extname(fileList[i]).toLowerCase().substring(1);
      if (!fileExtnameList.includes(fileExtname)) {
        console.error('\x1B[31m%s\x1B[0m', `Install file is not match to file type`);
        return false;
      }
      if (!filePathList.includes(fileList[i])) {
        filePathList.push(fileList[i]);
        ohFileType.push(fileExtname);
      }
    } else if (fs.statSync(fileList[i]).isDirectory()) {
      fs.readdirSync(fileList[i]).forEach(file => {
        const fileExtname = path.extname(file).toLowerCase().substring(1);
        if (fileExtnameList.includes(fileExtname) && !filePathList.includes(path.join(fileList[i], file))) {
          filePathList.push(path.join(fileList[i], file));
          ohFileType.push(fileExtname);
        }
      });
    }
  }

  let toolObj = getToolByType(fileType, 'OpenHarmony');
  if (!toolObj) {
    toolObj = getToolByType(fileType, 'HarmonyOS');
    if (!toolObj) {
      console.error('\x1B[31m%s\x1B[0m', 'There is no install tool, please check');
      return false;
    }
  }
  execInstallCmd(fileType, toolObj, device, filePathList);
}

function execInstallCmd(fileType, toolObj, device, filePathList) {
  const installCmd = installCmdConstruct(fileType, toolObj, device);
  let isInstalled = true;
  if (installCmd) {
    try {
      if (fileType === 'haphsp' || fileType === 'hap' || fileType === 'hsp') {
        const filePath = filePathList.join(' ');
        const result = exec(`${installCmd} ${filePath}`).toString().trim();
        if (result.toLowerCase().includes('failed') || result.toLowerCase().includes('failure')) {
          console.error(result);
          isInstalled = false;
        }
      } else {
        for (let index = 0; index < filePathList.length; index++) {
          const filePath = filePathList[index];
          const result = exec(`${installCmd} ${filePath}`).toString().trim();
          if (result.toLowerCase().includes('failed') || result.toLowerCase().includes('failure')) {
            console.error('\x1B[31m%s\x1B[0m', result);
            isInstalled = false;
          }
        }
      }
    } catch (error) {
      console.error('\x1B[31m%s\x1B[0m', `Internal error with installing ${fileType}`);
      isInstalled = false;
    }
  } else {
    isInstalled = false;
  }
  let showLog;
  if (installHapPackage.length === 0) {
    showLog = '';
  } else {
    showLog = ` [${installHapPackage.join('/')}]`;
  }
  if (isInstalled) {
    if (fileType === 'haphsp') {
      console.log(`${ohFileType.join('/').toUpperCase()}` + showLog + ` installed.`);
    } else if (fileType === 'hap' || fileType === 'hsp') {
      console.log(`${fileType.toUpperCase()}` + showLog + ` installed.`);
    } else if (fileType === 'apk') {
      console.log(`${packageType} ${fileType.toUpperCase()} installed.`);
    } else {
      console.log(`iOS installed.`);
    }
  } else {
    if (fileType === 'haphsp') {
      console.error('\x1B[31m%s\x1B[0m', `${ohFileType.join('/').toUpperCase()}` + showLog + ` installed failed.`);
    } else if (fileType === 'hap' || fileType === 'hsp') {
      console.error('\x1B[31m%s\x1B[0m', `${fileType.toUpperCase()}` + showLog + ` installed failed.`);
    } else if (fileType === 'apk') {
      console.error('\x1B[31m%s\x1B[0m', `${packageType} ${fileType.toUpperCase()} installed failed.`);
    } else {
      console.error('\x1B[31m%s\x1B[0m', `iOS installed failed.`);
    }
  }
  return isInstalled;
}

module.exports = {
  install,
  isInstallFileExist
};
