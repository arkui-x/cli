/*
 * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
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

const path = require('path');
const fs = require('fs');
const exec = require('child_process').execSync;
const {
  Platform,
  platform
} = require('../../ace-check/platform');
const {
  createLocalProperties,
  copyToBuildDir
} = require('../ace-build');
const { androidSdkDir, arkuiXSdkDir, javaSdkDirAndroid} = require('../../ace-check/configs');
const { setJavaSdkDirInEnv } = require('../../ace-check/checkJavaSdk');
const { isProjectRootDir, getAarName, getFrameworkName } = require('../../util');
const projectDir = process.cwd();
const { copyLibraryToProject } = require('./copyLibraryToProject');
const { createTestTem, recoverTestTem } = require('./createTestTemFile');

function isAndroidSdkVaild() {
  if (androidSdkDir) {
    return true;
  } else {
    console.error(`Cannot find android sdk, please run 'ace check' first.`);
    return false;
  }
}

function writeLocalProperties() {
  const filePath = path.join(projectDir, '.arkui-x/android/local.properties');
  const content = `sdk.dir=${androidSdkDir}`;
  return createLocalProperties(filePath, content);
}

function copyToOutput(fileType) {
  const typePath = fileType === 'apk' ? '.arkui-x/android/app' : '.arkui-x/ios';
  const src = path.join(projectDir, `/${typePath}/build/outputs/${fileType}/`);
  const filePath = copyToBuildDir(src);
  console.log(`filepath: ${filePath}`);
}

function copyLibraryToOutput(fileType) {
  if (fileType === 'aar') {
    const aarNameList = getAarName(projectDir);
    aarNameList.forEach(aarName => {
      const src = path.join(projectDir, `.arkui-x/android/${aarName}/build/outputs/${fileType}/`);
      const filePath = copyToBuildDir(src);
      console.log(`filepath: ${filePath}`);
    });
  } else if (fileType === 'framework' || fileType === 'xcframework') {
    const frameworkNameList = getFrameworkName(projectDir);
    frameworkNameList.forEach(frameworkName => {
      const src = path.join(projectDir, `.arkui-x/ios/build/outputs/${fileType}/`);
      const filePath = copyToBuildDir(src);
      console.log(`filepath: ${filePath}`);
    });
  }
}

function buildAPK(cmd) {
  copyLibraryToProject('apk', cmd, projectDir, 'android');
  const cmds = [];
  const androidDir = path.join(projectDir, '.arkui-x/android');
  if (platform !== Platform.Windows) {
    cmds.push(`cd ${androidDir} && chmod 755 gradlew`);
  }
  if (cmd.debug && !createTestTem('apk')) {
    console.error('createTestTem apk failed.');
    return false;
  }
  if (cmd.debug) {
    cmds.push(`cd ${androidDir} && ./gradlew :app:assembleDebug`);
  } else {
    cmds.push(`cd ${androidDir} && ./gradlew :app:assembleRelease`);
  }
  let gradleMessage = 'Build apk successful.';
  let isBuildSuccess = true;
  console.log('Start building apk...');
  process.env.ARKUIX_SDK_HOME = arkuiXSdkDir;
  setJavaSdkDirInEnv(javaSdkDirAndroid);
  cmds.forEach(cmd => {
    if (platform === Platform.Windows) {
      cmd = cmd.replace(/\//g, '\\');
    }
    try {
      exec(cmd, {
        encoding: 'utf-8',
        stdio: 'inherit'
      });
    } catch (error) {
      gradleMessage = 'Build apk failed.';
      isBuildSuccess = false;
    }
  });
  if (cmd.debug && !recoverTestTem('apk')) {
    console.error('recoverTestTem apk failed.');
    return false;
  }
  console.log(gradleMessage);
  return isBuildSuccess;
}

function buildAAR(cmd) {
  copyLibraryToProject('aar', cmd, projectDir, 'android');
  const cmds = [];
  const aarDir = path.join(projectDir, '.arkui-x/android');
  const aarNameList = getAarName(projectDir);
  if (platform !== Platform.Windows) {
    cmds.push(`cd ${aarDir} && chmod 755 gradlew`);
  }
  if (aarNameList.length === 1) {
    if (cmd.debug) {
      cmds.push(`cd ${aarDir} && ./gradlew :${aarNameList[0]}:assembleDebug`);
    } else {
      cmds.push(`cd ${aarDir} && ./gradlew :${aarNameList[0]}:assembleRelease`);
    }
  } else if (aarNameList.length > 1) {
    let cmdStr = `cd ${aarDir} && ./gradlew :`;
    aarNameList.forEach(aarName => {
      if (cmd.debug) {
        cmdStr = cmdStr + `${aarName}:assembleDebug `;
      } else {
        cmdStr = cmdStr + `${aarName}:assembleRelease `;
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
      setJavaSdkDirInEnv(javaSdkDirAndroid);
      exec(cmd, {
        encoding: 'utf-8',
        stdio: 'inherit'
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
  copyLibraryToProject('framework', cmd, projectDir, 'ios');
  let mode = 'Release';
  if (cmd.debug) {
    mode = 'Debug';
  }
  let gradleMessage = 'Build framework successful.';
  let isBuildSuccess = true;
  let sdk = 'iphoneos';
  if (cmd.simulator) {
    sdk = 'iphonesimulator';
  }
  const frameworkNameList = getFrameworkName(projectDir);
  const frameworkDir = path.join(projectDir, '.arkui-x/ios');
  frameworkNameList.forEach(frameworkName => {
    const frameworkProj = path.join(frameworkDir, `${frameworkName}.xcodeproj`);
    const exportPath = path.join(frameworkDir, `build/outputs/framework`);
    const cmdStr = `xcodebuild -project ${frameworkProj} -sdk ${sdk} -configuration "${mode}" `
      + `clean build CONFIGURATION_BUILD_DIR=${exportPath}`;
    if (cmd.simulator) {
      const simulatorFile = path.join(currentDir, '.arkui-x/ios', '.simulator');
      if (!fs.existsSync(simulatorFile)){
        fs.writeFileSync(simulatorFile, '');
      }
    }else{
      const simulatorFile = path.join(currentDir, '.arkui-x/ios', '.simulator');
      if (fs.existsSync(simulatorFile)) {
        fs.unlinkSync(simulatorFile);
      }
    }
    try {
      exec(cmdStr, {
        encoding: 'utf-8',
        stdio: 'inherit'
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
  copyLibraryToProject('xcframework', cmd, projectDir, 'ios');
  const cmds = [];
  let mode = 'Release';
  if (cmd.debug) {
    mode = 'Debug';
  }
  let gradleMessage = 'Build xcframework successful.';
  let isBuildSuccess = true;
  let sdk = 'iphoneos';
  if (cmd.simulator) {
    sdk = 'iphonesimulator';
  }
  const frameworkNameList = getFrameworkName(projectDir);
  const frameworkDir = path.join(projectDir, '.arkui-x/ios');
  frameworkNameList.forEach(frameworkName => {
    const frameworkProj = path.join(frameworkDir, `${frameworkName}.xcodeproj`);
    const myFramework = path.join(frameworkDir, `build/${mode}-iphoneos/${frameworkName}.framework`);
    const exportPath = path.join(frameworkDir, `build/outputs/xcframework`);
    if (cmd.simulator) {
      const simulatorFile = path.join(currentDir, '.arkui-x/ios', '.simulator');
      if (!fs.existsSync(simulatorFile)){
        fs.writeFileSync(simulatorFile, '');
      }
    }else{
      const simulatorFile = path.join(currentDir, '.arkui-x/ios', '.simulator');
      if (fs.existsSync(simulatorFile)) {
        fs.unlinkSync(simulatorFile);
      }
    }
    const xcFrameworkName = path.join(exportPath, `${frameworkName}.xcframework`);
    cmds.push(`xcodebuild -project ${frameworkProj} -sdk ${sdk} -configuration "${mode}" clean build`);
    cmds.push(`xcodebuild -create-xcframework -framework ${myFramework} -output ${xcFrameworkName}`);
    try {
      cmds.forEach(cmdStr => {
        exec(cmdStr, {
          encoding: 'utf-8',
          stdio: 'inherit'
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
  if (target === 'apk') {
    if (isAndroidSdkVaild() && writeLocalProperties()) {
      if (buildAPK(cmd)) {
        copyToOutput(target);
        return true;
      }
    }
  } else if (target === 'aar') {
    if (isAndroidSdkVaild() && writeLocalProperties()) {
      if (buildAAR(cmd)) {
        copyLibraryToOutput(target);
        return true;
      }
    }
  } else if (target === 'app') {
    if (buildAPP(cmd)) {
      copyToOutput(target);
      return true;
    }
  } else if (target === 'framework') {
    if (buildFramework(cmd)) {
      copyLibraryToOutput(target);
      return true;
    }
  } else if (target === 'xcframework') {
    if (buildXcFramework(cmd)) {
      copyLibraryToOutput(target);
      return true;
    }
  }
  return false;
}

function buildAPP(cmd) {
  copyLibraryToProject('app', cmd, projectDir, 'ios');
  const cmds = [];
  let mode = 'Release';
  if (cmd.debug) {
    mode = 'Debug';
  }
  if (cmd.debug && !createTestTem('app')) {
    console.error('createTestTem app failed.');
    return false;
  }
  const currentDir = process.cwd();
  const projectSettingDir = path.join(currentDir, '.arkui-x/ios', 'app.xcodeproj');
  const exportPath = path.join(currentDir, '.arkui-x/ios', 'build/outputs/app/');
  let sdk = 'iphoneos';
  if (cmd.simulator) {
    sdk = 'iphonesimulator';
  }
  if (cmd.simulator) {
    const simulatorFile = path.join(currentDir, '.arkui-x/ios', '.simulator');
    if (!fs.existsSync(simulatorFile)){
      fs.writeFileSync(simulatorFile, '');
    }
  } else {
    const simulatorFile = path.join(currentDir, '.arkui-x/ios', '.simulator');
    if (fs.existsSync(simulatorFile)) {
      fs.unlinkSync(simulatorFile);
    }
  }
  let signCmd = '';
  if (cmd.nosign) {
    signCmd = "CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGNING_IDENTITY=''";
  }
  const cmdStr = `xcodebuild -project ${projectSettingDir} -sdk ${sdk} -configuration "${mode}" `
    + `clean build CONFIGURATION_BUILD_DIR=${exportPath} ${signCmd}`;
  cmds.push(cmdStr);
  let message = 'Build app successful.';
  let isBuildSuccess = true;
  console.log('Start building app...');
  cmds.forEach(cmd => {
    try {
      exec(cmd, {
        encoding: 'utf-8',
        stdio: 'inherit'
      });
    } catch (error) {
      message = 'Build app failed.';
      isBuildSuccess = false;
    }
  });
  if (cmd.debug && !recoverTestTem('app')) {
    console.error('recoverTestTem app failed.');
    return false;
  }
  console.log(message);
  return isBuildSuccess;
}

module.exports = packager;