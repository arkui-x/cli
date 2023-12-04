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
const os = require('os');
const JSON5 = require('json5');
const {
  Platform,
  platform
} = require('../../ace-check/platform');
const {
  createLocalProperties,
  copyToBuildDir
} = require('../ace-build');
const { androidSdkDir, arkuiXSdkDir, javaSdkDirAndroid } = require('../../ace-check/configs');
const { setJavaSdkDirInEnv } = require('../../ace-check/checkJavaSdk');
const { isProjectRootDir, getAarName, getFrameworkName, modifyAndroidAbi, getAndroidModule,
  getIosProjectName } = require('../../util');
const { copyLibraryToProject } = require('./copyLibraryToProject');
const { createTestTem, recoverTestTem } = require('./createTestTemFile');
const projectDir = process.cwd();

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
  const typePath = fileType === 'ios' ? '.arkui-x/ios' : '.arkui-x/android/app';
  fileType === 'ios' ? fileType = 'app' : '';
  const src = path.join(projectDir, `/${typePath}/build/outputs/${fileType}/`);
  const filePath = copyToBuildDir(src);
  console.log(`File path: ${filePath}`);
}

function copyLibraryToOutput(fileType) {
  if (fileType === 'aar') {
    const aarNameList = getAarName(projectDir);
    aarNameList.forEach(aarName => {
      const src = path.join(projectDir, `.arkui-x/android/${aarName}/build/outputs/${fileType}/`);
      const filePath = copyToBuildDir(src);
      console.log(`File path: ${filePath}`);
    });
  } else if (fileType === 'ios-framework' || fileType === 'ios-xcframework') {
    const frameworkNameList = getFrameworkName(projectDir);
    frameworkNameList.forEach(frameworkName => {
      const src = path.join(projectDir, `.arkui-x/ios/build/outputs/${fileType}/`);
      const filePath = copyToBuildDir(src);
      console.log(`File path: ${filePath}`);
    });
  }
}

function buildAPK(cmd) {
  modifyAndroidAbi(projectDir, cmd);
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

  const moduleList = getAndroidModule(projectDir);
  moduleList.forEach(item => {
    if (cmd.debug) {
      cmds.push(`cd ${androidDir} && ./gradlew :${item}:assembleDebug`);
    } else if (cmd.profile) {
      cmds.push(`cd ${androidDir} && ./gradlew :${item}:assembleProfile`);
    } else {
      cmds.push(`cd ${androidDir} && ./gradlew :${item}:assembleRelease`);
    }
  });
  let gradleMessage = 'APK file built successfully..';
  let isBuildSuccess = true;
  console.log('Building an APK file...');
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

function buildAab(cmd) {
  modifyAndroidAbi(projectDir, cmd);
  copyLibraryToProject('apk', cmd, projectDir, 'android');
  const cmds = [];
  const androidDir = path.join(projectDir, '.arkui-x/android');
  if (platform !== Platform.Windows) {
    cmds.push(`cd ${androidDir} && chmod 755 gradlew`);
  }

  const moduleList = getAndroidModule(projectDir);
  moduleList.forEach(item => {
    if (cmd.debug) {
      cmds.push(`cd ${androidDir} && ./gradlew :${item}:bundleDebug`);
    } else if (cmd.profile) {
      cmds.push(`cd ${androidDir} && ./gradlew :${item}:bundleProfile`);
    } else {
      cmds.push(`cd ${androidDir} && ./gradlew :${item}:bundleRelease`);
    }
  });

  let gradleMessage = 'Android App Bundle file built successfully.';
  let isBuildSuccess = true;
  console.log('Start building aab...');
  process.env.ARKUIX_SDK_HOME = arkuiXSdkDir;
  setJavaSdkDirInEnv(javaSdkDirAndroid);
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
      gradleMessage = 'Failed to build the Android App Bundle file.';
      isBuildSuccess = false;
    }
  });
  console.log(gradleMessage);
  return isBuildSuccess;
}

