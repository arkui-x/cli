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

const { isProjectRootDir, getAarName, getSdkVersion } = require('../util');
const { Platform, platform } = require('../ace-check/platform');
const exec = require('child_process').execSync;
const { getConfig } = require('../ace-config');
const { getOhpmTools, getIntergrateHvigorw } = require('../ace-check/getTool');
const config = getConfig();
const fs = require('fs');
const path = require('path');
let projectDir;

function clean() {
  projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  if (!fs.existsSync(path.join(projectDir, 'oh_modules'))) {
    console.log('Project cleaned up.');
    return;
  }
  let successFlag = true;
  let failedMsg = 'Clean failed:';
  if (!cleanOHOS()) {
    failedMsg += '\tcleanOHOS';
    successFlag = false;
  }
  if (!cleanAndroid()) {
    failedMsg += '\tcleanAndroid';
    successFlag = false;
  }
  if (getAarName(projectDir).length !== 0 && !cleanAAR()) {
    failedMsg += '\tcleanAAR';
    successFlag = false;
  }
  if (platform === Platform.MacOS) {
    if (!cleanIOS()) {
      failedMsg += '\tcleanIOS';
      successFlag = false;
    }
  }
  if (!cleanOutputPath()) {
    failedMsg += '\tcleanOutputPath';
    successFlag = false;
  }
  if (successFlag) {
    console.log('Project cleaned up.');
  } else {
    console.log('Clean project failed');
    console.log(failedMsg);
  }
}

function cleanAndroid() {
  let cmds = [];
  const androidDir = path.join(projectDir, '.arkui-x', 'android');
  let message = 'Android project cleaned up.';
  if (!fs.existsSync(path.join(projectDir, '.arkui-x/android/app/build'))) {
    console.log(message);
    return true;
  }
  if (platform !== Platform.Windows) {
    cmds.push(`cd ${androidDir} && chmod 755 gradlew`);
  }
  cmds.push(`cd ${androidDir} && ./gradlew clean`);
  let isBuildSuccess = true;
  console.log('Cleaning up the Android project...');
  cmds = cmds.join(' && ');
  console.log(cmds);
  if (platform === Platform.Windows) {
    cmds = cmds.replace(/\//g, '\\');
  }
  try {
    exec(cmds, {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
  } catch (error) {
    console.error(error);
    message = 'Clean android project failed.';
    isBuildSuccess = false;
  }
  console.log(message);
  return isBuildSuccess;
}

function cleanIOS() {
  let cmds = [];
  const iosDir = path.join(projectDir, '.arkui-x', 'ios');
  cmds.push(`cd ${iosDir} && xcodebuild clean`);
  let message = 'iOS project cleaned up.';
  let isBuildSuccess = true;
  console.log('Cleaning up the iOS project...');
  cmds = cmds.join(' && ');
  console.log(cmds);
  if (platform === Platform.Windows) {
    cmds = cmds.replace(/\//g, '\\');
  }
  try {
    exec(cmds, {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
  } catch (error) {
    console.error(error);
    message = 'Clean ios project failed.';
    isBuildSuccess = false;
  }
  console.log(message);
  return isBuildSuccess;
}

function cleanOHOS() {
  const ohosDir = projectDir;
  let cmds = [`cd ${ohosDir}`];
  const ohpmPath = getOhpmTools();
  if (!ohpmPath) {
    console.log('\x1B[31m%s\x1B[0m', 'Error: Ohpm tool is not available.');
    return false;
  }
  cmds.push(`${ohpmPath} install`);
  if (platform !== Platform.Windows && Number(getSdkVersion(projectDir)) < 12) {
    cmds.push(`chmod 755 hvigorw`);
  }
  let buildCmd = `./hvigorw`;
  if (Number(getSdkVersion(projectDir)) >= 12) {
    if (`"${getIntergrateHvigorw()}"`) {
      buildCmd = `"${getIntergrateHvigorw()}"`;
    } else {
      console.error('\x1B[31m%s\x1B[0m', 'Run tasks failed, please donwload Intergration IDE to support compile api12 project.\n' +
      'if Intergration IDE has downloaded, please use ace config --deveco-studio-path [Intergration IDE Path] to set.\n');
      return false;
    }
  }
  cmds.push(`${buildCmd} clean`);
  let message = 'OpenHarmony/HarmonyOS project cleaned up.';
  let isBuildSuccess = true;
  console.log('Cleaning up the OpenHarmony/HarmonyOS project...');
  cmds = cmds.join(' && ');
  if (platform === Platform.Windows) {
    cmds = cmds.replace(/\//g, '\\');
  }
  try {
    exec(cmds, {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
  } catch (error) {
    console.log(error);
    message = 'Clean ohos project failed.';
    isBuildSuccess = false;
  }
  console.log(message);
  return isBuildSuccess;
}

function cleanOutputPath() {
  try {
    if (config && Object.prototype.hasOwnProperty.call(config, 'build-dir')) {
      const buildDir = config['build-dir'];
      removeDir(buildDir);
    }
    removeDir(path.join(projectDir, '.arkui-x/build'));
  } catch (error) {
    console.error(error);
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
        if (!ignoreDirArr || ignoreDirArr.includes(file) === -1) {
          const curPath = path + '/' + file;
          if (fs.statSync(curPath).isDirectory()) {
            removeDir(curPath, ignoreDirArr, false);
          } else {
            fs.unlinkSync(curPath);
          }
        }
      });
      files = fs.readdirSync(path);
      if (files.length === 0 && !saveDirectory) {
        fs.rmdirSync(path);
      }
    }
  } catch (error) {
    return false;
  }
  return true;
}

function cleanAAR() {
  let cmds = [];
  const aarDir = path.join(projectDir, '.arkui-x', 'android');
  let message = 'Clean aar project successful.';
  let needClean = false;
  getAarName(projectDir).forEach(aarName => {
    if (fs.existsSync(path.join(projectDir, `android/${aarName}/build`))) {
      needClean = true;
    }
  });

  if (!needClean) {
    console.log(message);
    return true;
  }
  if (platform !== Platform.Windows) {
    cmds.push(`cd ${aarDir} && chmod 755 gradlew`);
  }
  cmds.push(`cd ${aarDir} && ./gradlew clean`);
  let isBuildSuccess = true;
  console.log('Start clean aar project...');
  cmds = cmds.join(' && ');
  if (platform === Platform.Windows) {
    cmds = cmds.replace(/\//g, '\\');
  }
  try {
    exec(cmds, {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
  } catch (error) {
    console.error(error);
    message = 'Clean aar project failed.';
    isBuildSuccess = false;
  }
  console.log(message);
  return isBuildSuccess;
}

module.exports = clean;
