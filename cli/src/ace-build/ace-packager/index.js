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
const {
  Platform,
  platform
} = require('../../ace-check/platform');
const {
  config,
  createLocalProperties,
  copyToBuildDir
} = require('../ace-build');

const projectDir = process.cwd();
let androidOSSdkDir;

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

function copyAPKToOutput(moduleList, buildAll) {
  let src;
  let filePath;
  if (buildAll) {
    src = path.join(projectDir, `/android/app/build/outputs/bundle/debug/`);
    filePath = copyToBuildDir(src);
  } else {
    moduleList.forEach(moduleName => {
      const src = path.join(projectDir, `/android/${moduleName}/build/outputs/apk/debug/`);
      filePath = copyToBuildDir(src);
    });
  }
  console.log(`filepath: ${filePath}`);
}

function buildAPK(moduleList, buildAll) {
  const cmds = [];
  const androidDir = path.join(projectDir, 'android');
  if (platform !== Platform.Windows) {
    cmds.push(`cd ${androidDir} && chmod 755 gradlew`);
  }
  if (buildAll) {
    cmds.push(`cd ${androidDir} && ./gradlew :app:bundleDebug`);
  } else {
    moduleList.forEach(moduleName => {
      cmds.push(`cd ${androidDir} && ./gradlew :${moduleName}:assembleDebug`);
    });
  }
  let gradleMessage = 'Build apk successful.';
  let isBuildSucess = true;
  console.log('Start building apk...');
  cmds.forEach(cmd => {
    if (platform === Platform.Windows) {
      cmd = cmd.replace(/\//g, '\\');
    }
    try {
      exec(cmd);
    } catch (error) {
      gradleMessage = 'Build apk failed.';
      isBuildSucess = false;
    }
  });
  console.log(gradleMessage);
  return isBuildSucess;
}

function packager(moduleListInput) {
  if (!isProjectRootDir(projectDir)) {
    console.error('Please go to the root directory of project.');
    return false;
  }
  let buildAll = true;
  let moduleList;
  if (moduleListInput && moduleListInput !== true) {
    moduleList = moduleListInput.split(' ');
    buildAll = false;
  }
  if (getAndroidSdkDir() && writeLocalProperties()) {
    if (buildAPK(moduleList, buildAll)) {
      copyAPKToOutput(moduleList, buildAll);
      return true;
    }
  }
  return false;
}

module.exports = packager;
