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
const JSON5 = require('json5');
const path = require('path');
const exec = require('child_process').execSync;
const {
  Platform,
  platform,
} = require('../../ace-check/platform');
const {
  createLocalProperties,
  copyToBuildDir,
} = require('../ace-build');
const { copy } = require('../../ace-create/util');
const { updateCrossPlatformModules } = require('../../ace-create/module');
const { isProjectRootDir, getModuleList, getCurrentProjectSystem, isAppProject, getCrossPlatformModules,
  modifyAndroidAbi, getModulePathList, getHspModuleList, validInputModule, getSdkVersion, setDevEcoSdkInEnv } = require('../../util');
const { getOhpmTools, getIntergrateHvigorw } = require('../../ace-check/getTool');
const { openHarmonySdkDir, harmonyOsSdkDir, arkuiXSdkDir, ohpmDir, nodejsDir, javaSdkDirDevEco,
  openHarmonySdkVersion, devEcoStudioDir } = require('../../ace-check/configs');
const { setJavaSdkDirInEnv } = require('../../ace-check/checkJavaSdk');
const { copyLibraryToProject } = require('../ace-packager/copyLibraryToProject');
const analyze = require('../ace-analyze/index');
const { createAndroidAndIosBuildArkTSShell } = require('../../ace-create/util');
const { getSourceArkuixPath } = require('../../ace-check/checkSource');

let projectDir;
let arkuiXSdkPath;
let currentSystem;
let modulePathList;

