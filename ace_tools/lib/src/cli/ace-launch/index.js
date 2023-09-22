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
const exec = require('child_process').execSync;
const JSON5 = require('json5');
const { log, getBundleName } = require('../ace-log');
const { getToolByType, getAapt2 } = require('../ace-check/getTool');
const { isProjectRootDir, validInputDevice, getCurrentProjectSystem } = require('../util');
const { isSimulator } = require('../ace-devices/index');
let bundleName;
let packageName;
let ohosclassName;
let androidclassName;
let className;
let cmdOption;
let appPackagePath;
function getNames(projectDir, fileType, moduleName, installFilePath, bundleName) {
  moduleName = moduleName || 'entry';
  if (fileType === 'hap') {
    return getNameStageHaps(projectDir, moduleName);
  } else if (fileType === 'apk') {
    if (installFilePath) {
      return getNamesApkByInstallFile(moduleName, installFilePath, bundleName);
    } else {
      return getNamesApk(projectDir, moduleName);
    }
  } else if (fileType === 'app') {
    if (installFilePath) {
      return getNamesAppByInstallFile(installFilePath);
    } else {
      return getNamesApp(projectDir);
    }
  }
}

function getNamesApp(projectDir) {
  const appName = 'app.app';
  appPackagePath = path.join(projectDir, '.arkui-x/ios/build/outputs/app/', appName);
  return true;
}

function getNameStageHaps(projectDir, moduleName) {
  try {
    const ohosJsonPath = path.join(projectDir, moduleName, 'src/main/module.json5');
    const appJsonPath = path.join(projectDir, '/AppScope/app.json5');
    if (fs.existsSync(ohosJsonPath) && fs.existsSync(appJsonPath)) {
      ohosclassName = JSON5.parse(fs.readFileSync(ohosJsonPath)).module.abilities[0].name;
      bundleName = JSON5.parse(fs.readFileSync(appJsonPath)).app.bundleName;
      packageName = moduleName;
      if (!bundleName || !packageName || !ohosclassName) {
        console.error(`Please check bundleName, packageName and className in ${ohosJsonPath}.`);
        return false;
      }
      cmdOption = ``;
      className = ohosclassName;
      return true;
    }
    console.error(`Please check ${ohosJsonPath} or ${appJsonPath}.`);
    return false;
  } catch (err) {
    console.error('Read config.json failed.\n' + err);
    return false;
  }
}

function getNamesApk(projectDir, moduleName) {
  try {
    const androidXmlPath =
      path.join(projectDir, '.arkui-x/android/app/src/main/AndroidManifest.xml');
    const manifestPath = path.join(projectDir, 'AppScope/app.json5');
    if (fs.existsSync(androidXmlPath) && fs.existsSync(manifestPath)) {
      let xmldata = fs.readFileSync(androidXmlPath, 'utf-8');
      xmldata = xmldata.trim().split('\n');
      xmldata.forEach(element => {
        if (element.indexOf(`package="`) !== -1) {
          packageName = element.split('"')[1];
        }
        if (element.indexOf('<activity android:name') !== -1) {
          androidclassName = element.split('"')[1];
        }
      });
      bundleName = JSON5.parse(fs.readFileSync(manifestPath)).app.bundleName;
      androidclassName = '.' + moduleName.replace(/\b\w/g, function(l) {
        return l.toUpperCase();
      }) + 'EntryAbilityActivity';
      if (!bundleName || !packageName || !androidclassName) {
        console.error(`Please check packageName and className in ${androidXmlPath}, appID in ${manifestPath}.`);
        return false;
      }
      cmdOption = ' -a android.intent.action.MAIN -c android.intent.category.LAUNCHER';
      className = androidclassName;
      return true;
    }
    console.error(`Please check ${androidXmlPath}.`);
    return false;
  } catch (err) {
    console.error('Read androidManifest.xml failed.\n' + err);
    return false;
  }
}

function getNamesAppByInstallFile(installFilePath) {
  appPackagePath = installFilePath;
  return true;
}

function getNamesApkByInstallFile(moduleName, installFilePath, apkBundleName) {
  try {
    let aapt2 = getAapt2();
    if (aapt2 === '') {
      console.error('Can not get aapt from anfroid build tools. ');
      return false;
    }
    const getPackageNameCmd = `${aapt2} dump packagename ${installFilePath}`;
    packageName = exec(`${getPackageNameCmd}`, { encoding: 'utf8' }).trim();
    bundleName = apkBundleName;
    androidclassName = '.' + moduleName.replace(/\b\w/g, function (l) {
      return l.toUpperCase();
    }) + 'EntryAbilityActivity';
    if (!bundleName || !packageName || !androidclassName) {
      console.error(`Please check packageName , className or bundleName.`);
      return false;
    }
    cmdOption = ' -a android.intent.action.MAIN -c android.intent.category.LAUNCHER';
    className = androidclassName;
    return true;
  } catch (err) {
    console.error('Get names about apk failed.\n' + err);
    return false;
  }
}

