/*
 * Copyright (c) 2022-2026 Huawei Device Co., Ltd.
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
const { xml2js } = require('xml-js');
const exec = require('child_process').execSync;
const JSON5 = require('json5');
const { log } = require('../ace-log');
const { getToolByType, getAapt } = require('../ace-check/getTool');
const { isProjectRootDir, validInputDevice, getCurrentProjectSystem, getIosProjectName,
  getModulePathList, getEntryModule, getModuleAbilityList, printRuntimeOSError, printToolCheckError, printError } = require('../util');
const { isSimulator, getIosMajorVersion } = require('../ace-devices/index');
const [iosDeployTool, xcrunDevicectlTool] = [1, 2];
let bundleName;
let packageName;
let ohosclassName;
let androidclassName;
let className;
let cmdOption;
let appPackagePath;
function getNames(projectDir, fileType, moduleName, installFilePath, bundleName) {
  const entryModule = getEntryModule(projectDir);
  moduleName = moduleName || entryModule;
  if (fileType === 'hap' || fileType === 'haphsp') {
    return getNameStageHaps(projectDir, moduleName);
  } else if (fileType === 'apk') {
    if (installFilePath) {
      return getNamesApkByInstallFile(moduleName, installFilePath, bundleName);
    } else {
      return getNamesApk(projectDir, moduleName);
    }
  } else if (fileType === 'ios') {
    if (installFilePath) {
      return getNamesAppByInstallFile(installFilePath);
    } else {
      return getNamesApp(projectDir);
    }
  }
}

function getNamesApp(projectDir) {
  const appName = getIosProjectName(projectDir);
  appPackagePath = path.join(projectDir, '.arkui-x/ios/build/outputs/app/', `${appName}.app`);
  return true;
}

function getNameStageHaps(projectDir, moduleName) {
  try {
    const modulePathList = getModulePathList(projectDir);
    const ohosJsonPath = path.join(projectDir, modulePathList[moduleName], 'src/main/module.json5');
    const appJsonPath = path.join(projectDir, '/AppScope/app.json5');
    if (fs.existsSync(ohosJsonPath) && fs.existsSync(appJsonPath)) {
      ohosclassName = JSON5.parse(fs.readFileSync(ohosJsonPath)).module.abilities[0].name;
      bundleName = JSON5.parse(fs.readFileSync(appJsonPath)).app.bundleName;
      packageName = moduleName;
      if (!bundleName || !packageName || !ohosclassName) {
        printError(`Please check bundleName, packageName and className in ${ohosJsonPath}.`, 'Required fields missing or invalid in the config file.', ['Verify bundleName, packageName, className in the file']);
        return false;
      }
      cmdOption = ``;
      className = ohosclassName;
      return true;
    }
    printError(`Please check ${ohosJsonPath} or ${appJsonPath}.`, 'module.json5 or app.json5 not found.', ['Ensure module.json5 (src/main/module.json5) and AppScope/app.json5 exist']);
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
      let activityList = [];
      let xmldata = fs.readFileSync(androidXmlPath, 'utf-8');
      const parsed = parseAndroidManifest(xmldata);
      packageName = parsed.packageName;
      activityList = parsed.activities;
      const moduleUpper = moduleName.replace(/\b\w/g, function(l) {
        return l.toUpperCase();
      });
      const abilityList = getModuleAbilityList(projectDir, moduleName);
      let launchAbility = '';
      if (abilityList.length > 0) {
        launchAbility = abilityList[0].split('_')[1];
      }
      if (activityList.includes(`.${moduleUpper}${launchAbility}Activity`)) {
        androidclassName = `.${moduleUpper}${launchAbility}Activity`;
      }
      bundleName = JSON5.parse(fs.readFileSync(manifestPath)).app.bundleName;
      packageName = packageName || bundleName;
      if (!bundleName || !packageName || !androidclassName) {
        printError(`Please check packageName and className in ${androidXmlPath}, appID in ${manifestPath}.`, 'Android config fields missing or invalid.', ['Verify packageName, className in the XML', 'appID in manifest']);
        return false;
      }
      cmdOption = ' -a android.intent.action.MAIN -c android.intent.category.LAUNCHER';
      className = androidclassName;
      return true;
    }
    printError(`Please check ${androidXmlPath}.`, 'AndroidManifest.xml not found.', ['Ensure .arkui-x/android/app/src/main/AndroidManifest.xml exists']);
    return false;
  } catch (err) {
    console.error('Read androidManifest.xml failed.\n' + err);
    return false;
  }
}

function parseAndroidManifest(xmlContent) {
  const result = {
    packageName: '',
    activities: []
  };
  const parsed = xml2js(xmlContent, { 
      compact: true,
      nativeType: true,
      ignoreDeclaration: true
    });
  if (!parsed) {
    console.error('\x1B[31m%s\x1B[0m', 'Parsing the AndroidManifest.xml file failed!');
    return result;
  }
  if (parsed?.manifest?._attributes?.package) {
    result.packageName = parsed.manifest._attributes.package;
  }
  const activity = parsed?.manifest?.application?.activity;
  if (!activity) {
    return result;
  }
  const activityList = Array.isArray(activity) ? activity : [activity];
  activityList.forEach(activity => {
    if (activity._attributes && activity._attributes?.['android:name']) {
      result.activities.push(activity._attributes['android:name']);
    }
  });
  return result;
}

function getNamesAppByInstallFile(installFilePath) {
  appPackagePath = installFilePath;
  return true;
}

function getNamesApkByInstallFile(moduleName, installFilePath, apkBundleName) {
  try {
    const aapt = getAapt();
    if (aapt === '') {
      console.error('\x1B[31m%s\x1B[0m', 'Can not get aapt from android build tools. ');
      return false;
    }
    const getPackageNameCmd = `${aapt} dump badging ${installFilePath}`;
    const apkData = exec(`${getPackageNameCmd}`, { encoding: 'utf8' }).trim().split('\n');
    apkData.forEach(element => {
      if (element.indexOf(`package: name=`) !== -1) {
        packageName = element.split("'")[1];
      }
    });
    bundleName = apkBundleName;
    androidclassName = '.' + moduleName.replace(/\b\w/g, function(l) {
      return l.toUpperCase();
    }) + 'EntryAbilityActivity';
    if (!bundleName || !packageName || !androidclassName) {
      printError('Please check packageName, className or bundleName.', 'Required identifier fields missing or invalid.', ['Verify packageName, className, bundleName in project config']);
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

function getIosSignName(projectDir) {
  const projfile = fs.readFileSync(path.join(projectDir, '.arkui-x/ios/app.xcodeproj/project.pbxproj')).toString().trim();
  const signName = projfile.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^"]*)/g);
  return signName[0].split('=')[1].split(';')[0].trim();
}

function getPathIosSignName(projectDir) {
  const projfile = fs.readFileSync(path.join(projectDir, 'Info.plist')).toString().trim();
  const match = projfile.match(/(?<=Sapp)(.*?)(?=S6\.0)/);
  if (match) {
    const bundleId = match[0].replace(/^[^a-zA-Z0-9.]+/, '');
    return bundleId.trim();
  } else {
    printError('No bundle ID found.', `Info.plist (${path.join(projectDir, 'Info.plist')}) does not contain the expected bundle ID pattern.`, ['Check Info.plist signing configuration', 'Ensure the app is properly signed in Xcode']);
    return '';
  }
}

function isPackageInAndroid(toolObj, device) {
  let comd = '';
  if ('adb' in toolObj) {
    const cmdPath = toolObj['adb'];
    const deviceOption = device ? `-s ${device}` : '';
    comd = `${cmdPath} ${deviceOption} shell pm list packages`;
  } else {
    printToolCheckError('adb');
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
  if (options.target && options.target.split(',').length > 1) {
    printError('Cannot launch multiple modules', 'More than one module specified in --target.', ["Use '--target <moduleName>' to specify a single module"]);
  }
  const moduleName = options.target;
  const fileTypeDict = {
    'ios': 'iOS APP',
    'apk': 'APK',
    'hap': 'HAP',
    'haphsp': 'HAP',
  };
  if (!options.path && !isProjectRootDir(projectDir)) {
    return false;
  }
  if (!validInputDevice(device)) {
    return false;
  }
  const currentSystem = options.path ? ' ' : getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    printRuntimeOSError();
    return false;
  }
  const toolObj = getToolByType(fileType, currentSystem);
  if (toolObj === null || toolObj === undefined) {
    console.error('\x1B[31m%s\x1B[0m', 'There are not install tool, please check');
    return false;
  }
  if (getNames(projectDir, fileType, moduleName, options.path, options.b) && toolObj) {
    if (fileType === 'apk' && !isPackageInAndroid(toolObj, device)) {
      console.error('\x1B[31m%s\x1B[0m', `Launch ${fileType.toUpperCase()} failed.`);
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
      console.log(`${fileTypeDict[fileType]} launched.`);
      return true;
    } catch (error) {
      console.error('\x1B[31m%s\x1B[0m', `${fileTypeDict[fileType]} launched failed.`);
      console.log('you need to install the app first');
      return false;
    }
  } else {
    console.error('\x1B[31m%s\x1B[0m', `${fileTypeDict[fileType]} launched failed.`);
    return false;
  }
}

function getCmdLaunch(toolObj, device, options) {
  let cmdLaunch = '';
  if (isSimulator(device)) {
    const cmdPath = 'xcrun simctl launch';
    const deviceOption = device ? `${device}` : 'booted';
    const bundleName = getIosSignName(process.cwd());
    cmdLaunch = `${cmdPath} ${deviceOption} ${bundleName}`;
  } else if ('hdc' in toolObj) {
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
  } else if ('xcrun devicectl' in toolObj && getIosMajorVersion(device) >= 17) {
    const cmdPath = `${toolObj['xcrun devicectl']} device process launch`;
    const deviceOption = device ? `-d ${device}` : '';
    let testOption = '';
    if (options.test) {
      testOption = getTestOption(options, '', xcrunDevicectlTool);
    }
    if (options.skipInstall || options.path) {
      cmdLaunch = `${cmdPath} ${deviceOption} ${getPathIosSignName(options.path)} --terminate-existing ${testOption}`;
    } else {
      cmdLaunch = `${cmdPath} ${deviceOption} ${getIosSignName(process.cwd())} --terminate-existing ${testOption}`;
    }
  } else if ('ios-deploy' in toolObj && getIosMajorVersion(device) < 17) {
    const cmdPath = `${toolObj['ios-deploy']}`;
    const deviceOption = device ? `--id ${device}` : '';
    let testOption = '';
    if (options.test) {
      testOption = getTestOption(options, '', iosDeployTool);
    }
    cmdLaunch = `${cmdPath} ${deviceOption} --bundle ${appPackagePath} ${testOption} --no-wifi --justlaunch -m`;
  } else {
    printError(`Internal error with hdc, adb, ios-deploy and Xcode's version checking.`, 'One or more tools not found in the configured SDK.', ['Run ace config to set SDK paths (--harmonyos-sdk/--openharmony-sdk/--android-sdk)', "Run 'ace check -v' to verify"]);
  }
  return cmdLaunch;
}

function getTestOption(options, esOption, toolType = undefined) {
  const cmdPrefix = esOption ? 'test test' : toolType === iosDeployTool ? '--args "test' : '-e test';
  const cmdSuffix = toolType !== iosDeployTool ? '' : '"';
  const testBundleName = `${esOption}bundleName ${options.b}`;
  const testModuleName = `${esOption}moduleName ${options.m}`;
  const unittest = `${esOption}unittest ${options.unittest}`;
  const testClass = options.class ? `${esOption}class ${options.class}` : '';
  if (!options.timeout) {
    options.timeout = 5000;
  }
  if (!options.socket) {
    options.socket = -1;
  } else if (options.socket === true) {
    options.socket = 8017;
  }
  const timeout = options.timeout ? `${esOption}timeout ${options.timeout}` : '';
  const socket = options.socket ? `${esOption}socket ${options.socket}` : '';
  const testOption =
    `${esOption}${cmdPrefix} ${testBundleName} ${testModuleName} ${socket} ` + 
    `${unittest} ${testClass} ${timeout}${cmdSuffix}`;
  return testOption;
}

module.exports = launch;
