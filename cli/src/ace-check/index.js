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

const {
  harmonyOSSdkDir,
  nodejsDir,
  devEcoStudioDir,
  androidSdkDir
} = require('./configs');
const checkJavaSdk = require('./checkJavaSdk');
const { setConfig } = require('../ace-config');
const devices = require('../ace-devices');
const info = require('./Info');
const {
  requirementTitle,
  optionTitle,
  requirementInfo,
  optionInfo
} = require('./util');

const javaSdkDir = checkJavaSdk();

function check() {
  let errorTimes = 0;

  requirementTitle(info.harmonyosTitle, harmonyOSSdkDir && nodejsDir && javaSdkDir);
  requirementInfo(info.harmonyosSdkInfo(harmonyOSSdkDir), harmonyOSSdkDir);
  requirementInfo(info.nodejsInfo(nodejsDir), nodejsDir);
  requirementInfo(info.javaSdkInfo(javaSdkDir), javaSdkDir);

  optionTitle(info.androidTitle, androidSdkDir);
  optionInfo(info.androidSdkInfo(androidSdkDir), androidSdkDir);

  optionTitle(info.devEcoTitle, devEcoStudioDir);
  optionInfo(info.devEcoInfo(devEcoStudioDir), devEcoStudioDir);

  if (harmonyOSSdkDir) {
    setConfig({'harmonyos-sdk': harmonyOSSdkDir});
  } else {
    errorTimes += 1;
  }

  if (nodejsDir) {
    setConfig({'nodejs-dir': nodejsDir});
  } else {
    errorTimes += 1;
  }

  if (javaSdkDir) {
    setConfig({'java-sdk': javaSdkDir});
  } else {
    errorTimes += 1;
  }

  if (androidSdkDir) {
    setConfig({'android-sdk': androidSdkDir});
  } else {
    errorTimes += 1;
  }

  if (!devEcoStudioDir) {
    errorTimes += 1;
  }

  if (harmonyOSSdkDir || androidSdkDir) {
    const validDevice = devices();
    if (validDevice.all.length === 0 || validDevice.unavailable.length > 0) {
      errorTimes += 1;
    }
  } else {
    console.log(`[!] No debug tool`);
    errorTimes += 1;
  }

  if (errorTimes === 1) {
    console.log(`
  ! Ace-check found issues in 1 category.`);
  } else if (errorTimes > 1) {
    console.log(`
  ! Ace-check found issues in ${errorTimes} categories.`);
  } else {
    console.log(`
  √ Ace-check found no issues.`);
  }
}

module.exports = check;