function buildAAR(cmd) {
  modifyAndroidAbi(projectDir, cmd, 'aar');
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
    } else if (cmd.profile) {
      cmds.push(`cd ${aarDir} && ./gradlew :${aarNameList[0]}:assembleProfile`);
    } else {
      cmds.push(`cd ${aarDir} && ./gradlew :${aarNameList[0]}:assembleRelease`);
    }
  } else if (aarNameList.length > 1) {
    let cmdStr = `cd ${aarDir} && ./gradlew :`;
    aarNameList.forEach(aarName => {
      if (cmd.debug) {
        cmdStr = cmdStr + `${aarName}:assembleDebug `;
      } else if (cmd.profile) {
        cmdStr = cmdStr + `${aarName}:assembleProfile `;
      } else {
        cmdStr = cmdStr + `${aarName}:assembleRelease `;
      }
    });
    cmds.push(cmdStr);
  }

  let gradleMessage = 'AAR file built successfully.';
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
      gradleMessage = 'Failed to build the AAR file.';
      isBuildSuccess = false;
    }
  });
  console.log(gradleMessage);
  return isBuildSuccess;
}

function buildFramework(cmd) {
  copyLibraryToProject('ios-framework', cmd, projectDir, 'ios');
  let mode = 'Release';
  if (cmd.debug) {
    mode = 'Debug';
  } else if (cmd.profile) {
    mode = 'Profile';
  }
  let gradleMessage = 'iOS framework built successfully.';
  let isBuildSuccess = true;
  let sdk = 'iphoneos';
  let platform = `generic/platform="iOS"`;
  let arch = "arm64";
  if (os.arch() === 'x64' && cmd.simulator) {
    arch = "x86_64";
  }
  if (cmd.simulator) {
    sdk = 'iphonesimulator';
    platform = `generic/platform="iOS Simulator"`;
  }
  const frameworkNameList = getFrameworkName(projectDir);
  const frameworkDir = path.join(projectDir, '.arkui-x/ios');
  frameworkNameList.forEach(frameworkName => {
    const frameworkProj = path.join(frameworkDir, `${frameworkName}.xcodeproj`);
    const exportPath = path.join(frameworkDir, `build/outputs/ios-framework`);
    const cmdStr = `xcodebuild -project ${frameworkProj} -sdk ${sdk} -configuration "${mode}" ${platform} ARCHS=${arch} `
      + `clean build CONFIGURATION_BUILD_DIR=${exportPath}`;
    try {
      exec(cmdStr, {
        encoding: 'utf-8',
        stdio: 'inherit'
      });
    } catch (error) {
      gradleMessage = 'Build ios-framework failed.';
      isBuildSuccess = false;
    }
  });
  console.log(gradleMessage);
  return isBuildSuccess;
}

