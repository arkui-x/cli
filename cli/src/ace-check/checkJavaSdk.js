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

const { devEcoStudioDir } = require('./configs');
const { Platform, platform } = require('./platform');
const { getConfig } = require('../ace-config');

function checkJavaSdk() {
  let javaSdkPath;
  const environment = process.env;
  if (devEcoStudioDir) {
    if (platform === Platform.Linux || platform === Platform.Windows) {
      if (/bin$/.test(devEcoStudioDir)) {
        javaSdkPath = path.join(devEcoStudioDir, '..', 'jbr');
      } else {
        javaSdkPath = path.join(devEcoStudioDir, 'jbr');
      }
    } else if (platform === Platform.MacOS) {
      if (/bin$/.test(devEcoStudioDir)) {
        javaSdkPath = path.join(devEcoStudioDir, '..', 'Contents', 'jdk', 'Contents', 'Home');
      } else {
        javaSdkPath = path.join(devEcoStudioDir, 'Contents', 'jdk', 'Contents', 'Home');
      }
    }
  } else if ('JAVA_HOME' in environment) {
    javaSdkPath = environment['JAVA_HOME'].replace(';', '');
  } else {
    const config = getConfig();
    if (config && config['java-sdk']) {
      javaSdkPath = config['java-sdk'];
    }
  }

  if (validSdk(javaSdkPath)) {
    environment['JAVA_HOME'] = javaSdkPath;
    return javaSdkPath;
  }
}

function validSdk(javaSdkPath) {
  if (fs.existsSync(javaSdkPath)) {
    return true;
  }
}

module.exports = checkJavaSdk;
