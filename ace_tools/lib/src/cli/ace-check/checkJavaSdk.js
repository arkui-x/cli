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

const { Platform, platform } = require('./platform');
const { getConfig, modifyConfigPath } = require('../ace-config');
const Process = require('child_process');
const { javaSdkPathCheck } = require('./checkPathLawful');

function getJavaSdkDirInEnv() {
  const environment = process.env;
  const config = getConfig();
  let javaDir;
  if (config && config['java-sdk'] && javaSdkPathCheck(config['java-sdk'])) {
    javaDir = config['java-sdk'];
  } else if ('JAVA_HOME' in environment && javaSdkPathCheck(environment['JAVA_HOME'].replace(';', ''))) {
    javaDir = environment['JAVA_HOME'].replace(';', '');
  } else if (getGlobalJavaSdk()) {
    javaDir = getGlobalJavaSdk();
  } else {
    javaDir = getDefaultJavaSdk();
  }
  modifyConfigPath('java-sdk', javaDir);
  if (javaDir) {
    return javaDir;
  }
}

function getGlobalJavaSdk() {
  let JavaSdkDir;
  if (platform === Platform.Windows) {
    try {
      JavaSdkDir = path.parse(Process.execSync(`where java`, { stdio: 'pipe' }).toString().split(/\r\n/g)[0]).dir;
    } catch (err) {
      // ignore
    }
  } else if (platform === Platform.Linux || platform === Platform.MacOS) {
    try {
      JavaSdkDir = path.parse(Process.execSync(`which java`, { stdio: 'pipe' }).toString().replace(/\n/g, '')).dir;
    } catch (err) {
      // ignore
    }
  }
  if (JavaSdkDir) {
    JavaSdkDir = path.dirname(JavaSdkDir);
    return JavaSdkDir;
  }
}

function getDefaultJavaSdk() {
  let defaultJavaSdk;
  const defaultWinsDirs = [`C:\\Program Files\\Java`, `D:\\Program Files\\Java`];
  const defaultLinuxDir = ['/usr/lib/jvm'];
  const defaultMacDir = ['/Library/Java/JavaVirtualMachines'];
  const winStart = 'jdk';
  const linuxStart = 'java';
  const macStart = 'jdk';
  if (platform === Platform.Windows) {
    defaultJavaSdk = getDefaultPath(defaultWinsDirs, winStart);
  } else if (platform === Platform.Linux) {
    defaultJavaSdk = getDefaultPath(defaultLinuxDir, linuxStart);
  } else if (platform === Platform.MacOS) {
    defaultJavaSdk = getDefaultPath(defaultMacDir, macStart);
  }
  if (defaultJavaSdk) {
    return defaultJavaSdk;
  }
}

function getDefaultPath(defaultDirs, typeStart) {
  let defaultPath;
  let jdkVersion = 17;
  let basePath;
  defaultDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      return defaultPath;
    }
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (fs.statSync(path.join(dir, file)).isDirectory() && file.startsWith(typeStart)) {
        if (Number(file.match(/-(\d+)/)[1]) === jdkVersion) {
          basePath = path.join(dir, file);
          if (platform === Platform.MacOS) {
            basePath = path.join(basePath, 'Contents', 'Home');
          }
          if (javaSdkPathCheck(basePath)) {
            jdkVersion = file.match(/\d+(?=-)/);
            defaultPath = basePath;
            return;
          }
        }
      }
    });
    if (defaultPath) {
      return;
    }
  });
  if (defaultPath) {
    return defaultPath;
  }
}

function getJavaSdkDirInIde(IdeDir) {
  if (!IdeDir) {
    return;
  } else {
    if (platform === Platform.Windows || platform === Platform.Linux) {
      if (fs.existsSync(path.join(IdeDir, 'jbr'))) {
        return path.join(IdeDir, 'jbr');
      } else if (fs.existsSync(path.join(IdeDir, '..', 'jbr'))) {
        return path.join(IdeDir, '..', 'jbr');
      }
    } else if (platform === Platform.MacOS) {
      if (fs.existsSync(path.join(IdeDir, 'Contents', 'jbr', 'Contents', 'Home'))) {
        return path.join(IdeDir, 'Contents', 'jbr', 'Contents', 'Home');
      } else if (fs.existsSync(path.join(IdeDir, '..', 'Contents', 'jbr', 'Contents', 'Home'))) {
        return path.join(IdeDir, '..', 'Contents', 'jbr', 'Contents', 'Home');
      }
    }
  }
}

function setJavaSdkDirInEnv(javaSdkDir) {
  if (javaSdkDir) {
    const environment = process.env;
    if (platform === Platform.Windows) {
      environment['JAVA_HOME'] = javaSdkDir;
      environment['Path'] = javaSdkDir + '\\bin;' + environment['Path'];
    } else if (platform === Platform.Linux) {
      environment['JAVA_HOME'] = javaSdkDir;
      environment['PATH'] = javaSdkDir + '/bin:' + environment['PATH'];
    } else if (platform === Platform.MacOS) {
      environment['JAVA_HOME'] = javaSdkDir;
      environment['PATH'] = javaSdkDir + '/bin:' + environment['PATH'];
    }
  } else {
    console.log('Java SDK is required, JAVA_HOME is not set and no \'java\' command could be found in your PATH. JDK 17 or later is recommended.');
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
    javaBinDir = '"' + javaBinDir + '"';
    javaBinDir = path.join(javaBinDir, 'java');
  }
  try {
    const javaVersionContent = Process.execSync(`${javaBinDir} --version`, {encoding: 'utf-8', stdio: 'pipe' }).toString();
    const javaVersionContentArray = javaVersionContent.split('\n');
    javaVersion = javaVersionContentArray[1];
    return javaVersion;
  } catch (err) {
    return javaVersion;
  }
}

module.exports = {
  getJavaSdkDirInEnv,
  getJavaVersion,
  getJavaSdkDirInIde,
  setJavaSdkDirInEnv
};
