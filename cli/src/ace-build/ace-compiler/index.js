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
  createLocalProperties,
  copyToBuildDir
} = require('../ace-build');
const { copy } = require('../../ace-create/util');
const { isProjectRootDir, getModuleList, getCurrentProjectSystem, getAarName, isAppProject } = require('../../util');
const { getOhpmTools } = require('../../ace-check/getTool');
const { openHarmonySdkDir, harmonyOsSdkDir, arkuiXSdkDir, ohpmDir ,nodejsDir} = require('../../ace-check/configs');

let projectDir;
let arkuiXSdkPath;
let uiSyntax;
let currentSystem;

function readConfig() {
  try {
    if (currentSystem === HarmonyOS) {
      if (!harmonyOsSdkDir || !nodejsDir || !arkuiXSdkDir || !ohpmDir) {
        console.error(`Please check HarmonyOS Sdk, ArkUI-X SDK, nodejs and ohpm in your environment.`);
        return false;
      }
    } else {
      if (!openHarmonySdkDir || !nodejsDir || !arkuiXSdkDir || !ohpmDir) {
        console.error(`Please check OpenHarmony Sdk, ArkUI-X SDK, nodejs and ohpm in your environment.`);
        return false;
      }
    }
    arkuiXSdkPath = path.join(arkuiXSdkDir, '10','arkui-x');
    return true;
  } catch (error) {
    console.error(`Please 'ace check' first.`);
    return false;
  }
}

