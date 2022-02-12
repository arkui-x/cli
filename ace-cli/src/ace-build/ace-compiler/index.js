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
const { copy } = require('../../ace-create/project');

let projectDir;
let harmonySdkDir;
let nodejsDir;

function readConfig() {
  try {
    if (config) {
      if (Object.prototype.hasOwnProperty.call(config, 'harmonyos-sdk')) {
        harmonySdkDir = config['harmonyos-sdk'];
      }
      if (Object.prototype.hasOwnProperty.call(config, 'nodejs-dir')) {
        nodejsDir = config['nodejs-dir'];
        if (platform === Platform.Windows) {
          nodejsDir = nodejsDir.slice(0, nodejsDir.lastIndexOf('\\'));
        } else {
          nodejsDir = nodejsDir.slice(0, nodejsDir.lastIndexOf('/'));
        }
      }
    }
    if (!harmonySdkDir || !nodejsDir) {
      console.error(`Please check harmonySdk and nodejs in your environment.`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Please 'ace check' first.\n` + error);
    return false;
  }
}

function writeLocalProperties() {
  const filePath = path.join(projectDir, '/ohos/local.properties');
  const content = `hwsdk.dir=${harmonySdkDir}\nnodejs.dir=${nodejsDir}`;
  return createLocalProperties(filePath, content);
}

function getModuleList(settingPath) {
  try {
    if (fs.existsSync(settingPath)) {
      let settingStr = fs.readFileSync(settingPath).toString().trim();
      if (settingStr === 'include') {
        console.error(`There is no modules in project.`);
        return [];
      }
      settingStr = settingStr.split(`'`);
      if (settingStr.length % 2 === 0) {
        console.error(`Please check ${settingPath}.`);
        return [];
      } else {
        const moduleList = [];
        for (let index = 1; index < settingStr.length - 1; index++) {
          const moduleItem = settingStr[index].trim();
          if (moduleItem === '') {
            console.error(`Please check ${settingPath}.`);
            return [];
          } else if (moduleItem === ',') {
            continue;
          } else {
            moduleList.push(moduleItem.slice(1, settingStr[index].length));
          }
        }
        return moduleList;
      }
    }
  } catch (error) {
    console.error(`Please check ${settingPath}.`);
    return [];
  }
}

function copyJStoOhos(moduleList) {
  let isContinue = true;
  moduleList.forEach(module => {
    const src = path.join(projectDir, 'source', module);
    const dist = path.join(projectDir, 'ohos', module, '/src/main/js');
    isContinue = isContinue && copy(src, dist);
  });
  return isContinue;
}

function copyBundletoAndroid(moduleList) {
  let isContinue = true;
  moduleList.forEach(module => {
    const src = path.join(projectDir, '/ohos', module, 'build/intermediates/res/debug/rich/assets/js');
    let dist;
    if (module === 'entry') {
      dist = path.join(projectDir, '/android/app/src/main/assets/js');
    } else {
      dist = path.join(projectDir, '/android', module, 'src/main/assets', module, 'js');
    }
    fs.mkdirSync(dist, { recursive: true });
    isContinue = isContinue && copy(src, dist);
  });
  return isContinue;
}

function copyHaptoOutput() {
  const src = path.join(projectDir, '/ohos/build/outputs/hap/debug');
  const filePath = copyToBuildDir(src);
  console.log(`filepath: ${filePath}`);
}

function syncManifest(moduleList) {
  let isContinue = true;
  moduleList.forEach(module => {
    const manifestPath = path.join(projectDir, '/source', module, 'manifest.json');
    const configPath = path.join(projectDir, '/ohos', module, 'src/main/config.json');
    try {
      const manifestObj = JSON.parse(fs.readFileSync(manifestPath));
      const configObj = JSON.parse(fs.readFileSync(configPath));
      configObj.app.bundleName = manifestObj.appID;
      configObj.module.abilities[0].label = manifestObj.appName;
      configObj.app.version.name = manifestObj.versionName;
      configObj.app.version.code = manifestObj.versionCode;
      configObj.app.apiVersion.compatible = manifestObj.minPlatformVersion;
      configObj.module.js = manifestObj.js;
      fs.writeFileSync(configPath, JSON.stringify(configObj, '', '  '));
      isContinue = isContinue && true;
    } catch (error) {
      console.error(`Please check pages in ${manifestPath} and ${configPath}.\n` + error);
      isContinue = isContinue && false;
    }
  });
  return isContinue;
}

function syncBundleName(moduleList) {
  const isContinue = true;
  moduleList.forEach(module => {
    const moduleNameOhos = module;
    let moduleNameAndroid = module;
    if (module === 'entry') {
      moduleNameAndroid = 'app';
    }
    const manifestPath = path.join(projectDir, '/source', moduleNameOhos, 'manifest.json');
    const gradlePath = path.join(projectDir, '/android', moduleNameAndroid, 'build.gradle');
    try {
      const manifestObj = JSON.parse(fs.readFileSync(manifestPath));
      if (fs.existsSync(gradlePath)) {
        let srcStr;
        let distStr;
        let gradleData = fs.readFileSync(gradlePath, 'utf-8');
        gradleData = gradleData.trim().split('\n');
        gradleData.some(element => {
          if (element.indexOf(`applicationId`) !== -1) {
            srcStr = element;
            distStr = element.replace(element.split('"')[1], manifestObj.appID);
            return true;
          }
        });
        fs.writeFileSync(gradlePath, fs.readFileSync(gradlePath).toString().replace(srcStr, distStr));
        return true;
      }
    } catch (error) {
      console.error(`Please check pages in ${manifestPath} and ${gradlePath}.\n` + error);
      return false;
    }
  });
  return isContinue;
}

function runGradle(fileType, moduleList) {
  const ohosDir = path.join(projectDir, '/ohos');
  let cmd = [`cd ${ohosDir}`];
  if (platform !== Platform.Windows) {
    cmd.push(`chmod 755 gradlew`);
  }
  let gradleMessage;
  if (fileType === 'hap' || !fileType) {
    moduleList.forEach(module => {
      cmd.push(`./gradlew :${module}:assembleDebug`);
    });
    gradleMessage = 'Start building hap...';
  } else if (fileType === 'apk') {
    moduleList.forEach(module => {
      cmd.push(`./gradlew :${module}:compileDebugJsWithNode`);
    });
    gradleMessage = 'Start compiling jsBundle...';
  }
  cmd = cmd.join(' && ');
  if (platform === Platform.Windows) {
    cmd = cmd.replace(/\//g, '\\');
  }
  try {
    console.log(`${gradleMessage}`);
    exec(cmd);
    return true;
  } catch (error) {
    console.error('Run gradle tasks failed.');
    return false;
  }
}

function isProjectRootDir(currentDir) {
  const ohosGradlePath = path.join(currentDir, 'ohos/settings.gradle');
  const androidGradlePath = path.join(currentDir, 'android/settings.gradle');
  try {
    fs.accessSync(ohosGradlePath);
    fs.accessSync(androidGradlePath);
    return true;
  } catch (error) {
    return false;
  }
}

function compiler(fileType, moduleListInput) {
  if (!isProjectRootDir(process.cwd())) {
    console.error('Please go to the root directory of project.');
    return false;
  }
  projectDir = process.cwd();

  const settingPath = path.join(projectDir, 'ohos/settings.gradle');
  const moduleListAll = getModuleList(settingPath);
  if (moduleListAll.length === 0) {
    console.error('There is no module in project.');
    return false;
  }

  let moduleListSpecified = moduleListAll;
  if (moduleListInput && moduleListInput !== true) {
    const inputModules = moduleListInput.split(' ');
    for (let i = 0; i < inputModules.length; i++) {
      if (inputModules[i] === 'app') {
        inputModules[i] = 'entry';
      }
      if (!moduleListAll.includes(inputModules[i])) {
        console.error('Please input correct module name.');
        return false;
      }
    }
    moduleListSpecified = inputModules;
  }

  if (readConfig()
      && writeLocalProperties()
      && copyJStoOhos(moduleListAll)
      && syncManifest(moduleListAll)
      && runGradle(fileType, moduleListSpecified)
      && copyBundletoAndroid(moduleListSpecified)
      && syncBundleName(moduleListAll)) {
    if (fileType === 'hap') {
      console.log(`Build hap successfully.`);
      copyHaptoOutput();
      return true;
    } else if (fileType === 'apk') {
      return true;
    }
  }
  console.error(`Compile failed.`);
  return false;
}

module.exports = compiler;
