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

const {
  openHarmonySdkDir,
  harmonyOsSdkDir,
  nodejsDir,
  devEcoStudioDir,
  commandLineToolsDir,
  androidStudioDir,
  androidSdkDir,
  xCodeVersion,
  xCodeDir,
  iDeviceVersion,
  deployVersion,
  arkuiXSdkDir,
  javaSdkDirAndroid,
  javaSdkDirDevEco,
  javaSdkVersionAndroid,
  javaSdkVersionDevEco,
  ohpmDir,
  sourceDir,
} = require('./configs');
const { devices, devicesList } = require('../ace-devices');
const info = require('./Info');
const process = require('child_process');
const {
  requirementTitle,
  optionTitle,
  requirementInfo,
  optionInfo,
  showWarningInfo,
} = require('./util');
const { Platform, platform } = require('./platform');

function checkRequired(errorTimes, showdetail = false) {
  if (!showdetail) {
    console.log('Check summary (to see all details, run ace check -v)');
  }
  let success = arkuiXSdkDir && nodejsDir;
  if (platform === Platform.MacOS) {
    success = iDeviceVersion && deployVersion && success;
  }
  requirementTitle(info.arkuiXSdkTitle, success);
  if (!success || showdetail) {
    requirementInfo(info.arkuiXSdkInfo(arkuiXSdkDir), arkuiXSdkDir, showdetail);
    requirementInfo(info.nodejsInfo(nodejsDir), nodejsDir, showdetail);
    if (platform === Platform.MacOS) {
      requirementInfo(info.iosIdeviceVersionInfo(iDeviceVersion), iDeviceVersion, showdetail);
      requirementInfo(info.iosDeployVersionInfo(deployVersion), deployVersion, showdetail);
    }
  }

  if (sourceDir) {
    success = sourceDir;
    requirementTitle(info.sourceTitle, success);
    if (!success || showdetail) {
      requirementInfo(info.sourceInfo(sourceDir), sourceDir, showdetail);
    }
  }

  success = openHarmonySdkDir && ohpmDir;
  requirementTitle(info.openHarmonyTitle, success);
  if (!success || showdetail) {
    requirementInfo(info.openHarmonySdkInfo(openHarmonySdkDir), openHarmonySdkDir, showdetail);
    requirementInfo(info.ohpmToolInfo(ohpmDir), ohpmDir, showdetail);
    requirementInfo(info.javaSdkInfo(javaSdkDirDevEco), javaSdkDirDevEco, showdetail);
    if (javaSdkDirDevEco) {
      requirementInfo(info.javaSdkVersionInfo(javaSdkVersionDevEco), javaSdkDirDevEco, showdetail);
    }
  }
  success = harmonyOsSdkDir && ohpmDir;
  requirementTitle(info.harmonyOsTitle, success);
  if (!success || showdetail) {
    requirementInfo(info.harmonyOsSdkInfo(harmonyOsSdkDir), harmonyOsSdkDir, showdetail);
    requirementInfo(info.ohpmToolInfo(ohpmDir), ohpmDir, showdetail);
    requirementInfo(info.javaSdkInfo(javaSdkDirDevEco), javaSdkDirDevEco, showdetail);
    if (javaSdkDirDevEco) {
      requirementInfo(info.javaSdkVersionInfo(javaSdkVersionDevEco), javaSdkDirDevEco, showdetail);
    }
  }

  optionTitle(info.androidTitle, androidSdkDir);
  if (!androidSdkDir || showdetail) {
    optionInfo(info.androidSdkInfo(androidSdkDir), androidSdkDir, showdetail);
    requirementInfo(info.javaSdkInfo(javaSdkDirAndroid), javaSdkDirAndroid, showdetail);
    if (javaSdkDirAndroid) {
      requirementInfo(info.javaSdkVersionInfo(javaSdkVersionAndroid), javaSdkDirAndroid, showdetail);
    }
  }
  if (platform !== Platform.Linux) {
    optionTitle(info.devEcoStudioTitle, devEcoStudioDir);
    if (!devEcoStudioDir || showdetail) {
      optionInfo(info.devEcoStudioInfo(devEcoStudioDir), devEcoStudioDir);
      requirementInfo(info.javaSdkInfo(javaSdkDirDevEco), javaSdkDirDevEco, showdetail);
      if (javaSdkDirDevEco) {
        requirementInfo(info.javaSdkVersionInfo(javaSdkVersionDevEco), javaSdkDirDevEco, showdetail);
      }
    }
  } else {
    optionTitle(info.commandLineToolsTitle, commandLineToolsDir);
    if (!commandLineToolsDir || showdetail) {
      optionInfo(info.commandLineToolsInfo(commandLineToolsDir), commandLineToolsDir);
    }
  }
  optionTitle(info.androidStudioTitle, androidStudioDir);
  if (!androidStudioDir || showdetail) {
    optionInfo(info.androidStudioInfo(androidStudioDir), androidStudioDir);
    requirementInfo(info.javaSdkInfo(javaSdkDirAndroid), javaSdkDirAndroid, showdetail);
    if (javaSdkDirAndroid) {
      requirementInfo(info.javaSdkVersionInfo(javaSdkVersionAndroid), javaSdkDirAndroid, showdetail);
    }
  }

  if (platform === Platform.MacOS) {
    let mes = info.XcodeTitle + (xCodeVersion ? ` (${xCodeVersion[0]})` : '');
    requirementTitle(mes, xCodeVersion);
    if (!xCodeVersion || showdetail) {
      mes = xCodeVersion ? xCodeVersion[1] : xCodeVersion;
      requirementInfo(info.iosXcodeDirInfo(xCodeDir), xCodeVersion, showdetail);
      requirementInfo(info.iosXcodeVersionInfo(mes), xCodeVersion, showdetail);
    }
    (!xCodeVersion || !iDeviceVersion || !deployVersion) ? errorTimes++ : errorTimes;
  }
  showWarning();
  return errorTimes;
}

