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
const { isProjectRootDir, getModuleList } = require('../../util');
let projectDir;
let openHarmonySdkDir;
let nodejsDir;
let uiSyntax;

function readConfig() {
  try {
    if (config) {
      if (Object.prototype.hasOwnProperty.call(config, 'openharmony-sdk')) {
        openHarmonySdkDir = config['openharmony-sdk'];
      }
      if (Object.prototype.hasOwnProperty.call(config, 'nodejs-dir')) {
        nodejsDir = config['nodejs-dir'];
      }
    }
    if (!openHarmonySdkDir || !nodejsDir) {
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
  const content = `sdk.dir=${openHarmonySdkDir}\nnodejs.dir=${nodejsDir}`;
  return createLocalProperties(filePath, content);
}

function copySourceToOhos(moduleList) {
  let isContinue = true;
  moduleList.forEach(module => {
    const manifestPath = path.join(projectDir, '/source', module, '/src/main/ets/MainAbility/manifest.json');
    //copy js
    uiSyntax = fs.existsSync(manifestPath) ? 'ets' : 'js';
    const src = path.join(projectDir, 'source', module, '/src/main/' + uiSyntax);
    const dist = path.join(projectDir, 'ohos', module, '/src/main/' + uiSyntax);
    fs.mkdirSync(src, { recursive: true });
    fs.mkdirSync(dist, { recursive: true });
    isContinue = isContinue && copy(src, dist);
    //copy resources
    const resourcesSrc = path.join(projectDir, 'source', module, '/src/main/resources');
    const resourcesDist = path.join(projectDir, 'ohos', module, '/src/main/resources');
    fs.mkdirSync(resourcesSrc, { recursive: true });
    fs.mkdirSync(resourcesDist, { recursive: true });
    isContinue = isContinue && copy(resourcesSrc, resourcesDist);
  });
  return isContinue;
}

function copyBundleToAndroidAndIOS(moduleList) {
  let isContinue = true;
  moduleList.forEach(module => {
    //Now only consider one ability
    const src = path.join(projectDir, '/ohos', module, 'build/default/intermediates/assets/default/js/MainAbility');
    let distAndroid;
    let distIOS;
    const destClassName = module.toLowerCase();
    distAndroid = path.join(projectDir, '/android/app/src/main/assets/js', destClassName + '_MainAbility');
    distIOS = path.join(projectDir, '/ios/js', destClassName + '_MainAbility');
    fs.mkdirSync(distAndroid, { recursive: true });
    fs.mkdirSync(distIOS, { recursive: true });
    isContinue = isContinue && copy(src, distAndroid) && copy(src, distIOS);
  });
  //This time, copy the first module resource to ios/android.
  let ohosResourcePath = path.join(projectDir, '/ohos/entry/build/default/intermediates/res/default/');
  let filePathAndroid = path.join(projectDir, '/android/app/src/main/assets/resources/appres');
  let filePathIOS = path.join(projectDir, '/ios/resources/appres');
  fs.mkdirSync(filePathAndroid, { recursive: true });
  fs.mkdirSync(filePathIOS, { recursive: true });
  isContinue = isContinue && copy(ohosResourcePath, filePathAndroid) && copy(ohosResourcePath, filePathIOS);
  return isContinue;
}

function copyHaptoOutput() {
  const src = path.join(projectDir, '/ohos/entry/build/default/outputs/default');
  const filePath = copyToBuildDir(src);
  console.log(`filepath: ${filePath}`);
}

function syncManifest(moduleList) {
  let isContinue = true;
  moduleList.forEach(module => {
    let manifestPath = path.join(projectDir, '/source', module, '/src/main/ets/MainAbility/manifest.json');
    if (!fs.existsSync(manifestPath)) {
      manifestPath = path.join(projectDir, '/source', module, '/src/main/js/MainAbility/manifest.json');
    }

    const configPath = path.join(projectDir, '/ohos', module, 'src/main/config.json');
    try {
      const manifestObj = JSON.parse(fs.readFileSync(manifestPath));
      const configObj = JSON.parse(fs.readFileSync(configPath));
      configObj.app.bundleName = manifestObj.appID;
      configObj.app.version.name = manifestObj.versionName;
      configObj.app.version.code = manifestObj.versionCode;
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

    let manifestPath = path.join(projectDir, '/source', moduleNameOhos, '/src/main/ets/MainAbility/manifest.json');
    if (!fs.existsSync(manifestPath)) {
      manifestPath = path.join(projectDir, '/source', moduleNameOhos, '/src/main/js/MainAbility/manifest.json');
    }

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

function runGradle(fileType, cmd, moduleList) {
  const ohosDir = path.join(projectDir, '/ohos');
  let cmds = [`cd ${ohosDir}`];
  cmds.push(`npm install`);
  let gradleMessage;
  if (fileType === 'hap' || !fileType) {
    let moduleStr = "";
    if (moduleList) {
      moduleStr = "-p module=" + moduleList.join(",");
    }
    if (cmd.release) {
      const debugStr = "debuggable=false";
      cmds.push(`node ./node_modules/@ohos/hvigor/bin/hvigor.js ${debugStr} --mode module ${moduleStr} assembleHap`);
    } else {
      cmds.push(`node ./node_modules/@ohos/hvigor/bin/hvigor.js --mode module ${moduleStr} assembleHap`);
    }
    gradleMessage = 'Start building hap...';
  } else if (fileType === 'apk' || fileType === 'app') {
    if (uiSyntax === 'ets') {
      cmds.push(`node ./node_modules/@ohos/hvigor/bin/hvigor.js CompileETS`);
    } else {
      cmds.push(`node ./node_modules/@ohos/hvigor/bin/hvigor.js CompileJS`);
    }
    gradleMessage = 'Start compiling jsBundle...';
  }
  cmds = cmds.join(' && ');
  if (platform === Platform.Windows) {
    cmds = cmds.replace(/\//g, '\\');
  }
  try {
    console.log(`${gradleMessage}`);
    exec(cmds);
    return true;
  } catch (error) {
    console.error('Run gradle tasks failed.');
    return false;
  }
}

function compiler(fileType, cmd) {
  let moduleListInput = cmd.target;
  projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  const settingPath = path.join(projectDir, 'ohos/build-profile.json5');
  const moduleListAll = getModuleList(settingPath);
  if ((moduleListAll == null) || (moduleListAll.length === 0)) {
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
    && copySourceToOhos(moduleListAll)
    && syncManifest(moduleListAll)
    && runGradle(fileType, cmd, moduleListSpecified)
    && copyBundleToAndroidAndIOS(moduleListSpecified)
    && syncBundleName(moduleListAll)) {
    if (fileType === 'hap') {
      console.log(`Build hap successfully.`);
      copyHaptoOutput();
      return true;
    } else if (fileType === 'apk') {
      return true;
    } else if (fileType === 'app') {
      return true;
    }
  }
  console.error(`Compile failed.`);
  return false;
}

module.exports = compiler;
