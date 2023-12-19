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
const { getSdkVersion } = require('../../util/index');
const { copy } = require('../../ace-create/util');
const { updateCrossPlatformModules } = require('../../ace-create/module');
const { isProjectRootDir, getModuleList, getCurrentProjectSystem, getAarName, isAppProject,
  getCrossPlatformModules, modifyAndroidAbi, syncHvigor, getModulePathList } = require('../../util');
const { getOhpmTools } = require('../../ace-check/getTool');
const { openHarmonySdkDir, harmonyOsSdkDir, arkuiXSdkDir, ohpmDir, nodejsDir, javaSdkDirDevEco } = require('../../ace-check/configs');
const { setJavaSdkDirInEnv } = require('../../ace-check/checkJavaSdk');
const { copyLibraryToProject } = require('../ace-packager/copyLibraryToProject');
const analyze = require('../ace-analyze/index');

let projectDir;
let arkuiXSdkPath;
let currentSystem;
let modulePathList;

function readConfig() {
  try {
    if (currentSystem === 'HarmonyOS') {
      if (!harmonyOsSdkDir || !nodejsDir || !arkuiXSdkDir || !ohpmDir) {
        console.error(`Please check HarmonyOS SDK, ArkUI-X SDK, nodejs and ohpm in your environment.`);
        return false;
      }
    } else {
      if (!openHarmonySdkDir || !nodejsDir || !arkuiXSdkDir || !ohpmDir) {
        console.error(`Please check OpenHarmony SDK, ArkUI-X SDK, nodejs and ohpm in your environment.`);
        return false;
      }
    }
    const version = getSdkVersion(projectDir);
    arkuiXSdkPath = path.join(arkuiXSdkDir, String(version), 'arkui-x');
    return true;
  } catch (error) {
    console.error(`Please 'ace check' first.`);
    return false;
  }
}

function writeLocalProperties() {
  const filePath = path.join(projectDir, 'local.properties');
  const androidFilePath = path.join(projectDir, '.arkui-x/android/local.properties');
  fs.rmSync(androidFilePath, { recursive: true, force: true });
  let content = `nodejs.dir=${nodejsDir}\narkui-x.dir=${arkuiXSdkDir}`;
  if (currentSystem === 'HarmonyOS') {
    content += `\nhwsdk.dir=${harmonyOsSdkDir}`;
  } else {
    content += `\nsdk.dir=${openHarmonySdkDir}`;
  }
  return createLocalProperties(filePath, content);
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
    const src = path.join(projectDir, modulePathList[module], `build/default/intermediates/loader_out/${fileName}/ets`);
    const resindex = path.join(projectDir, modulePathList[module],
      `build/default/intermediates/res/${fileName}/resources.index`);
    const resPath = path.join(projectDir, modulePathList[module], `build/default/intermediates/res/${fileName}/resources`);
    const moduleJsonPath = path.join(projectDir, modulePathList[module],
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
    const src = path.join(projectDir, modulePathList[module], '/build/default/outputs/default');
    const filePath = copyToBuildDir(src);
    console.log(`File path: ${filePath}`);
  });
}