function buildXcFramework(cmd) {
  copyLibraryToProject('ios-xcframework', cmd, projectDir, 'ios');
  const cmds = [];
  let mode = 'Release';
  if (cmd.debug) {
    mode = 'Debug';
  } else if (cmd.profile) {
    mode = 'Profile';
  }
  let gradleMessage = 'iOS XCFramework built successfully.';
  let isBuildSuccess = true;
  let sdk = 'iphoneos';
  let platform = `generic/platform="iOS"`;
  let arch = "arm64";
  if (os.arch() === 'x64' && cmd.simulator) {
    arch = "x86_64";
  }
  if (cmd.simulator) {
    sdk = 'iphonesimulator';
    platform = `generic/platform="iOS Simulator"`;
  }
  const frameworkNameList = getFrameworkName(projectDir);
  const frameworkDir = path.join(projectDir, '.arkui-x/ios');
  frameworkNameList.forEach(frameworkName => {
    const frameworkProj = path.join(frameworkDir, `${frameworkName}.xcodeproj`);
    const myFramework = path.join(frameworkDir, `build/${mode}-iphoneos/${frameworkName}.framework`);
    const exportPath = path.join(frameworkDir, `build/outputs/ios-xcframework`);
    const xcFrameworkName = path.join(exportPath, `${frameworkName}.xcframework`);
    cmds.push(`xcodebuild -project ${frameworkProj} -sdk ${sdk} -configuration "${mode}" ${platform} ARCHS=${arch} clean build`);
    cmds.push(`xcodebuild -create-xcframework -framework ${myFramework} -output ${xcFrameworkName}`);
    try {
      cmds.forEach(cmdStr => {
        exec(cmdStr, {
          encoding: 'utf-8',
          stdio: 'inherit'
        });
      });
    } catch (error) {
      gradleMessage = 'Build ios-xcframework failed.';
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
  } else if (target === 'aab') {
    if (isAndroidSdkVaild() && writeLocalProperties()) {
      if (buildAab(cmd)) {
        copyToOutput('bundle');
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
  } else if (target === 'ios') {
    if (buildiOS(cmd)) {
      copyToOutput(target);
      return true;
    }
  } else if (target === 'ios-framework') {
    if (buildFramework(cmd)) {
      copyLibraryToOutput(target);
      return true;
    }
  } else if (target === 'ios-xcframework') {
    if (buildXcFramework(cmd)) {
      copyLibraryToOutput(target);
      return true;
    }
  }
  return false;
}

function buildiOS(cmd) {
  copyLibraryToProject('ios', cmd, projectDir, 'ios');
  const cmds = [];
  let mode = 'Release';
  if (cmd.debug) {
    mode = 'Debug';
  }
  if (cmd.debug && !createTestTem('ios')) {
    console.error('createTestTem ios failed.');
    return false;
  }
  const iosProjectName = getIosProjectName(projectDir);
  const projectSettingDir = path.join(projectDir, '.arkui-x/ios', `${iosProjectName}.xcodeproj`);
  const exportPath = path.join(projectDir, '.arkui-x/ios', 'build/outputs/app/');
  let sdk = 'iphoneos';
  let platform = `generic/platform="iOS"`;
  let arch = "arm64";
  if (os.arch() === 'x64' && cmd.simulator) {
    arch = "x86_64";
  }
  if (cmd.simulator) {
    sdk = 'iphonesimulator';
    platform = `generic/platform="iOS Simulator"`;
  }
  let signCmd = '';
  if (cmd.nosign) {
    signCmd = "CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGNING_IDENTITY=''";
  }
  const cmdStr = `xcodebuild -project ${projectSettingDir} -sdk ${sdk} -configuration "${mode}" ${platform} ARCHS=${arch} `
    + `clean build CONFIGURATION_BUILD_DIR=${exportPath} ${signCmd}`;
  cmds.push(cmdStr);
  let manifestPath = path.join(projectDir, 'AppScope/app.json5');
  let manifestJsonObj = JSON5.parse(fs.readFileSync(manifestPath));
  process.env.ACE_VERSION_CODE = manifestJsonObj.app.versionCode;
  process.env.ACE_VERSION_NAME = manifestJsonObj.app.versionName;
  let message = 'iOS APP file built successfully.';
  let isBuildSuccess = true;
  console.log('Building an iOS APP file...');
  cmds.forEach(cmd => {
    try {
      exec(cmd, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
    } catch (error) {
      if (error.stdout !== null) {
        console.log(error.stdout);
        if (error.stdout.toString().includes('Automatic signing is disabled and unable to generate a profile')) {
          console.log('\x1B[31m%s\x1B[0m', `
It appears that there was a problem signing your application prior to installation on the device.

Verify that the Bundle Identifier in your project is your signing id in Xcode
  open .arkui-x/ios/${iosProjectName}.xcodeproj
          `);
        }
      }
      message = 'Build ios failed.';
      isBuildSuccess = false;
    }
  });
  if (cmd.debug && !recoverTestTem('ios')) {
    console.error('recoverTestTem ios failed.');
    return false;
  }
  console.log(message);
  return isBuildSuccess;
}

module.exports = packager;
