/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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
const Process = require('child_process');
const { Platform, platform } = require('./platform');

function checkPath(configType, configPath) {
  const info = [];
  let isValid = false;
  if (configType === 'openharmony-sdk') {
    isValid = sdkPathCheck(configPath, 'OpenHarmony', info);
  }
  if (configType === 'harmonyos-sdk') {
    isValid = sdkPathCheck(configPath, 'HarmonyOS', info);
  }
  if (configType === 'android-sdk') {
    isValid = sdkPathCheck(configPath, 'Android', info);
  }
  if (configType === 'arkui-x-sdk') {
    isValid = sdkPathCheck(configPath, 'ArkUI-X', info);
  }
  if (configType === 'deveco-studio-path') {
    isValid = typeStudioPathCheck(configPath, 'DevEco Studio', info);
  }
  if (configType === 'android-studio-path') {
    isValid = typeStudioPathCheck(configPath, 'Android Studio', info);
  }
  if (configType === 'build-dir') {
    isValid = buildDirPathCheck(configPath, info);
  }
  if (configType === 'nodejs-dir') {
    isValid = nodejsDirPathCheck(configPath, info);
  }
  if (configType === 'java-sdk') {
    isValid = javaSdkPathCheck(configPath, info);
  }
  if (configType === 'ohpm-dir') {
    isValid = ohpmDirPathCheck(configPath, info);
  }
  if (configType === 'source-dir') {
    isValid = sourceDirPathCheck(configPath, info);
  }
  if (configType === 'command-line-tools-path') {
    isValid = typeCommandLineToolsPathCheck(configPath, info);
  }
  const logType = '\x1b[31m%s\x1b[0m';
  const logStr = 'Error: ';
  info.forEach((key) => {
    console.log(logType, logStr + key);
  });
  return isValid;
}

function sdkPathCheck(typeSdkDir, sdkType, info) {
  const isWindowsDisk = /^[A-Z]:\\$/i.test(typeSdkDir);
  const isLinuxOrMacDisk = typeSdkDir === '/';
  if (!fs.existsSync(typeSdkDir)) {
    if (info) {
      info.push(`The ${sdkType} SDK path you configured "${typeSdkDir}" does not exist`);
    }
    return false;
  }
  if (!fs.statSync(typeSdkDir).isDirectory()) {
    if (info) {
      info.push(`The ${sdkType} SDK path you configured "${typeSdkDir}" is wrong`);
    }
    return false;
  }
  if (isWindowsDisk || isLinuxOrMacDisk) {
    if (info) {
      info.push(`The ${sdkType} SDK path you configured "${typeSdkDir}" is a disk`);
    }
    return false;
  }
  if (sdkType === 'Android') {
    return androidSdkPathCheck(typeSdkDir, info);
  }
  if (sdkType === 'HarmonyOS') {
    return harmonyosSdkPathCheck(typeSdkDir, info, sdkType);
  }
  return validSdkDir(typeSdkDir, sdkType, info);
}

function androidSdkPathCheck(androidSdkDir, info) {
  if (!fs.existsSync(path.join(androidSdkDir, 'build-tools')) ||
    !fs.statSync(path.join(androidSdkDir, 'build-tools')).isDirectory() ||
    !fs.existsSync(path.join(androidSdkDir, 'platform-tools')) ||
    !fs.statSync(path.join(androidSdkDir, 'platform-tools')).isDirectory()
  ) {
    if (info) {
      info.push(`The Android SDK path you configured "${androidSdkDir}" is wrong`);
    }
    return false;
  }
  return true;
}

function harmonyosSdkPathCheck(harmonyosSdkDir, info, sdkType) {
  const harmonyOsDirs = [];
  harmonyOsDirs.push(...fs.readdirSync(harmonyosSdkDir).filter((file) => {
    return fs.statSync(path.join(harmonyosSdkDir, file)).isDirectory() && (file.includes('HarmonyOS') ||
      file.includes('default'));
  }));
  if (harmonyOsDirs.length !== 0) {
    return newValidHarmonyOsSdk(harmonyosSdkDir, harmonyOsDirs, sdkType, info);
  } else {
    return oldValidHarmonyOsSdk(harmonyosSdkDir, sdkType, info);
  }
}

function newValidHarmonyOsSdk(harmonyosSdkDir, harmonyOsDirs, sdkType, info) {
  let dirExist = false;
  harmonyOsDirs.forEach(dir => {
    const harmonyOsPath = path.join(harmonyosSdkDir, dir, 'sdk-pkg.json');
    if (fs.existsSync(harmonyOsPath)) {
      dirExist = true;
      return;
    }
  });
  if (!dirExist) {
    dirExist = oldValidHarmonyOsSdk(harmonyosSdkDir, sdkType, info);
  } else {
    if (harmonyOsDirs.length === 1) {
      const harmonyOsPath = path.join(harmonyosSdkDir, harmonyOsDirs[0], 'sdk-pkg.json');
      let sdkVersion = JSON.parse(fs.readFileSync(harmonyOsPath))['data']['platformVersion'];
      if (sdkVersion >= '5.0.0') {
        return true;
      }
    }
    if (!fs.existsSync(path.join(harmonyosSdkDir, 'licenses')) ||
      !fs.statSync(path.join(harmonyosSdkDir, 'licenses')).isDirectory()) {
      if (info) {
        info.push(`Licenses of ${sdkType} SDK is missing.`);
      }
      return false;
    }
    return true;
  }
  if (!dirExist) {
    return false;
  }
  return true;
}

