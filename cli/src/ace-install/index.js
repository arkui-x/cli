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

const { getToolByType } = require('../ace-check/getTool');
const { isProjectRootDir, validDevices } = require('../util');
function checkInstallFile(projectDir, fileType, moduleList) {
  try {
    const filePathList = [];
    let buildDir;
    //ohos will install all module hap
    if (fileType === 'hap') {
      moduleList.forEach(module => {
        if (!moduleList || moduleList.length == 0) {
          console.error('Please input target name.');
          return false;
        }
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
            return true;
          }
        });
      });
    }
    //android and ios only have one apk or app
    if (fileType === 'apk' || fileType === 'app') {
      buildDir = fileType == "apk" ? path.join(projectDir, 'android', 'build/outputs/apk/') :
        path.join(projectDir, 'ios', 'build/outputs/app/');
      const fileList = fs.readdirSync(buildDir).filter(function (file) {
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
  if (!isProjectRootDir(process.cwd())) {
    return false;
  }
  const projectDir = process.cwd();

  const filePathList = checkInstallFile(projectDir, fileType, moduleListInput);
  if (!filePathList || filePathList.length === 0) {
    console.error('There is no file to install');
    return false;
  }
  const toolObj = getToolByType(fileType);
  if (toolObj == null || toolObj == undefined) {
    console.error('There are not install tool, please check');
    return false;
  }
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
    } else if ('ios-deploy' in toolObj) {
      cmdPath = toolObj['ios-deploy'];
      cmdPushOption = 'push';
      cmdInstallOption = '--no-wifi';
      if (device) {
        deviceOption = `--id ${device}`;
      } else {
        deviceOption = '';
      }
    } else {
      console.error('Internal error with hdc/adb/ios-deploy checking');
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
    } else if (fileType === 'app') {
      try {
        for (let index = 0; index < filePathList.length; index++) {
          const filePath = filePathList[index];
          const cmdInstall = `${cmdPath} ${deviceOption} --bundle ${filePath} ${cmdInstallOption}`;
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
