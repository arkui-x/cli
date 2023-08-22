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
 
const { devEcoStudioDir } = require('./configs');
const { Platform, platform } = require('./platform');
const { getConfig } = require('../ace-config');

function vaildJavaSdkDir() {
  const environment = process.env;
  if (platform === Platform.Windows) {
    if (environment['JAVA_HOME'] && fs.existsSync(path.join(environment['JAVA_HOME'], 'bin', 'java.exe'))) {
      return environment['JAVA_HOME'];
    }
  } else if (platform === Platform.Linux) {
    if (environment['JAVA_HOME'] && fs.existsSync(path.join(environment['JAVA_HOME'], 'bin', 'java'))) {
      return environment['JAVA_HOME'];
    }
  } else if (platform === Platform.MacOS) {
    if (environment['JAVA_HOME'] && fs.existsSync(path.join(environment['JAVA_HOME'], 'bin', 'java'))) {
      return environment['JAVA_HOME'];
    }
  }
}

function checkJavaSdk() {
  let javaSdkPath;
  const environment = process.env;
  const config = getConfig();

  if (config && config['java-sdk']) {
    javaSdkPath = config['java-sdk'];
  } else if ('JAVA_HOME' in environment) {
    javaSdkPath = environment['JAVA_HOME'].replace(';', '');
  } else {
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
    }
  }

  if (validSdk(javaSdkPath)) {
    environment['JAVA_HOME'] = javaSdkPath;
    environment['PATH'] = `${path.join(javaSdkPath, 'bin')};${environment['PATH']}`;
    return javaSdkPath;
  }
}

function validSdk(javaSdkPath) {
  if (fs.existsSync(javaSdkPath)) {
    return true;
  }
}
function getJavaVersion() {
  let javaVersion = '';
  let javaVersionFile = path.join(process.env['JAVA_HOME'], 'release');
  if (fs.existsSync(javaVersionFile)) {
    let javaVersionContent = fs.readFileSync(javaVersionFile, 'utf-8');
    let javaVersionContentArray = javaVersionContent.split('\n');
    javaVersionContentArray.forEach((element) => {
      if (element.indexOf('JAVA_VERSION=') >= 0) {
        javaVersion = element.split('=')[1].replace(/"/g, '');
      }
    });
  }
  javaVersion = javaVersion.replace(/\r/g, '');
  return javaVersion;
}

module.exports = {
  checkJavaSdk,
  vaildJavaSdkDir,
  getJavaVersion
};