function copyBundletoBuild(moduleListSpecified, cmd) {
  let isContinue = true;
  const buildPath = path.join(projectDir, '.arkui-x/build/ace_assets');
  try {
    modifyAndroidAbi(projectDir, cmd);
    deleteOldFile(buildPath);
    moduleListSpecified.forEach(module => {
      // Now only consider one ability
      const src = path.join(projectDir, modulePathList[module], 'build/default/intermediates/loader_out/default/ets');
      const resindex = path.join(projectDir, modulePathList[module],
        'build/default/intermediates/res/default/resources.index');
      const resPath = path.join(projectDir, modulePathList[module], 'build/default/intermediates/res/default/resources');
      const moduleJsonPath = path.join(projectDir, modulePathList[module],
        'build/default/intermediates/res/default/module.json');

      const destClassName = module;
      const distAndroid = path.join(buildPath, 'android/', destClassName + '/ets');
      const resindexAndroid = path.join(buildPath, 'android/', destClassName + '/resources.index');
      const resPathAndroid = path.join(buildPath, 'android/', destClassName + '/resources');
      const moduleJsonPathAndroid = path.join(buildPath, 'android/', destClassName + '/module.json');
      const distIOS = path.join(buildPath, 'ios/', destClassName + '/ets');
      const resindexIOS = path.join(buildPath, 'ios/', destClassName + '/resources.index');
      const resPathIOS = path.join(buildPath, 'ios/', destClassName + '/resources');
      const moduleJsonPathIOS = path.join(buildPath, 'ios/', destClassName + '/module.json');

      fs.mkdirSync(distAndroid, { recursive: true });
      isContinue = isContinue && copy(src, distAndroid) && copy(resPath, resPathAndroid);
      fs.writeFileSync(resindexAndroid, fs.readFileSync(resindex));
      fs.writeFileSync(moduleJsonPathAndroid, fs.readFileSync(moduleJsonPath));
      fs.mkdirSync(distIOS, { recursive: true });
      isContinue = isContinue && copy(src, distIOS) && copy(resPath, resPathIOS);
      fs.writeFileSync(resindexIOS, fs.readFileSync(resindex));
      fs.writeFileSync(moduleJsonPathIOS, fs.readFileSync(moduleJsonPath));
    });
    const systemResPath = path.join(arkuiXSdkPath, 'engine/systemres');
    const bundleSystemResPath = path.join(buildPath, 'systemres');
    isContinue = isContinue && copy(systemResPath, bundleSystemResPath);
    isContinue = isContinue && copyLibsToBuild(moduleListSpecified, buildPath, cmd);
  } catch (err) {
    console.log(`Generate build directory failed\n`, err);
    return false;
  }
  console.log(`File path: ${buildPath}`);
  return isContinue;
}

function copyLibsToBuild(moduleListSpecified, buildPath, cmd) {
  let isContinue = true;
  try {
    fs.mkdirSync(path.join(buildPath, 'android/library'), { recursive: true });
    fs.mkdirSync(path.join(buildPath, 'ios/library'), { recursive: true });
    if (platform === Platform.MacOS) {
      const iosFramework = path.join(projectDir, '.arkui-x/ios/frameworks');
      copyLibraryToProject('ios', cmd, projectDir, 'ios');
      moduleListSpecified.forEach(module => {
        isContinue = isContinue && copy(iosFramework,
          path.join(buildPath, `ios/${module}/framework`), 'libarkui_ios.xcframework');
      });
      isContinue = isContinue && copy(path.join(iosFramework, 'libarkui_ios.xcframework'),
        path.join(buildPath, 'ios/library/libarkui_ios.xcframework'));
    }
    const androidLib = path.join(projectDir, '.arkui-x/android/app/libs');
    copyLibraryToProject('apk', cmd, projectDir, 'android');
    moduleListSpecified.forEach(module => {
      isContinue = isContinue && copy(androidLib,
        path.join(buildPath, `android/${module}/libs`), 'libarkui_android.so');
    });
    ['arm64-v8a', 'armeabi-v7a', 'x86_64'].forEach(item => {
      if (fs.existsSync(path.join(androidLib, item, 'libarkui_android.so'))) {
        fs.mkdirSync(path.join(buildPath, 'android/library', item), { recursive: true });
        fs.copyFileSync(path.join(androidLib, item, 'libarkui_android.so'),
          path.join(buildPath, 'android/library', item, 'libarkui_android.so'));
      }
    });
    return isContinue;
  } catch (err) {
    console.log(`copy library to build directory failed\n`, err);
    return false;
  }
}