function oldValidHarmonyOsSdk(harmonyosSdkDir, sdkType, info) {
  if (!fs.existsSync(path.join(harmonyosSdkDir, 'hmscore')) ||
    !fs.statSync(path.join(harmonyosSdkDir, 'hmscore')).isDirectory() ||
    !fs.existsSync(path.join(harmonyosSdkDir, 'openharmony')) ||
    !fs.statSync(path.join(harmonyosSdkDir, 'openharmony')).isDirectory()) {
    if (info) {
      info.push(`The ${sdkType} SDK path you configured "${harmonyosSdkDir}" is wrong`);
    }
    return false;
  }
  return validSdkDir(path.join(harmonyosSdkDir, 'openharmony'), sdkType, info);
}

function validSdkDir(typeSdkDir, sdkType, info) {
  const dirs = [];
  let candidatePath;
  let dirExist = false;
  dirs.push(...fs.readdirSync(typeSdkDir).filter((file) => {
    return !isNaN(file) && fs.statSync(path.join(typeSdkDir, file)).isDirectory() && file !== 'licenses';
  }));
  if (dirs.length !== 0) {
    dirs.sort(function(prev, next) {
      return next - prev;
    });
  } else {
    if (info) {
      info.push(`The ${sdkType} SDK path you configured "${typeSdkDir}" is wrong`);
    }
    return false;
  }
  dirs.forEach(dir => {
    if (sdkType === 'ArkUI-X') {
      candidatePath = path.join(typeSdkDir, dir, 'arkui-x');
    } else {
      candidatePath = path.join(typeSdkDir, dir, 'toolchains');
    }
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
      dirExist = true;
      return;
    }
  });
  if (!dirExist) {
    if (info) {
      if (sdkType === 'ArkUI-X') {
        info.push(`The ArkUI-X SDK path you configured "${typeSdkDir}" is incorrect, please refer to https://gitcode.com/arkui-x/docs/blob/master/zh-cn/application-dev/tools/how-to-use-arkui-x-sdk.md`);
      } else {
        info.push(`The ${sdkType} SDK path you configured "${typeSdkDir}" is wrong`);
      }
    }
    return false;
  }
  if (sdkType === 'HarmonyOS') {
    typeSdkDir = path.dirname(typeSdkDir);
  }
  if (!fs.existsSync(path.join(typeSdkDir, 'licenses')) ||
    !fs.statSync(path.join(typeSdkDir, 'licenses')).isDirectory()) {
    if (info) {
      info.push(`Licenses of ${sdkType} SDK is missing.`);
    }
    return false;
  }
  return true;
}

function typeCommandLineToolsPathCheck(typestudioDir, info) {
  const typestudio = 'Command Line Tools';
  if (platform !== Platform.Linux) {
    if (info) {
      info.push(`The ${typestudio} path can be set only in the Linux system`);
    }
    return false;
  }
  if (!fs.existsSync(typestudioDir)) {
    if (info) {
      info.push(`The ${typestudio} path you configured "${typestudioDir}" does not exist`);
    }
    return false;
  }
  if (!fs.statSync(typestudioDir).isDirectory()) {
    if (info) {
      info.push(`The ${typestudio} path you configured "${typestudioDir}" is wrong`);
    }
    return false;
  }
  let devecostudioPlatformDir = path.join(typestudioDir, 'bin/hvigorw');
  if (!fs.existsSync(devecostudioPlatformDir)) {
    if (info) {
      info.push(`The ${typestudio} path you configured "${typestudioDir}" is wrong`);
    }
    return false;
  }
  return true;
}

function typeStudioPathCheck(typestudioDir, typestudio, info) {
  let devecostudioPlatformDir;
  if (!fs.existsSync(typestudioDir)) {
    if (info) {
      info.push(`The ${typestudio} path you configured "${typestudioDir}" does not exist`);
    }
    return false;
  }
  if (!fs.statSync(typestudioDir).isDirectory()) {
    if (info) {
      info.push(`The ${typestudio} path you configured "${typestudioDir}" is wrong`);
    }
    return false;
  }
  if (platform === Platform.Windows || platform === Platform.Linux) {
    devecostudioPlatformDir = path.join(typestudioDir, 'bin');
  } else if (platform === Platform.MacOS) {
    devecostudioPlatformDir = path.join(typestudioDir, 'Contents/MacOS');
  }
  const validIdePath = validIdeBin(typestudioDir, typestudio) ||
  validIdeBin(devecostudioPlatformDir, typestudio);
  if (!validIdePath) {
    if (info) {
      info.push(`The ${typestudio} path you configured "${typestudioDir}" is wrong`);
    }
    return false;
  }
  return true;
}