function isPackageInAndroid(toolObj, device) {
  let comd = '';
  if ('adb' in toolObj) {
    const cmdPath = toolObj['adb'];
    const deviceOption = device ? `-s ${device}` : '';
    comd = `${cmdPath} ${deviceOption} shell pm list packages`;
  } else {
    console.error('Internal error with adb checking.');
    return false;
  }
  try {
    const result = exec(`${comd}`, { encoding: 'utf8' });
    if (!result.includes(packageName)) {
      console.log('Activity not exist.');
      return false;
    }
    return true;
  } catch (error) {
    console.log('Activity not exist.');
    return false;
  }
}

function launch(fileType, device, options) {
  const projectDir = process.cwd();
  const moduleName = options.target;
  if (!options.path && !isProjectRootDir(projectDir)) {
    return false;
  }
  if (!validInputDevice(device)) {
    return false;
  }
  const currentSystem = options.path ? ' ' : getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('current system is unknown.');
    return false;
  }
  const toolObj = getToolByType(fileType, currentSystem);
  if (toolObj === null || toolObj === undefined) {
    console.error('There are not install tool, please check');
    return false;
  }
  if (getNames(projectDir, fileType, moduleName, options.path, options.b) && toolObj) {
    if (fileType === 'apk' && !isPackageInAndroid(toolObj, device)) {
      console.error(`Launch ${fileType.toUpperCase()} failed.`);
      return false;
    }
    const cmdLaunch = getCmdLaunch(toolObj, device, options);
    if (!cmdLaunch) {
      return false;
    }
    try {
      if (options.test) {
        log(fileType, device, 'test', options.path);
      }
      const result = exec(`${cmdLaunch}`, { encoding: 'utf8' });
      if (result.toLowerCase().includes('fail')) {
        console.error(result);
        return false;
      }
      console.log(`Launch ${fileType.toUpperCase()} successfully.`);
      return true;
    } catch (error) {
      console.error(`Launch ${fileType.toUpperCase()} failed.`);
      console.log("you need to install the app first");
      return false;
    }
  } else {
    console.error(`Launch ${fileType.toUpperCase()} failed.`);
    return false;
  }
}

function getCmdLaunch(toolObj, device, options) {
  let cmdLaunch = '';
  if ('hdc' in toolObj) {
    const cmdPath = toolObj['hdc'];
    const deviceOption = device ? `-t ${device}` : '';
    cmdLaunch = `${cmdPath} ${deviceOption} shell aa start -a ${className} -m ${packageName} -b ${bundleName}`;
  } else if ('adb' in toolObj) {
    const cmdPath = toolObj['adb'];
    const deviceOption = device ? `-s ${device}` : '';
    let testOption = '';
    if (options.test) {
      testOption = getTestOption(options, '--es ');
    }
    cmdLaunch =
      `${cmdPath} ${deviceOption} shell am start -n "${bundleName}/${packageName}${className}" ${cmdOption} ${testOption}`;
  } else if ('ios-deploy' in toolObj) {
    if (isSimulator(device)) {
      const cmdPath = 'xcrun simctl launch';
      const deviceOption = device ? `${device}` : 'booted';
      const bundleName = getBundleName();
      cmdLaunch = `${cmdPath} ${deviceOption} ${bundleName}`;
    } else{
      const cmdPath = toolObj['ios-deploy'];
      const deviceOption = device ? `--id ${device}` : '';
      let testOption = '';
      if (options.test) {
        testOption = getTestOption(options, '');
      }
      cmdLaunch = `${cmdPath} ${deviceOption} --bundle ${appPackagePath} ${testOption} --no-wifi --justlaunch -m`;
    }
  } else {
    console.error('Internal error with hdc and adb checking.');
  }
  return cmdLaunch;
}

function getTestOption(options, esOption) {
  const cmdPrefix = esOption ? 'test test' : '--args "test';
  const cmdSuffix = esOption ? '' : '"';
  const testBundleName = `${esOption}bundleName ${options.b}`;
  const testModuleName = `${esOption}moduleName ${options.m}`;
  const unittest = `${esOption}unittest ${options.unittest}`;
  const testClass = options.class ? `${esOption}class ${options.class}` : '';
  const timeout = options.timeout ? `${esOption}timeout ${options.timeout}` : '';
  const testOption =
    `${esOption}${cmdPrefix} ${testBundleName} ${testModuleName} ${unittest} ${testClass} ${timeout}${cmdSuffix}`;
  return testOption;
}

module.exports = launch;
