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
const {
  Platform,
  platform
} = require('../../ace-check/platform');
const {
  config,
  createLocalProperties,
  copyToBuildDir
} = require('../ace-build');
const { isProjectRootDir, getCurrentProjectVersion } = require('../../util');
const projectDir = process.cwd();
let androidOSSdkDir;

function getAndroidSdkDir() {
  if (config) {
    if (Object.prototype.hasOwnProperty.call(config, 'android-sdk')) {
      androidOSSdkDir = config['android-sdk'];
    } else {
      console.error(`Cannot find android sdk, please run 'ace config --help' first.`);
      return false;
    }
  } else {
    console.error(`Cannot find android sdk, please run 'ace check' first.`);
    return false;
  }
  return true;
}

function writeLocalProperties() {
  const filePath = path.join(projectDir, '/android/local.properties');
  const content = `sdk.dir=${androidOSSdkDir}`;
  return createLocalProperties(filePath, content);
}

function copyToOutput(fileType) {
  let type = fileType == "apk" ? "android" : "ios";
  let src = path.join(projectDir, `/${type}/build/outputs/${fileType}/`);
  let filePath = copyToBuildDir(src);
  console.log(`filepath: ${filePath}`);
}

function buildAPK(cmd) {
  const cmds = [];
  const androidDir = path.join(projectDir, 'android');
  if (platform !== Platform.Windows) {
    cmds.push(`cd ${androidDir} && chmod 755 gradlew`);
  }
  if (cmd.release) {
    cmds.push(`cd ${androidDir} && ./gradlew :app:assembleRelease`);
  } else {
    cmds.push(`cd ${androidDir} && ./gradlew :app:assembleDebug`);
  }
  let gradleMessage = 'Build apk successful.';
  let isBuildSuccess = true;
  console.log('Start building apk...');
  cmds.forEach(cmd => {
    if (platform === Platform.Windows) {
      cmd = cmd.replace(/\//g, '\\');
    }
    try {
      exec(cmd);
    } catch (error) {
      gradleMessage = 'Build apk failed.';
      isBuildSuccess = false;
    }
  });
  console.log(gradleMessage);
  return isBuildSuccess;
}

function packager(target, cmd) {
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  if (target == "apk") {
    if (getAndroidSdkDir() && writeLocalProperties()) {
      if (buildAPK(cmd)) {
        copyToOutput(target);
        return true;
      }
    }
  } else if (target == "app") {
    if (buildAPP(cmd)) {
      copyToOutput(target);
      return true;
    }
  }
  return false;
}
function buildAPP(cmd) {
  const cmds = [];
  let mode = 'debug';
  if (cmd.release) {
    mode = 'release';
  }
  let currentDir = process.cwd();
  let version = getCurrentProjectVersion(currentDir);
  if (version == "") {
    console.log("project is not exists");
    return false;
  }
  version = version == "app" ? "js" : "ets";
  let projectDir = path.join(currentDir,'ios' , version + 'app.xcodeproj');
  let exportPath = path.join(currentDir,'ios' ,'build/outputs/app/');
  let signCmd = "";
  if (cmd.nosign) {
    signCmd = "CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGNING_IDENTITY=''";
  }
  cmds.push(`xcodebuild  -project ${projectDir} -sdk iphoneos -configuration "${mode}" clean build CONFIGURATION_BUILD_DIR=${exportPath} ${signCmd}`);
  let message = 'Build app successful.';
  let isBuildSuccess = true;
  console.log('Start building app...');
  cmds.forEach(cmd => {
    try {
      exec(cmd);
    } catch (error) {
      message = 'Build app failed.';
      isBuildSuccess = false;
    }
  });
  console.log(message);
  return isBuildSuccess;
}
module.exports = packager;