function validIdeBin(typestudioDir, typestudio) {
  if (Object.values(Platform).indexOf(platform) > -1) {
    return validIdePath(typestudioDir, platform, typestudio);
  }
  return false;
}

function validIdePath(typestudioDir, platform, typestudio) {
  let exePrefix;
  let exe;
  if (typestudio === 'Android Studio') {
    exePrefix = 'studio';
  } else {
    exePrefix = 'devecostudio';
  }
  if (platform === Platform.Windows) {
    exe = '.exe';
  } else if (platform === Platform.Linux) {
    exe = '.sh';
  } else if (platform === Platform.MacOS) {
    exe = '';
  }
  if (fs.existsSync(path.join(typestudioDir, `${exePrefix}${exe}`))) {
    return true;
  } else if (fs.existsSync(path.join(typestudioDir, `${exePrefix}64${exe}`))) {
    return true;
  }
  return false;
}

function buildDirPathCheck(buildDir, info) {
  if (!fs.existsSync(buildDir)) {
    if (info) {
      info.push(`The build dir path you configured "${buildDir}" does not exist`);
    }
    return false;
  }
  return true;
}

function nodejsDirPathCheck(nodejsDir, info) {
  let execPath = '';
  let nodejsVersion = '';
  if (!fs.existsSync(nodejsDir)) {
    if (info) {
      info.push(`The nodejs dir path you configured "${nodejsDir}" does not exist`);
    }
    return false;
  }
  if (platform === Platform.Windows) {
    execPath = path.join(nodejsDir, 'node.exe');
  } else if (platform === Platform.Linux || platform === Platform.MacOS) {
    execPath = path.join(nodejsDir, 'bin', 'node');
  }
  if (!fs.existsSync(execPath)) {
    if (info) {
      info.push(`The nodejs dir path you configured "${nodejsDir}" is wrong`);
    }
    return false;
  }
  try {
    nodejsVersion = Process.execSync(`"${execPath}" -v`, { stdio: 'pipe' }).toString().replace(/[\r\n]+/g, '');
  } catch (err) {
    if (info) {
      info.push(`The nodejs dir path you configured "${nodejsDir}" is wrong`);
    }
    return false;
  }
  if (!nodejsVersion) {
    if (info) {
      info.push(`The nodejs dir path you configured "${nodejsDir}" is wrong`);
    }
    return false;
  }
  return true;
}

function javaSdkPathCheck(javaDir, info) {
  let execPath = '';
  let javaVersion = '';
  if (!fs.existsSync(javaDir)) {
    if (info) {
      info.push(`The Java SDK path you configured "${javaDir}" does not exist`);
    }
    return false;
  }
  if (platform === Platform.Windows) {
    execPath = path.join(javaDir, 'bin', 'java.exe');
  } else if (platform === Platform.Linux || platform === Platform.MacOS) {
    execPath = path.join(javaDir, 'bin', 'java');
  }
  if (!fs.existsSync(execPath)) {
    if (info) {
      info.push(`The Java SDK path you configured "${javaDir}" is wrong`);
    }
    return false;
  }
  try {
    const javaVersionContent = Process.execSync(`"${execPath}" --version`, { encoding: 'utf-8', stdio: 'pipe' }).toString();
    const javaVersionContentArray = javaVersionContent.split('\n');
    javaVersion = javaVersionContentArray[1];
  } catch (err) {
    if (info) {
      info.push(`The Java SDK path you configured "${javaDir}" is wrong`);
    }
    return false;
  }
  if (!javaVersion) {
    if (info) {
      info.push(`The Java SDK path you configured "${javaDir}" is wrong`);
    }
    return false;
  }
  return true;
}

function ohpmDirPathCheck(ohpmDir, info) {
  if (!fs.existsSync(ohpmDir)) {
    if (info) {
      info.push(`The ohpm dir path you configured "${ohpmDir}" does not exist`);
    }
    return false;
  }
  const execPath = path.join(ohpmDir, 'bin', 'ohpm');
  if (!fs.existsSync(execPath) || !fs.statSync(execPath).isFile()) {
    if (info) {
      info.push(`The ohpm dir path you configured "${ohpmDir}" is wrong`);
    }
    return false;
  }
  try {
    Process.execSync(`"${execPath}" -v`, { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch (err) {
    if (info) {
      info.push(`The ohpm dir path you configured "${ohpmDir}" is wrong`);
    }
    return false;
  }
}

function sourceDirPathCheck(sourceDir, info) {
  if (!fs.existsSync(sourceDir)) {
    if (info) {
      info.push(`The source dir path you configured "${sourceDir}" does not exist`);
    }
    return false;
  }
  if (!fs.existsSync(path.join(sourceDir, '/build/prebuilts_download.sh'))) {
    if (info) {
      info.push(`The source dir path you configured "${sourceDir}" is wrong`);
    }
    return false;
  }
  return true;
}

module.exports = {
  checkPath,
  typeStudioPathCheck,
  buildDirPathCheck,
  nodejsDirPathCheck,
  javaSdkPathCheck,
  ohpmDirPathCheck,
  sdkPathCheck,
  sourceDirPathCheck,
  typeCommandLineToolsPathCheck,
};