function runGradle(fileType, cmd, moduleList) {
  let cmds = [`cd ${projectDir}`];
  const buildCmd = `./hvigorw`;
  const ohpmPath = getOhpmTools();
  if (!ohpmPath) {
    console.log('\x1B[31m%s\x1B[0m', 'Error: Ohpm tool is not available.');
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
    cmds.push(`${buildCmd} ${debugStr} -p product=default --mode module ${moduleStr} assembleHap --no-daemon`);
    gradleMessage = 'Building a HAP file...';
  } else if (fileType === 'apk' || fileType === 'ios' || fileType === 'aar' || fileType === 'ios-framework'
    || fileType === 'ios-xcframework' || fileType === 'bundle' || fileType === 'aab') {
    let moduleStr = '';
    if (moduleList) {
      moduleStr = ' -p module=' + moduleList.join(',');
    }
    let buildtarget = 'default@CompileArkTS' + moduleStr;
    let testbBuildtarget = '';
    if (cmd.debug && moduleList) {
      const moduleTestStr = '-p module=' + moduleList.join('@ohosTest,') + '@ohosTest';
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
  setJavaSdkDirInEnv(javaSdkDirDevEco);
  try {
    console.log(`${gradleMessage}`);
    exec(cmds, {
      encoding: 'utf-8',
      stdio: 'inherit',
      env: process.env
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
      console.error(`Failed to build the AAR file.\nPlease check ${aarPath} directory existing.`);
      return false;
    }
    deleteOldFile(path.join(aarPath, 'src/main/assets/arkui-x'));
    moduleList.forEach(module => {
      // Now only consider one ability
      const src = path.join(projectDir, modulePathList[module], 'build/default/intermediates/loader_out/default/ets');
      const resindex = path.join(projectDir, modulePathList[module],
        'build/default/intermediates/res/default/resources.index');
      const resPath = path.join(projectDir, modulePathList[module], 'build/default/intermediates/res/default/resources');
      const moduleJsonPath = path.join(projectDir, modulePathList[module],
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

function compilerPackage(crossPlatformModules, fileType, cmd, moduleListSpecified) {
  if (readConfig()
    && writeLocalProperties()
    && runGradle(fileType, cmd, moduleListSpecified)
    && copyStageBundleToAndroidAndIOS(crossPlatformModules)
    && copyTestStageBundleToAndroidAndIOS(crossPlatformModules, fileType, cmd)) {
    if (fileType === 'hap') {
      console.log(`HAP file built successfully.`);
      copyHaptoOutput(moduleListSpecified);
      if (cmd.analyze) {
        analyze(fileType);
      }
      return true;
    } else if (fileType === 'bundle') {
      console.log(`Build bundle successfully.`);
      return copyBundletoBuild(moduleListSpecified, cmd);
    } else if (fileType === 'apk' || fileType === 'ios' ||
      fileType === 'ios-framework' || fileType === 'ios-xcframework' || fileType === 'aab') {
      return true;
    } else if (fileType === 'aar') {
      return copyStageBundleToAAR(crossPlatformModules);
    }
  }
  console.error(`Compile failed.`);
  return false;
}

function compiler(fileType, cmd) {
  const moduleListInput = cmd.target;
  if ((platform !== Platform.MacOS) &&
    (fileType === 'ios' || fileType === 'ios-framework' || fileType === 'ios-xcframework')) {
    console.warn('\x1B[31m%s\x1B[0m', 'Error: ' + `Please go to your MacOS and build ${fileType}.`);
    return false;
  }
  projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  if (isAppProject(projectDir)) {
    const fileTypeDict = {
      'aab': 'Android App Bundle file',
      'aar': 'AAR file',
      'ios-framework': 'iOS framework',
      'ios-xcframework': 'iOS XCFramework',
      'apk': 'Android APK file',
      'bundle': 'bundle file',
      'ios': 'iOS APP file',
    }
    if (fileType === 'aar' || fileType === 'ios-framework' || fileType === 'ios-xcframework') {
      console.warn('\x1B[31m%s\x1B[0m', `Failed to build the ${fileTypeDict[fileType]}, because this project is not a library project.`);
      return false;
    }
  } else {
    if ((fileType === 'ios' || fileType === 'apk' || fileType === 'aab' || fileType === 'bundle')) {
      console.warn('\x1B[31m%s\x1B[0m', `Failed to build the ${fileTypeDict[fileType]}, because this project is not an application project.`);
      return false;
    }
  }
  if (!syncHvigor(projectDir)) {
    return false;
  }
  currentSystem = getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('current system is unknown.');
    return false;
  }
  updateCrossPlatformModules(currentSystem);
  const settingPath = path.join(projectDir, 'build-profile.json5');
  const moduleListAll = getModuleList(settingPath);
  modulePathList = getModulePathList(projectDir);
  if (moduleListAll === null || moduleListAll.length === 0 ||
    modulePathList === null || modulePathList.length === 0) {
    console.error('There is no module in project.');
    return false;
  }

  let crossPlatformModules = getCrossPlatformModules(projectDir);
  if (fileType !== 'hap' && (!crossPlatformModules || crossPlatformModules.length === 0)) {
    crossPlatformModules = moduleListAll;
  }

  let moduleListSpecified = fileType === 'hap' ? moduleListAll : crossPlatformModules;
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

  return compilerPackage(crossPlatformModules, fileType, cmd, moduleListSpecified);
}

module.exports = compiler;