function showWarning() {
  const needSdks = [
    openHarmonySdkDir,
    harmonyOsSdkDir,
    nodejsDir,
    ohpmDir,
    javaSdkDirDevEco || javaSdkDirAndroid,
    arkuiXSdkDir,
    androidSdkDir,
    androidStudioDir,
  ];

  const warningInfo = [
    info.warnOpenHarmonySdk,
    info.warnHarmonyOsSdk,
    info.warnNodejs,
    info.warnOhpm,
    info.warnJavaSdk,
    info.warnArkuiXSdk,
    info.warnAndroidSdk,
    info.warnAndroidStudio,
    info.warnDevEcoStudio,
    info.warnMacTools,
    info.warnXcodeVersion,
  ];
  const msgs = [];
  if (platform !== Platform.Linux) {
    needSdks.push(devEcoStudioDir);
  }
  if (platform === Platform.MacOS) {
    needSdks.push(xCodeVersion && iDeviceVersion && iDeviceVersion);
  }
  if (platform === Platform.MacOS) {
    needSdks.push(Number(xCodeVersion[0].split(' ')[1].split('.')[0]) >= 15);
  }

  needSdks.forEach((sdk, index) => {
    if (!sdk) {
      msgs.push(warningInfo[index]);
    }
  });
  if (msgs.length !== 0) {
    showWarningInfo(msgs);
  }
}

function check(cmd) {
  let errorTimes = 0;
  if (cmd && cmd.v) {
    errorTimes = checkRequired(errorTimes, cmd.v);
  } else {
    errorTimes = checkRequired(errorTimes);
  }
  if (nodejsDir) {
    process.execSync(`npm config set @ohos:registry=https://repo.harmonyos.com/npm/`);
  }

  if (!ohpmDir) {
    errorTimes++;
  }
  if (!arkuiXSdkDir) {
    errorTimes++;
  }
  if (!openHarmonySdkDir) {
    errorTimes++;
  }
  if (!harmonyOsSdkDir) {
    errorTimes++;
  }
  if (!nodejsDir) {
    errorTimes++;
  }
  if (!(javaSdkDirDevEco || javaSdkDirAndroid)) {
    errorTimes++;
  }
  if (!androidSdkDir) {
    errorTimes++;
  }
  if (checkDevEco()) {
    errorTimes++;
  }
  if (!androidStudioDir) {
    errorTimes++;
  }

  if (openHarmonySdkDir || harmonyOsSdkDir || androidSdkDir || deployVersion) {
    devices();
    const validDevice = devicesList;
    if (validDevice.all.length === 0) {
      errorTimes += 1;
    }
  } else {
    console.log(`[!] No debug tool`);
    errorTimes += 1;
  }
  printCheckInfo(errorTimes);
}

function checkDevEco() {
  let isErr = false;
  if (platform !== Platform.Linux) {
    if (!devEcoStudioDir) {
      isErr = true;
    }
  } else {
    if (!commandLineToolsDir) {
      isErr = true;
    }
  }
  return isErr;
}

function printCheckInfo(errorTimes) {
  if (errorTimes === 1) {
    console.log(`
  ! ACE Tools found issues in 1 category.`);
  } else if (errorTimes > 1) {
    console.log(`
  ! ACE Tools found issues in ${errorTimes} categories.`);
  } else {
    console.log(`
  √ ACE Tools found no issues.`);
  }
}

module.exports = check;
