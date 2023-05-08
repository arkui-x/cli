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

const { getToolByType } = require('../ace-check/getTool');
const { isProjectRootDir, validInputDevice, getCurrentProjectVersion, isStageProject,
  getCurrentProjectSystem } = require('../util');
let bundleName;
let packageName;
let ohosclassName;
let androidclassName;
let className;
let cmdOption;
let appPackagePath;
function getNames(projectDir, fileType, moduleName) {
  moduleName = moduleName || 'entry';
  if (fileType === 'hap') {
    return getNamesHaps(projectDir, moduleName);
  } else if (fileType === 'apk') {
    return getNamesApk(projectDir, moduleName);
  } else if (fileType === 'app') {
    return getNamesApp(projectDir);
  }
}

function getNamesApp(projectDir) {
  const version = getCurrentProjectVersion(projectDir);
  if (version == '') {
    console.log('project is not exists');
    return false;
  }
  let appName = '';
  if (isStageProject(path.join(projectDir, 'ohos'))) {
    appName = 'app.app';
  } else {
    appName = version == 'js' ? 'jsapp.app' : 'etsapp.app';
  }
  appPackagePath = path.join(projectDir, '/ios/build/outputs/app/', appName);
  return true;
}

function getNameStageHaps(projectDir, moduleName) {
  try {
    const ohosJsonPath = path.join(projectDir, '/ohos', moduleName, 'src/main/module.json5');
    const appJsonPath = path.join(projectDir, '/ohos/AppScope/app.json5');
    if (fs.existsSync(ohosJsonPath) && fs.existsSync(appJsonPath)) {
      ohosclassName = JSON.parse(fs.readFileSync(ohosJsonPath)).module.abilities[0].name;
      bundleName = JSON.parse(fs.readFileSync(appJsonPath)).app.bundleName;
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

function getNameFaHaps(projectDir, moduleName) {
  try {
    const ohosJsonPath = path.join(projectDir, '/ohos', moduleName, 'src/main/config.json');
    if (fs.existsSync(ohosJsonPath)) {
      const ohosJson = JSON.parse(fs.readFileSync(ohosJsonPath));
      bundleName = ohosJson.app.bundleName;
      packageName = ohosJson.module.package;
      ohosclassName = ohosJson.module.abilities[0].name;
      if (!bundleName || !packageName || !ohosclassName) {
        console.error(`Please check bundleName, packageName and className in ${ohosJsonPath}.`);
        return false;
      }
      cmdOption = ``;
      className = ohosclassName;
      return true;
    }
    console.error(`Please check ${ohosJsonPath}.`);
    return false;
  } catch (err) {
    console.error('Read config.json failed.\n' + err);
    return false;
  }
}

function getNamesHaps(projectDir, moduleName) {
  if (isStageProject(path.join(projectDir, 'ohos'))) {
    return getNameStageHaps(projectDir, moduleName);
  } else {
    return getNameFaHaps(projectDir, moduleName);
  }
}

function getNamesApk(projectDir, moduleName) {
  try {
    const androidXmlPath =
      path.join(projectDir, '/android/app/src/main/AndroidManifest.xml');
    let manifestPath;
    if (isStageProject(path.join(projectDir, 'ohos'))) {
      manifestPath =
        path.join(projectDir, 'ohos/AppScope/app.json5');
    } else {
      manifestPath =
        path.join(projectDir, '/source/entry/src/main',
          getCurrentProjectVersion(projectDir), 'MainAbility/manifest.json');
    }
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
      if (isStageProject(path.join(projectDir, 'ohos'))) {
        bundleName = JSON.parse(fs.readFileSync(manifestPath)).app.bundleName;
        androidclassName = '.' + moduleName.replace(/\b\w/g, function(l) {
          return l.toUpperCase();
        }) + 'MainActivity';
      } else {
        bundleName = JSON.parse(fs.readFileSync(manifestPath)).appID;
      }
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

function launch(fileType, device, moduleName) {
  const projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  const currentSystem = getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('current system is unknown.');
    return false;
  }
  const toolObj = getToolByType(fileType, currentSystem);
  if (toolObj == null || toolObj == undefined) {
    console.error('There are not install tool, please check');
    return false;
  }
  if (validInputDevice(device) && getNames(projectDir, fileType, moduleName) && toolObj) {
    if (fileType === 'apk' && !isPackageInAndroid(toolObj, device)) {
      console.error(`Launch ${fileType.toUpperCase()} failed.`);
      return false;
    }
    const cmdLaunch = getCmdLaunch(projectDir, toolObj, device);
    if (!cmdLaunch) {
      return false;
    }
    try {
      const result = exec(`${cmdLaunch}`, { encoding: 'utf8' });
      if (result.includes('Failure') || result.toLowerCase().includes('failed')) {
        console.error(result);
        return false;
      }
      console.log(`Launch ${fileType.toUpperCase()} successfully.`);
      return true;
    } catch (error) {
      console.error(`Launch ${fileType.toUpperCase()} failed.`);
      return false;
    }
  } else {
    console.error(`Launch ${fileType.toUpperCase()} failed.`);
    return false;
  }
}

function getCmdLaunch(projectDir, toolObj, device) {
  let cmdLaunch = '';
  if ('hdc' in toolObj) {
    const cmdPath = toolObj['hdc'];
    const deviceOption = device ? `-t ${device}` : '';
    if (isStageProject(path.join(projectDir, 'ohos'))) {
      cmdLaunch = `${cmdPath} ${deviceOption} shell aa start -a ${className} -m ${packageName} -b ${bundleName}`;
    } else {
      cmdLaunch = `${cmdPath} ${deviceOption} shell aa start -a ${packageName}${className} -b ${bundleName}`;
    }
  } else if ('adb' in toolObj) {
    const cmdPath = toolObj['adb'];
    const deviceOption = device ? `-s ${device}` : '';
    cmdLaunch =
      `${cmdPath} ${deviceOption} shell am start -n "${bundleName}/${packageName}${className}" ${cmdOption}`;
  } else if ('ios-deploy' in toolObj) {
    const cmdPath = toolObj['ios-deploy'];
    const deviceOption = device ? `--id ${device}` : '';
    cmdLaunch = `${cmdPath} ${deviceOption} --bundle ${appPackagePath} --no-wifi --justlaunch`;
  } else {
    console.error('Internal error with hdc and adb checking.');
  }
  return cmdLaunch;
}

module.exports = launch;