function readConfig() {
  try {
    return readConfigProcess();
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', `Please 'ace check' first.`, error);
    return false;
  }
}
function readConfigProcess() {
  let lackDir = arkuiXSdkDir ? '' : 'ArkUI-X SDK, ';
  lackDir += nodejsDir ? '' : 'nodejs, ';
  lackDir += ohpmDir ? '' : 'ohpm, ';
  if (currentSystem === 'HarmonyOS') {
    lackDir = (harmonyOsSdkDir ? '' : 'HarmonyOS SDK, ') + lackDir;
    if (!harmonyOsSdkDir || !nodejsDir || !arkuiXSdkDir || !ohpmDir) {
      let errorLog = `Please check ${lackDir}in your environment.`;
      errorLog = errorLog.replace(', in', ' in');
      console.error('\x1B[31m%s\x1B[0m', errorLog);
      return false;
    }
  } else {
    lackDir = (openHarmonySdkDir ? '' : 'OpenHarmony SDK, ') + lackDir;
    if (!openHarmonySdkDir || !nodejsDir || !arkuiXSdkDir || !ohpmDir) {
      let errorLog = `Please check ${lackDir}in your environment.`;
      errorLog = errorLog.replace(', in', ' in');
      console.error('\x1B[31m%s\x1B[0m', errorLog);
      return false;
    }
  }
  const version = getSdkVersion(projectDir);
  let arkuiXSdkVersion;
  let useArkuixMsg;
  if (getSourceArkuixPath()) {
    arkuiXSdkPath = getSourceArkuixPath();
    arkuiXSdkVersion = JSON.parse(fs.readFileSync(path.join(arkuiXSdkPath, 'arkui-x.json')))['version'];
    useArkuixMsg = `Use ArkUI-X source, Version ${arkuiXSdkVersion}`;
  } else {
    arkuiXSdkPath = path.join(arkuiXSdkDir, String(version), 'arkui-x');
    let arkuiXMessagePath = path.join(arkuiXSdkPath, 'arkui-x.json');
    if (!fs.existsSync(arkuiXSdkPath) || !fs.existsSync(arkuiXMessagePath)) {
        console.log('\x1B[31m%s\x1B[0m', `Error: The arkui-x sdk version "${version}" used by the current project does not exist. Please download it from DevEco->Settings->ArkUI-X!`);
        return false;
    }
    arkuiXSdkVersion = JSON.parse(fs.readFileSync(arkuiXMessagePath))['version'];
    useArkuixMsg = `Use ArkUI-X SDK, Version ${arkuiXSdkVersion}`;
  }
  console.log(useArkuixMsg);
  return true;
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

function copyStageBundleToAndroidAndIOS(moduleList, cmd) {
  let isContinue = true;
  const androidDir = isAppProject(projectDir) ? 'app' : 'library';
  deleteOldFile(path.join(projectDir, '.arkui-x/ios/arkui-x'));
  deleteOldFile(path.join(projectDir, `.arkui-x/android/${androidDir}/src/main/assets/arkui-x`));
  isContinue = copyStageBundleToAndroidAndIOSByTarget(moduleList, 'default', '', cmd);
  const systemResPath = path.join(arkuiXSdkPath, 'engine/systemres');
  const iosSystemResPath = path.join(projectDir, '.arkui-x/ios/arkui-x/systemres');
  const androidSystemResPath = path.join(projectDir, `.arkui-x/android/${androidDir}/src/main/assets/arkui-x/systemres`);
  isContinue = isContinue && copy(systemResPath, iosSystemResPath);
  isContinue = isContinue && copy(systemResPath, androidSystemResPath);
  const arkJsonPath = path.join(arkuiXSdkPath, 'arkui-x.json');
  const androidJsonPath = path.join(projectDir, `.arkui-x/android/${androidDir}/src/main/assets/arkui-x/arkui-x.json`);
  fs.writeFileSync(androidJsonPath, fs.readFileSync(arkJsonPath));
  return isContinue;
}

function copyTestStageBundleToAndroidAndIOS(moduleList, fileType, cmd) {
  let isContinue = true;
  if (!cmd.debug || fileType === 'hap' || fileType === 'hsp' || fileType === 'haphsp') {
    return isContinue;
  }
  isContinue = copyStageBundleToAndroidAndIOSByTarget(moduleList, 'ohosTest', '_test', cmd);
  return isContinue;
}

function copyStageBundleToAndroidAndIOSByTarget(moduleList, fileName, moduleOption, cmd) {
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
    const androidDir = isAppProject(projectDir) ? 'app' : 'library';
    const distAndroid = path.join(projectDir, `.arkui-x/android/${androidDir}/src/main/assets/arkui-x/`, destClassName + '/ets');
    const distIOS = path.join(projectDir, '.arkui-x/ios/arkui-x/', destClassName + '/ets');
    const resindexAndroid = path.join(projectDir, `.arkui-x/android/${androidDir}/src/main/assets/arkui-x/`,
      destClassName + '/resources.index');
    const resPathAndroid = path.join(projectDir, `.arkui-x/android/${androidDir}/src/main/assets/arkui-x/`,
      destClassName + '/resources');
    const moduleJsonPathAndroid = path.join(projectDir, `.arkui-x/android/${androidDir}/src/main/assets/arkui-x/`,
      destClassName + '/module.json');
    const resindexIOS = path.join(projectDir, '.arkui-x/ios/arkui-x/', destClassName + '/resources.index');
    const resPathIOS = path.join(projectDir, '.arkui-x/ios/arkui-x/', destClassName + '/resources');
    const moduleJsonPathIOS = path.join(projectDir, '.arkui-x/ios/arkui-x/', destClassName + '/module.json');
    fs.mkdirSync(distAndroid, { recursive: true });
    isContinue = isContinue && copy(src, distAndroid) && copy(resPath, resPathAndroid);
    fs.writeFileSync(resindexAndroid, fs.readFileSync(resindex));
    fs.writeFileSync(moduleJsonPathAndroid, fs.readFileSync(moduleJsonPath));
    fs.mkdirSync(distIOS, { recursive: true });
    isContinue = isContinue && copy(src, distIOS) && copy(resPath, resPathIOS);
    fs.writeFileSync(resindexIOS, fs.readFileSync(resindex));
    fs.writeFileSync(moduleJsonPathIOS, fs.readFileSync(moduleJsonPath));
    if (cmd && cmd.aot) {
      const aotPath = path.join(projectDir, modulePathList[module], `build/default/intermediates/loader_out/an`);
      const distAndroidAotPath = path.join(projectDir, '.arkui-x/android/app/src/main/assets/arkui-x/', destClassName + '/an');
      const distIOSAotPath = path.join(projectDir, '.arkui-x/ios/arkui-x/', destClassName + '/an');
      copy(aotPath, distAndroidAotPath);
      copy(aotPath, distIOSAotPath);
    }
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

function copyHapHsptoOutput(moduleListSpecified) {
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

function runGradle(fileType, cmd, moduleList, commonModule, testModule) {
  let cmds = [`cd ${projectDir}`];
  let buildCmd = `./hvigorw`;
  if (Number(getSdkVersion(projectDir)) >= 12) {
    if (getIntergrateHvigorw()) {
      buildCmd = `"${getIntergrateHvigorw()}"`;
    } else {
      console.error('\x1B[31m%s\x1B[0m', 'Run tasks failed, please donwload Intergration IDE to support compile api12 project.\n' +
        'if Intergration IDE has downloaded, please use ace config --deveco-studio-path [Intergration IDE Path] to set.\n');
      return false;
    }
  }
  const ohpmPath = getOhpmTools();
  if (!ohpmPath) {
    console.log('\x1B[31m%s\x1B[0m', 'Error: Ohpm tool is not available.');
    return false;
  }
  cmds.push(`"${ohpmPath}" install`);
  if (platform !== Platform.Windows && Number(getSdkVersion(projectDir)) < 12) {
    cmds.push(`chmod 755 hvigorw`);
  }
  let gradleMessage;
  if (fileType === 'hap') {
    let moduleStr = '';
    if (moduleList) {
      moduleStr = '-p module=' + moduleList.join(',');
    }
    let debugStr = '';
    if (cmd.debug) {
      debugStr = '-p buildMode=debug';
    }
    cmds.push(`${buildCmd} ${debugStr} -p product=default --mode module ${moduleStr} assembleHap --no-daemon --no-parallel`);
    gradleMessage = 'Building a HAP file...';
  } else if (fileType === 'haphsp') {
    const hspModuleList = getHspModuleList(projectDir);
    let hapModule = [];
    let hspModule = [];
    moduleList.forEach(module => {
      if (!hspModuleList.includes(module)) {
        hapModule.push(module);
      } else {
        hspModule.push(module);
      }
    });
    let debugStr = '';
    if (cmd.debug) {
      debugStr = '-p buildMode=debug';
    }
    cmds.push(`${buildCmd} ${debugStr} -p product=default --mode module -p module=${hapModule.join(',')} assembleHap --no-daemon --no-parallel`);
    if (hspModule.length !== 0) {
      cmds.push(`${buildCmd} ${debugStr} -p product=default --mode module -p module=${hspModule.join(',')} assembleHsp --no-daemon --no-parallel`);
    }
    gradleMessage = 'Building HAP/HSP files...';
  } else if (fileType === 'hsp') {
    let moduleStr = '';
    if (moduleList) {
      moduleStr = '-p module=' + moduleList.join(',');
    }
    cmds.push(`${buildCmd} -p product=default --mode module ${moduleStr} assembleHsp --no-daemon --no-parallel`);
    gradleMessage = 'Building a HSP file...';
  } else if (fileType === 'apk' || fileType === 'ios' || fileType === 'aar' || fileType === 'ios-framework' ||
    fileType === 'ios-xcframework' || fileType === 'bundle' || fileType === 'aab') {
    let moduleStr = '';
    if (commonModule) {
      moduleStr = ' -p module=' + commonModule.join(',');
    }
    const buildtarget = 'default@CompileArkTS --no-parallel' + moduleStr;
    let testbBuildtarget = '';
    if (cmd.debug && testModule) {
      const moduleTestStr = '-p module=' + testModule.join('@ohosTest,') + '@ohosTest';
      testbBuildtarget = `--mode module ${moduleTestStr} ohosTest@OhosTestCompileArkTS --no-parallel`;
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
      env: process.env,
    });
    if (cmd.aot) {
      if (currentSystem === 'HarmonyOS') {
        console.log('HarmonyOS not supported build AOT');
        return false;
      }
      buildAot(cmd, moduleList);
    }
    return true;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'Run tasks failed.\n', error);
    return false;
  }
}

function buildAot(cmd, moduleList) {
  const cmds = [];
  let arkAotCompilerPath;
  const openHarmonyVersion = getSdkVersion(projectDir);
  if (platform === Platform.Windows) {
    arkAotCompilerPath = path.join(openHarmonySdkDir, `${openHarmonyVersion}/ets/build-tools/ets-loader/bin/ark/build-win/bin/ark_aot_compiler.exe`);
  } else if (platform === Platform.Linux) {
    arkAotCompilerPath = path.join(openHarmonySdkDir, `${openHarmonyVersion}/ets/build-tools/ets-loader/bin/ark/build/bin/ark_aot_compiler`);
  } else if (platform === Platform.MacOS) {
    arkAotCompilerPath = path.join(openHarmonySdkDir, `${openHarmonyVersion}/ets/build-tools/ets-loader/bin/ark/build-mac/bin/ark_aot_compiler`);
  }

  let aotDir;
  const modulePathList = getModulePathList(projectDir);

  moduleList.forEach(module => {
    const targetFile = path.join(projectDir, `${modulePathList[module]}/build/default/intermediates/loader_out/default/ets/modules.abc`);
    let aotBuildCmd = `${arkAotCompilerPath}` +
      ` --compiler-target-triple=aarch64-unknown-linux-gnu --aot-file=${modulePathList[module]} --log-level=info --compiler-trace-deopt=true` +
      ` --compiler-trace-bc=true ${targetFile}`;
    aotDir = path.join(projectDir, `${modulePathList[module]}/build/default/intermediates/loader_out/an`);
    deleteOldFile(aotDir);
    if (cmd.targetPlatform) {
      let targetTriple;
      let abiDir;
      cmd.targetPlatform.split(',').forEach(abi => {
        if (abi === 'arm64') {
          targetTriple = 'aarch64-unknown-linux-gnu';
          abiDir = 'arm64-v8a';
        } else if (abi === 'arm') {
          targetTriple = 'arm-unknown-linux-gnu';
          abiDir = 'armeabi-v7a';
        } else if (abi === 'x86_64') {
          targetTriple = 'x86_64-unknown-linux-gnu';
          abiDir = 'x86_64';
        }

        aotBuildCmd = aotBuildCmd.replace('aarch64-unknown-linux-gnu', targetTriple);
        fs.mkdirSync(path.join(aotDir, abiDir), { recursive: true });
        cmds.push(`cd ${path.join(aotDir, abiDir)} &&  ${aotBuildCmd}`);
      });
    } else {
      fs.mkdirSync(path.join(aotDir, 'arm64-v8a'), { recursive: true });
      cmds.push(`cd ${path.join(aotDir, 'arm64-v8a')} && ${aotBuildCmd}`);
    }
  });

  let gradleMessage = 'AOT file built successfully.';
  let isBuildSuccess = true;
  console.log('Start building aot...');
  cmds.forEach(cmd => {
    if (platform === Platform.Windows) {
      cmd = cmd.replace(/\//g, '\\');
    }
    try {
      exec(cmd, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (error) {
      gradleMessage = 'Failed to build the AOT file.';
      isBuildSuccess = false;
    }
  });
  console.log(gradleMessage);
  return isBuildSuccess;
}

function compilerPackage(commonModule, fileType, cmd, moduleListSpecified, testModule) {
  if (readConfig() &&
    writeLocalProperties() &&
    runGradle(fileType, cmd, moduleListSpecified, commonModule, testModule) &&
    copyStageBundleToAndroidAndIOS(commonModule, cmd) &&
    copyTestStageBundleToAndroidAndIOS(testModule, fileType, cmd)) {
    process.env.ACEBUILDFLAG = true;
    if (fileType === 'hap' || fileType === 'haphsp') {
      console.log(`HAP file built successfully.`);
      copyHapHsptoOutput(moduleListSpecified);
      if (cmd.analyze) {
        analyze(fileType);
      }
      return true;
    } else if (fileType === 'hsp') {
      console.log(`HSP file built successfully.`);
      copyHapHsptoOutput(moduleListSpecified);
      return true;
    } else if (fileType === 'bundle') {
      console.log(`Build bundle successfully.`);
      return copyBundletoBuild(moduleListSpecified, cmd);
    } else if (fileType === 'apk' || fileType === 'aab' || fileType === 'ios') {
      createAndroidAndIosBuildArkTSShell(projectDir, getOhpmTools(), arkuiXSdkPath);
      return true;
    } else if (fileType === 'ios-framework' || fileType === 'ios-xcframework' || fileType === 'aar') {
      return true;
    }
  }
  console.error('\x1B[31m%s\x1B[0m', `Compile failed.`);
  return false;
}

function syncHvigor(projectDir) {
  let pathTemplate = path.join(__dirname, 'template');
  const hvigorJsonInfo = JSON5.parse(fs.readFileSync(path.join(projectDir, 'hvigor/hvigor-config.json5')));
  let proHvigorVersion;
  if (!('hvigorVersion' in hvigorJsonInfo)) {
    proHvigorVersion = JSON5.parse(fs.readFileSync(path.join(projectDir, '.hvigor/cache/meta.json'))).hvigorVersion;
  } else {
    proHvigorVersion = hvigorJsonInfo.hvigorVersion;
  }
  if (fs.existsSync(pathTemplate)) {
    const tempHvigorVersion = JSON5.parse(fs.readFileSync(
      path.join(pathTemplate, 'ohos_stage/hvigor/hvigor-config.json5'))).hvigorVersion;
    if (needCopyHvigor(proHvigorVersion, tempHvigorVersion)) {
      copy(path.join(pathTemplate, 'ohos_stage/hvigor'), path.join(projectDir, 'hvigor'));
    }
    return true;
  } else {
    pathTemplate = globalThis.templatePath;
    if (fs.existsSync(pathTemplate)) {
      const tempHvigorVersion = JSON5.parse(fs.readFileSync(
        path.join(pathTemplate, 'ohos_stage/hvigor/hvigor-config.json5'))).hvigorVersion;
      if (needCopyHvigor(proHvigorVersion, tempHvigorVersion)) {
        copy(path.join(pathTemplate, 'ohos_stage/hvigor'), path.join(projectDir, 'hvigor'));
      }
      return true;
    }
  }
  console.error('Error: Template is not exist!');
  return false;
}

function needCopyHvigor(currentVersion, tempVersion) {
  try {
    const currentVers = currentVersion.match(/(\d+)\.(\d+)\.(\d+).*/).slice(1, 4);
    const tempVers = tempVersion.match(/(\d+)\.(\d+)\.(\d+).*/).slice(1, 4);
    for (let i = 0; i < currentVers.length; i++) {
      if (parseInt(currentVers[i]) === parseInt(tempVers[i])) {
        continue;
      } else if (parseInt(currentVers[i]) < parseInt(tempVers[i])) {
        return true;
      } else {
        return false;
      }
    }
    return false;
  } catch (err) {
    return true;
  }
}

function compiler(fileType, cmd) {
  const moduleListInput = cmd.target;
  if (platform !== Platform.MacOS &&
    (fileType === 'ios' || fileType === 'ios-framework' || fileType === 'ios-xcframework')) {
    console.error('\x1B[31m%s\x1B[0m', `Error: Please go to your MacOS and build ${fileType}.`);
    return false;
  }
  projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  const fileTypeDict = {
    'aab': 'Android App Bundle file',
    'aar': 'AAR file',
    'ios-framework': 'iOS framework',
    'ios-xcframework': 'iOS XCFramework',
    'apk': 'Android APK file',
    'bundle': 'bundle file',
    'ios': 'iOS APP file',
  };
  if (isAppProject(projectDir)) {
    if (fileType === 'aar' || fileType === 'ios-framework' || fileType === 'ios-xcframework') {
      console.error('\x1B[31m%s\x1B[0m', `Failed to build the ${fileTypeDict[fileType]}, because this project is not a library project.`);
      return false;
    }
  } else {
    if (fileType === 'ios' || fileType === 'apk' || fileType === 'aab' || fileType === 'bundle') {
      console.error('\x1B[31m%s\x1B[0m', `Failed to build the ${fileTypeDict[fileType]}, because this project is not an application project.`);
      return false;
    }
  }
  const hspModuleList = getHspModuleList(projectDir);
  if (fileType === 'hsp' && hspModuleList.length === 0) {
    console.error('\x1B[31m%s\x1B[0m', `Build falied, no hsp module.`);
    return false;
  }
  const hvigorJsonInfo = JSON5.parse(fs.readFileSync(path.join(projectDir, 'hvigor/hvigor-config.json5')));
  if ('modelVersion' in hvigorJsonInfo) {
    setDevEcoSdkInEnv(devEcoStudioDir);
    if (!fs.existsSync(path.join(projectDir, 'local.properties'))) {
      writeLocalProperties();
    }
    if (!fs.existsSync(path.join(projectDir, '.hvigor/cache/meta.json'))) {
      let cmds = [`cd ${projectDir}`];
      cmds.push(`"${getIntergrateHvigorw()}" --sync`);
      cmds = cmds.join(' && ');
      if (platform === Platform.Windows) {
        cmds = cmds.replace(/\//g, '\\');
      }
      try {
        exec(cmds, {
          encoding: 'utf-8',
          stdio: 'inherit',
          env: process.env,
        });
      } catch (error) {
        console.error('\x1B[31m%s\x1B[0m', 'hvigorw sync failed.\n', error);
      }
    }
  } else {
    if (!syncHvigor(projectDir)) {
      return false;
    }
  }
  currentSystem = getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('\x1B[31m%s\x1B[0m', 'current system is unknown.');
    return false;
  }
  updateCrossPlatformModules(currentSystem);
  const moduleListAll = getModuleList(projectDir);
  modulePathList = getModulePathList(projectDir);
  if (moduleListAll === null || moduleListAll.length === 0 ||
    modulePathList === null || Object.keys(modulePathList).length === 0) {
    console.error('\x1B[31m%s\x1B[0m', 'There is no module in project.');
    return false;
  }

  const crossPlatformModules = getCrossPlatformModules(projectDir);
  if (!crossPlatformModules || crossPlatformModules.length === 0) {
    console.error('\x1B[31m%s\x1B[0m', 'There is no cross platform module in project.');
    return false;
  }
  let moduleListSpecified;
  if (moduleListInput) {
    moduleListSpecified = moduleListInput.split(',');
  } else {
    if (fileType === 'hap') {
      moduleListSpecified = moduleListAll.filter(element => !hspModuleList.includes(element));
    } else if (fileType === 'haphsp') {
      moduleListSpecified = moduleListAll;
    } else if (fileType === 'hsp') {
      moduleListSpecified = hspModuleList;
    } else {
      moduleListSpecified = crossPlatformModules;
    }
  }

  if (!validInputModule(projectDir, moduleListSpecified, fileType)) {
    return false;
  }

  const commonModule = moduleListSpecified.filter(element => crossPlatformModules.includes(element));
  const testModule = commonModule.filter(element => !hspModuleList.includes(element));
  return compilerPackage(commonModule, fileType, cmd, moduleListSpecified, testModule);
}

module.exports = compiler;
