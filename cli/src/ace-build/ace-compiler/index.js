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
const { isProjectRootDir, getModuleList, isStageProject, getCurrentProjectSystem,
  getAarName, getFrameworkName } = require('../../util');
let projectDir;
let openHarmonySdkDir;
let harmonyOsSdkDir;
let arkuiXSdkDir;
let nodejsDir;
let uiSyntax;
let currentSystem;

function readConfig() {
  try {
    if (config) {
      if (Object.prototype.hasOwnProperty.call(config, 'openharmony-sdk')) {
        openHarmonySdkDir = config['openharmony-sdk'];
      }
      if (Object.prototype.hasOwnProperty.call(config, 'arkui-x-sdk')) {
        arkuiXSdkDir = config['arkui-x-sdk'];
      }
      if (Object.prototype.hasOwnProperty.call(config, 'harmonyos-sdk')) {
        harmonyOsSdkDir = config['harmonyos-sdk'];
      }
      if (Object.prototype.hasOwnProperty.call(config, 'nodejs-dir')) {
        nodejsDir = config['nodejs-dir'];
      }
    }
    if (currentSystem === HarmonyOS) {
      if (!harmonyOsSdkDir || !nodejsDir || !arkuiXSdkDir) {
        console.error(`Please check HarmonyOS Sdk and ArkUI-X SDK and nodejs in your environment.`);
        return false;
      }
    } else {
      if (!openHarmonySdkDir || !nodejsDir || !arkuiXSdkDir) {
        console.error(`Please check OpenHarmony Sdk and ArkUI-X SDK and nodejs in your environment.`);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error(`Please 'ace check' first.`);
    return false;
  }
}

function writeLocalProperties() {
  let content;
  const filePath = path.join(projectDir, '/ohos/local.properties');
  if (currentSystem === HarmonyOS) {
    content = `hwsdk.dir=${harmonyOsSdkDir}\nnodejs.dir=${nodejsDir}`;
  } else {
    content = `sdk.dir=${openHarmonySdkDir}\nnodejs.dir=${nodejsDir}`;
  }
  return createLocalProperties(filePath, content);
}

function copySourceToOhos(moduleList) {
  let isContinue = true;
  moduleList.forEach(module => {
    const manifestPath = path.join(projectDir, '/source', module, '/src/main/ets/MainAbility/manifest.json');
    // copy js
    uiSyntax = fs.existsSync(manifestPath) ? 'ets' : 'js';
    const src = path.join(projectDir, 'source', module, '/src/main/' + uiSyntax);
    const dist = path.join(projectDir, 'ohos', module, '/src/main/' + uiSyntax);
    fs.mkdirSync(src, { recursive: true });
    fs.mkdirSync(dist, { recursive: true });
    isContinue = isContinue && copy(src, dist);
    // copy resources
    const resourcesSrc = path.join(projectDir, 'source', module, '/src/main/resources');
    const resourcesDist = path.join(projectDir, 'ohos', module, '/src/main/resources');
    fs.mkdirSync(resourcesSrc, { recursive: true });
    fs.mkdirSync(resourcesDist, { recursive: true });
    isContinue = isContinue && copy(resourcesSrc, resourcesDist);
  });
  return isContinue;
}

function copyStageSourceToOhos(moduleList, fileName) {
  let isContinue = true;
  uiSyntax = 'ets';
  moduleList.forEach(module => {
    deleteOldFile(path.join(projectDir, 'ohos', module, `src/${fileName}`, uiSyntax));
    deleteOldFile(path.join(projectDir, 'ohos', module, `src/${fileName}/resources`));
    // copy ets
    const src = path.join(projectDir, 'source', module);
    const dist = path.join(projectDir, 'ohos', module);
    fs.mkdirSync(src, { recursive: true });
    fs.mkdirSync(dist, { recursive: true });
    const uiSyntaxSrc = path.join(projectDir, 'source', module, `/src/${fileName}/` + uiSyntax);
    const uiSyntaxDist = path.join(projectDir, 'ohos', module, `/src/${fileName}/` + uiSyntax);
    fs.mkdirSync(uiSyntaxSrc, { recursive: true });
    fs.mkdirSync(uiSyntaxDist, { recursive: true });
    isContinue = isContinue && copy(uiSyntaxSrc, uiSyntaxDist);
    // copy resources
    const resourcesSrc = path.join(projectDir, 'source', module, `/src/${fileName}/resources`);
    const resourcesDist = path.join(projectDir, 'ohos', module, `/src/${fileName}/resources`);
    fs.mkdirSync(resourcesSrc, { recursive: true });
    fs.mkdirSync(resourcesDist, { recursive: true });
    isContinue = isContinue && copy(resourcesSrc, resourcesDist);
    // copy config
    let fileList = [`src/${fileName}/module.json5`];
    if (fileName === 'main') {
      fileList = fileList.concat(['build-profile.json5', 'hvigorfile.ts', 'oh-package.json5']);
    }
    fileList.forEach(file => {
      const fileSrc = path.join(projectDir, 'source', module, file);
      const fileDst = path.join(projectDir, 'ohos', module, file);
      fs.copyFileSync(fileSrc, fileDst);
    });
  });
  return isContinue;
}

function copyTestStageSourceToOhos(moduleList, fileType, cmd) {
  if (!cmd.debug || fileType === 'hap' || !fileType) {
    return true;
  }
  return copyStageSourceToOhos(moduleList, 'ohosTest');
}


function copyBundleToAndroidAndIOS(moduleList) {
  let isContinue = true;
  deleteOldFile(path.join(projectDir, 'ios/js'));
  deleteOldFile(path.join(projectDir, 'ios/res'));
  deleteOldFile(path.join(projectDir, 'android/app/src/main/assets'));
  moduleList.forEach(module => {
    // Now only consider one ability
    const src = path.join(projectDir, '/ohos', module, 'build/default/intermediates/loader_out/default/' +
      uiSyntax + '/MainAbility');
    let distAndroid;
    let distIOS;
    const destClassName = module.toLowerCase();
    distAndroid = path.join(projectDir, '/android/app/src/main/assets/js', destClassName + '_MainAbility');
    distIOS = path.join(projectDir, '/ios/js', destClassName + '_MainAbility');
    fs.mkdirSync(distAndroid, { recursive: true });
    fs.mkdirSync(distIOS, { recursive: true });
    isContinue = isContinue && copy(src, distAndroid) && copy(src, distIOS);
  });
  // This time, copy the first module resource to ios/android.
  const ohosResourcePath = path.join(projectDir, '/ohos/entry/build/default/intermediates/res/default/');
  const filePathAndroid = path.join(projectDir, '/android/app/src/main/assets/res/appres');
  const filePathIOS = path.join(projectDir, '/ios/res/appres');
  fs.mkdirSync(filePathAndroid, { recursive: true });
  fs.mkdirSync(filePathIOS, { recursive: true });
  isContinue = isContinue && copy(ohosResourcePath, filePathAndroid) && copy(ohosResourcePath, filePathIOS);
  return isContinue;
}

function copyStageBundleToAndroidAndIOS(moduleList) {
  let isContinue = true;
  deleteOldFile(path.join(projectDir, 'ios/arkui-x'));
  deleteOldFile(path.join(projectDir, 'android/app/src/main/assets/arkui-x'));
  isContinue = copyStageBundleToAndroidAndIOSByTarget(moduleList, 'default', '');
  const systemResPath = path.join(arkuiXSdkDir, 'engine/systemres');
  const iosSystemResPath = path.join(projectDir, '/ios/arkui-x/systemres');
  const androidSystemResPath = path.join(projectDir, '/android/app/src/main/assets/arkui-x/systemres');
  isContinue = isContinue && copy(systemResPath, iosSystemResPath) && copy(systemResPath, androidSystemResPath);
  return isContinue;
}

function copyTestStageBundleToAndroidAndIOS(moduleList, fileType, cmd) {
  let isContinue = true;
  if (!cmd.debug || fileType === 'hap' || !fileType) {
    return isContinue;
  }
  isContinue = copyStageBundleToAndroidAndIOSByTarget(moduleList, 'ohosTest', 'Test');
  return isContinue;
}

function copyStageBundleToAndroidAndIOSByTarget(moduleList, fileName, moduleOption) {
  let isContinue = true;
  moduleList.forEach(module => {
    // Now only consider one ability
    const src = path.join(projectDir, '/ohos', module, `build/default/intermediates/loader_out/${fileName}/ets`);
    const resindex = path.join(projectDir, '/ohos', module,
      `build/default/intermediates/res/${fileName}/resources.index`);
    const resPath = path.join(projectDir, '/ohos', module, `build/default/intermediates/res/${fileName}/resources`);
    const moduleJsonPath = path.join(projectDir, '/ohos', module,
      `build/default/intermediates/res/${fileName}/module.json`);
    const destClassName = module + moduleOption;
    const distAndroid = path.join(projectDir, '/android/app/src/main/assets/arkui-x/', destClassName + '/ets');
    const distIOS = path.join(projectDir, '/ios/arkui-x/', destClassName + '/ets');
    const resindexAndroid = path.join(projectDir, '/android/app/src/main/assets/arkui-x/',
      destClassName + '/resources.index');
    const resPathAndroid = path.join(projectDir, '/android/app/src/main/assets/arkui-x/',
      destClassName + '/resources');
    const moduleJsonPathAndroid = path.join(projectDir, '/android/app/src/main/assets/arkui-x/',
      destClassName + '/module.json');
    const resindexIOS = path.join(projectDir, '/ios/arkui-x/', destClassName + '/resources.index');
    const resPathIOS = path.join(projectDir, '/ios/arkui-x/', destClassName + '/resources');
    const moduleJsonPathIOS = path.join(projectDir, '/ios/arkui-x/', destClassName + '/module.json');
    fs.mkdirSync(distAndroid, { recursive: true });
    fs.mkdirSync(distIOS, { recursive: true });
    isContinue = isContinue && copy(src, distAndroid) && copy(src, distIOS);
    isContinue = isContinue && copy(resPath, resPathAndroid) && copy(resPath, resPathIOS);
    fs.writeFileSync(resindexAndroid, fs.readFileSync(resindex));
    fs.writeFileSync(resindexIOS, fs.readFileSync(resindex));
    fs.writeFileSync(moduleJsonPathAndroid, fs.readFileSync(moduleJsonPath));
    fs.writeFileSync(moduleJsonPathIOS, fs.readFileSync(moduleJsonPath));
  });
  return isContinue;
}

function deleteOldFile(deleteFilePath) {
  try {
    if (fs.existsSync(deleteFilePath) && !deleteFilePath.includes(path.join('arkui-x', 'systemres'))) {
      const files = fs.readdirSync(deleteFilePath);
      files.forEach(function(file, index) {
        const curPath = path.join(deleteFilePath, file);
        if (fs.statSync(curPath).isDirectory()) {
          deleteOldFile(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      if (!deleteFilePath.endsWith('arkui-x')) {
        fs.rmdirSync(deleteFilePath);
      }
    }
  } catch (error) {
    console.log(error);
  }
}

function copyHaptoOutput(moduleListSpecified) {
  moduleListSpecified.forEach(module => {
    const src = path.join(projectDir, '/ohos/' + module + '/build/default/outputs/default');
    const filePath = copyToBuildDir(src);
    console.log(`filepath: ${filePath}`);
  });
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
      console.error(`Please check pages in ${manifestPath} and ${configPath}.`);
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
      console.error(`Please check pages in ${manifestPath} and ${gradlePath}.`);
      return false;
    }
  });
  return isContinue;
}

function runGradle(fileType, cmd, moduleList, moduleType) {
  const ohosDir = path.join(projectDir, '/ohos');
  let cmds = [`cd ${ohosDir}`];
  let buildCmd = '';
  if (moduleType === 'Stage') {
    cmds.push(`ohpm install`);
    if (platform !== Platform.Windows) {
      cmds.push(`chmod 755 hvigorw`);
    }
    buildCmd = `./hvigorw`;
  } else {
    cmds.push(`npm install`);
    buildCmd = 'node ./node_modules/@ohos/hvigor/bin/hvigor.js';
  }
  let gradleMessage;
  if (fileType === 'hap' || !fileType) {
    let moduleStr = '';
    if (moduleList) {
      moduleStr = '-p module=' + moduleList.join(',');
    }
    let debugStr = '';
    if (cmd.debug) {
      debugStr = '-p buildMode=debug';
    }
    cmds.push(`${buildCmd} ${debugStr} -p product=default --mode module ${moduleStr} assembleHap`);
    gradleMessage = 'Start building hap...';
  } else if (fileType === 'apk' || fileType === 'app' || fileType === 'aar' ||
    fileType === 'framework' || fileType === 'xcframework') {
    let buildtarget = '';
    let testbBuildtarget = '';
    if (moduleType === 'Stage') {
      buildtarget = 'default@CompileArkTS';
      if (cmd.debug && moduleList) {
        let moduleTestStr = '-p module=' + moduleList.join('@ohosTest,') + '@ohosTest';
        testbBuildtarget = `--mode module ${moduleTestStr} ohosTest@OhosTestCompileArkTS`;
      }
    } else if (uiSyntax === 'ets') {
      buildtarget = 'default@LegacyCompileArkTS';
    } else {
      buildtarget = 'default@LegacyCompileJS';
    }
    cmds.push(`${buildCmd} ${buildtarget}`);
    if (cmd.debug) {
      cmds.push(`${buildCmd} ${testbBuildtarget}`);
    }
    gradleMessage = 'Start compiling jsBundle...';
  }
  cmds = cmds.join(' && ');
  if (platform === Platform.Windows) {
    cmds = cmds.replace(/\//g, '\\');
  }
  try {
    console.log(`${gradleMessage}`);
    exec(cmds, {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    return true;
  } catch (error) {
    console.error('Run tasks failed.');
    return false;
  }
}

function copyBundleToAAR(moduleList) {
  const aarNameList = getAarName(projectDir);
  let isContinue = true;
  aarNameList.forEach(aarName => {
    const aarPath = path.join(projectDir, 'android', aarName);
    if (!fs.existsSync(aarPath)) {
      console.error(`Build aar failed.\nPlease check ${aarPath} directory existing.`);
      return false;
    }
    deleteOldFile(path.join(aarPath, 'src/main/assets'));
    moduleList.forEach(module => {
      const src = path.join(projectDir, '/ohos', module, 'build/default/intermediates/loader_out/default/' +
        uiSyntax + '/MainAbility');
      const destClassName = module.toLowerCase();
      const distAAR = path.join(aarPath, 'src/main/assets/js', destClassName + '_MainAbility');
      fs.mkdirSync(distAAR, { recursive: true });
      isContinue = isContinue && copy(src, distAAR);
    });
    const ohosResourcePath = path.join(projectDir, '/ohos/entry/build/default/intermediates/res/default/');
    const filePathAAR = path.join(aarPath, 'src/main/assets/res/appres');
    fs.mkdirSync(filePathAAR, { recursive: true });
    isContinue = isContinue && copy(ohosResourcePath, filePathAAR);
  });
  return isContinue;
}

function copyStageBundleToAAR(moduleList) {
  const aarNameList = getAarName(projectDir);
  let isContinue = true;
  aarNameList.forEach(aarName => {
    const aarPath = path.join(projectDir, 'android', aarName);
    if (!fs.existsSync(aarPath)) {
      console.error(`Build aar failed.\nPlease check ${aarPath} directory existing.`);
      return false;
    }
    deleteOldFile(path.join(aarPath, 'src/main/assets/arkui-x'));
    moduleList.forEach(module => {
      // Now only consider one ability
      const src = path.join(projectDir, '/ohos', module, 'build/default/intermediates/loader_out/default/ets');
      const resindex = path.join(projectDir, '/ohos', module,
        'build/default/intermediates/res/default/resources.index');
      const resPath = path.join(projectDir, '/ohos', module, 'build/default/intermediates/res/default/resources');
      const moduleJsonPath = path.join(projectDir, '/ohos', module,
        'build/default/intermediates/res/default/module.json');
      const destClassName = module.toLowerCase();
      const distAndroid = path.join(aarPath, 'src/main/assets/arkui-x/', destClassName + '/ets');
      const resindexAndroid = path.join(aarPath, 'src/main/assets/arkui-x/', destClassName + '/resources.index');
      const resPathAndroid = path.join(aarPath, 'src/main/assets/arkui-x/', destClassName + '/resources');
      const moduleJsonPathAndroid = path.join(aarPath, 'src/main/assets/arkui-x/', destClassName + '/module.json');
      fs.mkdirSync(distAndroid, { recursive: true });
      isContinue = isContinue && copy(src, distAndroid);
      isContinue = isContinue && copy(resPath, resPathAndroid);
      fs.writeFileSync(resindexAndroid, fs.readFileSync(resindex));
      fs.writeFileSync(moduleJsonPathAndroid, fs.readFileSync(moduleJsonPath));
    });
    const systemResPath = path.join(arkuiXSdkDir, 'engine/systemres');
    const androidSystemResPath = path.join(aarPath, 'src/main/assets/arkui-x/systemres');
    isContinue = isContinue && copy(systemResPath, androidSystemResPath);
  });
  return isContinue;
}

function validateLibraryExist(fileType) {
  if (fileType === 'aar') {
    if (getAarName(projectDir).length == 0) {
      return false;
    }
  } else {
    if (getFrameworkName(projectDir).length == 0) {
      return false;
    }
  }
  return true;
}

function compilerModuleType(moduleListAll, fileType, moduleListSpecified, moduleType) {
  if (fileType === 'hap') {
    console.log(`Build hap successfully.`);
    copyHaptoOutput(moduleListSpecified);
    return true;
  } else if (fileType === 'apk' || fileType === 'app' ||
    fileType === 'framework' || fileType === 'xcframework') {
    return true;
  } else if (fileType === 'aar') {
    if (moduleType === 'Stage') {
      return copyStageBundleToAAR(moduleListAll);
    } else {
      return copyBundleToAAR(moduleListAll);
    }
  }
}

function compilerPackage(moduleListAll, fileType, cmd, moduleListSpecified) {
  if (isStageProject(path.join(projectDir, 'source/'))) {
    if (readConfig()
      && writeLocalProperties()
      && copyStageSourceToOhos(moduleListAll, 'main')
      && copyTestStageSourceToOhos(moduleListAll, fileType, cmd)
      && runGradle(fileType, cmd, moduleListSpecified, 'Stage')
      && copyStageBundleToAndroidAndIOS(moduleListSpecified)
      && copyTestStageBundleToAndroidAndIOS(moduleListSpecified, fileType, cmd)) {
      return compilerModuleType(moduleListAll, fileType, moduleListSpecified, 'Stage');
    }
  } else {
    if (readConfig()
      && writeLocalProperties()
      && copySourceToOhos(moduleListAll)
      && syncManifest(moduleListAll)
      && runGradle(fileType, cmd, moduleListSpecified, 'FA')
      && copyBundleToAndroidAndIOS(moduleListSpecified)
      && syncBundleName(moduleListAll)) {
      return compilerModuleType(moduleListAll, fileType, moduleListSpecified, 'Fa');
    }
  }
  console.error(`Compile failed.`);
  return false;
}

function compiler(fileType, cmd) {
  const moduleListInput = cmd.target;
  projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  if (fileType === 'aar' || fileType === 'framework' || fileType === 'xcframework') {
    const dir = fileType === 'xcframework' ? 'framework' : fileType;
    if (!validateLibraryExist(fileType)) {
      console.error(`Build ${fileType} failed.\nPlease check ${dir} existing.`);
      return false;
    }
  }
  const settingPath = path.join(projectDir, 'ohos/build-profile.json5');
  const moduleListAll = getModuleList(settingPath);
  if (moduleListAll == null || moduleListAll.length === 0) {
    console.error('There is no module in project.');
    return false;
  }
  currentSystem = getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('current system is unknown.');
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
  return compilerPackage(moduleListAll, fileType, cmd, moduleListSpecified);
}

module.exports = compiler;
