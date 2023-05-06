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
const { isProjectRootDir, getCurrentProjectVersion, isStageProject,
  getAarName, getFrameworkName } = require('../../util');
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
  let typePath = fileType == "apk" ? "android/app" : "ios";
  let src = path.join(projectDir, `/${typePath}/build/outputs/${fileType}/`);
  let filePath = copyToBuildDir(src);
  console.log(`filepath: ${filePath}`);
}

function copyLibraryToOutput(fileType) {
  if (fileType == 'aar') {
    const aarNameList = getAarName(projectDir);
    aarNameList.forEach(aarName => {
      let src = path.join(projectDir, `android/${aarName}/build/outputs/${fileType}/`);
      let filePath = copyToBuildDir(src);
      console.log(`filepath: ${filePath}`);
    });
  } else if (fileType == 'framework' || fileType == 'xcframework') {
    const frameworkNameList = getFrameworkName(projectDir);
    frameworkNameList.forEach(frameworkName => {
      let src = path.join(projectDir, `ios/${frameworkName}/build/outputs/${fileType}/`);
      let filePath = copyToBuildDir(src);
      console.log(`filepath: ${filePath}`);
    });
  }
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
      exec(cmd, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
    } catch (error) {
      gradleMessage = 'Build apk failed.';
      isBuildSuccess = false;
    }
  });
  console.log(gradleMessage);
  return isBuildSuccess;
}

function buildAAR(cmd) {
  const cmds = [];
  const aarDir = path.join(projectDir, 'android');
  const aarNameList = getAarName(projectDir);
  if (platform !== Platform.Windows) {
    cmds.push(`cd ${aarDir} && chmod 755 gradlew`);
  }
  if (aarNameList.length == 1) {
    if (cmd.release) {
      cmds.push(`cd ${aarDir} && ./gradlew :${aarNameList[0]}:assembleRelease`);
    } else {
      cmds.push(`cd ${aarDir} && ./gradlew :${aarNameList[0]}:assembleDebug`);
    }
  } else if (aarNameList.length > 1) {
    let cmdStr = `cd ${aarDir} && ./gradlew :`;
    aarNameList.forEach(aarName => {
      if (cmd.release) {
        cmdStr = cmdStr + `${aarName}:assembleRelease `;
      } else {
        cmdStr = cmdStr + `${aarName}:assembleDebug `;
      }
    });
    cmds.push(cmdStr);
  }

  let gradleMessage = 'Build aar successful.';
  let isBuildSuccess = true;
  console.log('Start building aar...');
  cmds.forEach(cmd => {
    if (platform === Platform.Windows) {
      cmd = cmd.replace(/\//g, '\\');
    }
    try {
      exec(cmd, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
    } catch (error) {
      gradleMessage = 'Build aar failed.';
      isBuildSuccess = false;
    }
  });
  console.log(gradleMessage);
  return isBuildSuccess;
}

function buildFramework(cmd) {
  let mode = 'Debug';
  if (cmd.release) {
    mode = 'Release';
  }
  let gradleMessage = 'Build framework successful.';
  let isBuildSuccess = true;
  const frameworkNameList = getFrameworkName(projectDir);
  const frameworkDir = path.join(projectDir, 'ios');
  frameworkNameList.forEach(frameworkName => {
    const frameworkProj = path.join(frameworkDir, `${frameworkName}/${frameworkName}.xcodeproj`);
    const exportPath = path.join(frameworkDir, `${frameworkName}/build/outputs/framework`);
    const cmdStr = `xcodebuild -project ${frameworkProj} -sdk iphoneos -configuration "${mode}" `
      + `clean build CONFIGURATION_BUILD_DIR=${exportPath}`;
    try {
      exec(cmdStr, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
    } catch (error) {
      gradleMessage = 'Build framework failed.';
      isBuildSuccess = false;
    }
  });
  console.log(gradleMessage);
  return isBuildSuccess;
}

function buildXcFramework(cmd) {
  const cmds = [];
  let mode = 'Debug';
  if (cmd.release) {
    mode = 'Release';
  }
  let gradleMessage = 'Build xcframework successful.';
  let isBuildSuccess = true;
  const frameworkNameList = getFrameworkName(projectDir);
  const frameworkDir = path.join(projectDir, 'ios');
  frameworkNameList.forEach(frameworkName => {
    const frameworkProj = path.join(frameworkDir, `${frameworkName}/${frameworkName}.xcodeproj`);
    const myFramework = path.join(frameworkDir, `${frameworkName}/build/${mode}-iphoneos/${frameworkName}.framework`);
    const exportPath = path.join(frameworkDir, `${frameworkName}/build/outputs/xcframework`);
    const xcFrameworkName = path.join(exportPath, `${frameworkName}.xcframework`);
    cmds.push(`xcodebuild -project ${frameworkProj} -sdk iphoneos -configuration "${mode}" clean build`);
    cmds.push(`xcodebuild -create-xcframework -framework ${myFramework} -output ${xcFrameworkName}`);
    try {
      cmds.forEach(cmdStr => {
        exec(cmdStr, {
          encoding: 'utf-8',
          stdio: 'inherit',
        });
      });
    } catch (error) {
      gradleMessage = 'Build xcframework failed.';
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
  } else if (target == "aar") {
    if (getAndroidSdkDir() && writeLocalProperties()) {
      if (buildAAR(cmd)) {
        copyLibraryToOutput(target);
        return true;
      }
    }
  } else if (target == "app") {
    if (buildAPP(cmd)) {
      copyToOutput(target);
      return true;
    }
  } else if (target == "framework") {
    if (buildFramework(cmd)) {
      copyLibraryToOutput(target);
      return true;
    }
  } else if (target == "xcframework") {
    if (buildXcFramework(cmd)) {
      copyLibraryToOutput(target);
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
  let version = '';
  if (!isStageProject(path.join(currentDir, 'source'))) {
    version = getCurrentProjectVersion(currentDir);
  }
  let projectDir = path.join(currentDir, 'ios', version + 'app.xcodeproj');
  let exportPath = path.join(currentDir, 'ios', 'build/outputs/app/');
  let signCmd = "";
  if (cmd.nosign) {
    signCmd = "CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGNING_IDENTITY=''";
  }
  let cmdStr = `xcodebuild -project ${projectDir} -sdk iphoneos -configuration "${mode}" `
    + `clean build CONFIGURATION_BUILD_DIR=${exportPath} ${signCmd}`;
  cmds.push(cmdStr);
  let message = 'Build app successful.';
  let isBuildSuccess = true;
  console.log('Start building app...');
  cmds.forEach(cmd => {
    try {
      exec(cmd, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
    } catch (error) {
      message = 'Build app failed.';
      isBuildSuccess = false;
    }
  });
  console.log(message);
  return isBuildSuccess;
}

module.exports = packager;
