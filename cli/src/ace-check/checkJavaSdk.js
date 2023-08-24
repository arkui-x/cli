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
const Process = require('child_process');

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

function getJavaSdkDir(IdeDir) {
  if (!IdeDir) {
    return;
  } else {
    if (platform === Platform.Windows || platform === Platform.Linux) {
      if (fs.existsSync(path.join(IdeDir, 'jbr'))) {
        return path.join(IdeDir, 'jbr');
      }
      else if (fs.existsSync(path.join(IdeDir, '..', 'jbr'))) {
        return path.join(IdeDir, '..', 'jbr');
      }
    } else if (platform === Platform.MacOS) {
      if (fs.existsSync(path.join(IdeDir, 'Contents', 'jdk', 'Contents', 'Home'))) {
        return path.join(IdeDir, 'Contents', 'jdk', 'Contents', 'Home');
      }
      else if (fs.existsSync(path.join(IdeDir, '..', 'Contents', 'jdk', 'Contents', 'Home'))) {
        return path.join(IdeDir, '..', 'Contents', 'jdk', 'Contents', 'Home');
      }
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
function getJavaVersion(javaBinDir) {
  let javaVersion = '';
  if (platform === Platform.Windows) {
    javaBinDir = path.join(javaBinDir, 'java.exe');
    javaBinDir = '"' + javaBinDir + '"';
  } else if (platform === Platform.Linux) {
    javaBinDir = path.join(javaBinDir, 'java');
  } else if (platform === Platform.MacOS) {
    javaBinDir = path.join(javaBinDir, 'java');
  }
  if (vaildJavaSdkDir()) {
    const javaVersionContent = Process.execSync(`${javaBinDir} --version`, {encoding: 'utf-8', stdio: 'pipe' }).toString();
    const javaVersionContentArray = javaVersionContent.split('\n');
    javaVersion = javaVersionContentArray[1];
    return javaVersion;
  }
}

module.exports = {
  checkJavaSdk,
  vaildJavaSdkDir,
  getJavaVersion,
  getJavaSdkDir
};