function writeLocalProperties() {
  const filePath = path.join(projectDir, 'local.properties');
  let content = `nodejs.dir=${nodejsDir}\narkui-x.dir=${arkuiXSdkDir}`;
  if (currentSystem === HarmonyOS) {
    content += `\nhwsdk.dir=${harmonyOsSdkDir}`;
  } else {
    content += `\nsdk.dir=${openHarmonySdkDir}`;
  }
  return createLocalProperties(filePath, content);
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

function copyStageBundleToAndroidAndIOS(moduleList) {
  let isContinue = true;
  deleteOldFile(path.join(projectDir, '.arkui-x/ios/arkui-x'));
  deleteOldFile(path.join(projectDir, '.arkui-x/android/app/src/main/assets/arkui-x'));
  isContinue = copyStageBundleToAndroidAndIOSByTarget(moduleList, 'default', '');
  const systemResPath = path.join(arkuiXSdkPath, 'engine/systemres');
  const iosSystemResPath = path.join(projectDir, '.arkui-x/ios/arkui-x/systemres');
  const androidSystemResPath = path.join(projectDir, '.arkui-x/android/app/src/main/assets/arkui-x/systemres');
  isContinue = isContinue && copy(systemResPath, iosSystemResPath);
  if (isAppProject(projectDir)) {
    isContinue = isContinue && copy(systemResPath, androidSystemResPath);
  }
  return isContinue;
}

function copyTestStageBundleToAndroidAndIOS(moduleList, fileType, cmd) {
  let isContinue = true;
  if (!cmd.debug || fileType === 'hap' || !fileType) {
    return isContinue;
  }
  isContinue = copyStageBundleToAndroidAndIOSByTarget(moduleList, 'ohosTest', '_test');
  return isContinue;
}

function copyStageBundleToAndroidAndIOSByTarget(moduleList, fileName, moduleOption) {
  let isContinue = true;
  moduleList.forEach(module => {
    // Now only consider one ability
    const src = path.join(projectDir, module, `build/default/intermediates/loader_out/${fileName}/ets`);
    const resindex = path.join(projectDir, module,
      `build/default/intermediates/res/${fileName}/resources.index`);
    const resPath = path.join(projectDir, module, `build/default/intermediates/res/${fileName}/resources`);
    const moduleJsonPath = path.join(projectDir, module,
      `build/default/intermediates/res/${fileName}/module.json`);
    const destClassName = module + moduleOption;
    const distAndroid = path.join(projectDir, '.arkui-x/android/app/src/main/assets/arkui-x/', destClassName + '/ets');

    const distIOS = path.join(projectDir, '.arkui-x/ios/arkui-x/', destClassName + '/ets');
    const resindexAndroid = path.join(projectDir, '.arkui-x/android/app/src/main/assets/arkui-x/',
      destClassName + '/resources.index');
    const resPathAndroid = path.join(projectDir, '.arkui-x/android/app/src/main/assets/arkui-x/',
      destClassName + '/resources');
    const moduleJsonPathAndroid = path.join(projectDir, '.arkui-x/android/app/src/main/assets/arkui-x/',
      destClassName + '/module.json');
    const resindexIOS = path.join(projectDir, '.arkui-x/ios/arkui-x/', destClassName + '/resources.index');
    const resPathIOS = path.join(projectDir, '.arkui-x/ios/arkui-x/', destClassName + '/resources');
    const moduleJsonPathIOS = path.join(projectDir, '.arkui-x/ios/arkui-x/', destClassName + '/module.json');
    if (isAppProject(projectDir)) {
      fs.mkdirSync(distAndroid, { recursive: true });
      isContinue = isContinue && copy(src, distAndroid) && copy(resPath, resPathAndroid);
      fs.writeFileSync(resindexAndroid, fs.readFileSync(resindex));
      fs.writeFileSync(moduleJsonPathAndroid, fs.readFileSync(moduleJsonPath));
    }
    fs.mkdirSync(distIOS, { recursive: true });
    isContinue = isContinue && copy(src, distIOS) && copy(resPath, resPathIOS);
    fs.writeFileSync(resindexIOS, fs.readFileSync(resindex));
    fs.writeFileSync(moduleJsonPathIOS, fs.readFileSync(moduleJsonPath));
  });
  return isContinue;
}

function deleteOldFile(deleteFilePath) {
  try {
    if (fs.existsSync(deleteFilePath) && !deleteFilePath.includes(path.join('arkui-x', 'systemres'))) {
      const files = fs.readdirSync(deleteFilePath);
      files.forEach(function (file, index) {
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
    const src = path.join(projectDir, module, '/build/default/outputs/default');
    const filePath = copyToBuildDir(src);
    console.log(`filepath: ${filePath}`);
  });
}

function runGradle(fileType, cmd, moduleList) {
  let cmds = [`cd ${projectDir}`];
  const buildCmd = `./hvigorw`;
  const ohpmPath = getOhpmTools();
  if (!ohpmPath) {
    console.log('\x1B[31m%s\x1B[0m', "Error: Ohpm tool is not available.")
    return false;
  }
  cmds.push(`${ohpmPath} install`);
  if (platform !== Platform.Windows) {
    cmds.push(`chmod 755 hvigorw`);
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
    let buildtarget = 'default@CompileArkTS';
    let testbBuildtarget = '';
    if (cmd.debug && moduleList) {
      let moduleTestStr = '-p module=' + moduleList.join('@ohosTest,') + '@ohosTest';
      testbBuildtarget = `--mode module ${moduleTestStr} ohosTest@OhosTestCompileArkTS`;
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
    console.error('Run tasks failed.\n', error);
    return false;
  }
}

function copyStageBundleToAAR(moduleList) {
  const aarNameList = getAarName(projectDir);
  let isContinue = true;
  aarNameList.forEach(aarName => {
    const aarPath = path.join(projectDir, '.arkui-x/android', aarName);
    if (!fs.existsSync(aarPath)) {
      console.error(`Build aar failed.\nPlease check ${aarPath} directory existing.`);
      return false;
    }
    deleteOldFile(path.join(aarPath, 'src/main/assets/arkui-x'));
    moduleList.forEach(module => {
      // Now only consider one ability
      const src = path.join(projectDir, module, 'build/default/intermediates/loader_out/default/ets');
      const resindex = path.join(projectDir, module,
        'build/default/intermediates/res/default/resources.index');
      const resPath = path.join(projectDir, module, 'build/default/intermediates/res/default/resources');
      const moduleJsonPath = path.join(projectDir, module,
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
    const systemResPath = path.join(arkuiXSdkPath, 'engine/systemres');
    const androidSystemResPath = path.join(aarPath, 'src/main/assets/arkui-x/systemres');
    isContinue = isContinue && copy(systemResPath, androidSystemResPath);
  });
  return isContinue;
}

function compilerPackage(moduleListAll, fileType, cmd, moduleListSpecified) {
  if (readConfig()
    && writeLocalProperties()
    // && copyStageSourceToOhos(moduleListAll, 'main')
    // && copyTestStageSourceToOhos(moduleListAll, fileType, cmd)
    && runGradle(fileType, cmd, moduleListSpecified)
    && copyStageBundleToAndroidAndIOS(moduleListSpecified)
    && copyTestStageBundleToAndroidAndIOS(moduleListSpecified, fileType, cmd)) {
    if (fileType === 'hap') {
      console.log(`Build hap successfully.`);
      copyHaptoOutput(moduleListSpecified);
      return true;
    } else if (fileType === 'apk' || fileType === 'app' ||
      fileType === 'framework' || fileType === 'xcframework') {
      return true;
    } else if (fileType === 'aar') {
      return copyStageBundleToAAR(moduleListAll);
    }
  }
  console.error(`Compile failed.`);
  return false;
}

function compiler(fileType, cmd) {
  const moduleListInput = cmd.target;
  if ((platform !== Platform.MacOS) &&
  (fileType === 'app' || fileType === 'framework' || fileType === 'xcframework')) {
    console.warn('\x1B[31m%s\x1B[0m', 'Warning: ' + `Please go to your MacOS and build ${fileType}.`);
    return false;
  }
  projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  if (isAppProject(projectDir)) {
    if (fileType === 'aar' || fileType === 'framework' || fileType === 'xcframework') {
      console.warn('\x1B[31m%s\x1B[0m', `Build ${fileType} failed, current project is not library project.`);
      return false;
    }
  } else {
    if ((fileType === 'app' || fileType === 'apk') && (!isAppProject(projectDir))) {
      console.warn('\x1B[31m%s\x1B[0m', `Build ${fileType} failed, current project is not application project.`);
      return false;
    }
  }
  const settingPath = path.join(projectDir, 'build-profile.json5');
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
