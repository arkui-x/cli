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

const { isProjectRootDir, getModuleList } = require('../util');
const { Platform, platform } = require('../ace-check/platform');
const exec = require('child_process').execSync;
const { getConfig } = require('../ace-config');
const config = getConfig();
const fs = require('fs');
const path = require('path');
let projectDir;
function clean() {
  projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  let successFlag = true;
  let failedMsg = "Clean faild:"
  if (!cleanOHOS()) {
    failedMsg += "\tcleanOHOS";
    successFlag = false;
  }
  if (!cleanAndroid()) {
    failedMsg += "\tcleanAndroid";
    successFlag = false;
  }
  if (platform == Platform.MacOS) {
    if (!cleanIOS()) {
      failedMsg += "\tcleanIOS";
      successFlag = false;
    }
  }
  if (!cleanOutputPath()) {
    failedMsg += "\tcleanOutputPath";
    successFlag = false;
  }
  if (!cleanJSBundle()) {
    failedMsg += "\tcleanJSBundle";
    successFlag = false;
  }
  if (successFlag) {
    console.log('Clean project successfully');
  } else {
    console.log('Clean project failed');
    console.log(failedMsg);
  }
}

function cleanAndroid() {
  let cmds = [];
  const androidDir = path.join(projectDir, 'android');
  if (platform !== Platform.Windows) {
    cmds.push(`cd ${androidDir} && chmod 755 gradlew`);
  }
  cmds.push(`cd ${androidDir} && ./gradlew clean`);
  let message = 'Clean android project successful.';
  let isBuildSuccess = true;
  console.log('Start clean android project...');
  cmds = cmds.join(' && ');
  console.log(cmds)
  if (platform === Platform.Windows) {
    cmds = cmds.replace(/\//g, '\\');
  }
  try {
    exec(cmds, {
      encoding: 'utf-8',
      stdio: 'inherit',
    });
  } catch (error) {
    console.error(error)
    message = 'Clean android project failed.';
    isBuildSuccess = false;
  }
  console.log(message);
  return isBuildSuccess;
}

function cleanIOS() {
  let cmds = [];
  const iosDir = path.join(projectDir, 'ios');
  cmds.push(`cd ${iosDir} && xcodebuild clean`);
  let message = 'Clean ios project successful.';
  let isBuildSuccess = true;
  console.log('Start clean ios project...');
  cmds = cmds.join(' && ');
  console.log(cmds)
  if (platform === Platform.Windows) {
    cmds = cmds.replace(/\//g, '\\');
  }
  try {
    exec(cmds, {
      encoding: 'utf-8',
      stdio: 'inherit',
    });
  } catch (error) {
    console.error(error)
    message = 'Clean ios project failed.';
    isBuildSuccess = false;
  }
  console.log(message);
  return isBuildSuccess;
}

function cleanOHOS() {
  const ohosDir = path.join(projectDir, '/ohos');
  let cmds = [`cd ${ohosDir}`];
  cmds.push(`npm install`);
  cmds.push(`node ./node_modules/@ohos/hvigor/bin/hvigor.js clean`);
  let message = 'Clean ohos project successful.';
  let isBuildSuccess = true;
  console.log('Start clean ohos project...');
  cmds = cmds.join(' && ');
  console.log(cmds)
  if (platform === Platform.Windows) {
    cmds = cmds.replace(/\//g, '\\');
  }
  try {
    exec(cmds, {
      encoding: 'utf-8',
      stdio: 'inherit',
    });
  } catch (error) {
    console.log(error)
    message = 'Clean ohos project failed.';
    isBuildSuccess = false;
  }
  console.log(message);
  return isBuildSuccess;
}

function cleanJSBundle() {
  let isContinue = true;
  const settingPath = path.join(projectDir, 'ohos/build-profile.json5');
  const moduleList = getModuleList(settingPath);
  moduleList.forEach(module => {
    const src = path.join(projectDir, '/ohos', module, 'build');
    isContinue = removeDir(src, [], true);
    const ohosSource = path.join(projectDir, 'ohos', module, '/src/main/');
    //This time, ohos resources is created by merging with source resources, should not be deleted.
    //Wait for the processing of resources to be modified.
    if (!removeDir(ohosSource, ['resources', 'config.json'], true)) {
      console.error("ohos code file delete failed");
      isContinue = false;
    }
  });
  if (!isContinue) {
    console.error("Ohos build file delete failed");
    isContinue = false;
  }
  const jsAndroid = path.join(projectDir, '/android/app/src/main/assets/js');
  const jsIOS = path.join(projectDir, '/ios/js');
  if (!removeDir(jsAndroid, [], true) || !removeDir(jsIOS, [], true)) {
    console.error("android or ios js file delete failed");
    isContinue = false;
  }
  const resourceAndroid = path.join(projectDir, '/android/app/src/main/assets/res/appres');
  const resourcehIOS = path.join(projectDir, '/ios/res/appres');
  if (!removeDir(resourceAndroid, [], true) || !removeDir(resourcehIOS, [], true)) {
    console.error("android or ios resource file delete failed");
    isContinue = false;
  }
  return isContinue;
}

function cleanOutputPath() {
  try {
    if (config && Object.prototype.hasOwnProperty.call(config, 'build-dir')) {
      const buildDir = config['build-dir'];
      removeDir(buildDir);
    }
  } catch (error) {
    console.error(error)
    return false;
  }
  return true;
}

function removeDir(path, ignoreDirArr, saveDirectory) {
  try {
    let files = [];
    if (fs.existsSync(path)) {
      files = fs.readdirSync(path);
      files.forEach((file) => {
        if (ignoreDirArr.indexOf(file) == -1) {
          let curPath = path + "/" + file;
          if (fs.statSync(curPath).isDirectory()) {
            removeDir(curPath, ignoreDirArr, false);
          } else {
            fs.unlinkSync(curPath);
          }
        }
      });
      files = fs.readdirSync(path);
      if (files.length == 0 && !saveDirectory) {
        fs.rmdirSync(path);
      }
    }
  } catch (error) {
    return false;
  }
  return true;
}

module.exports = clean;