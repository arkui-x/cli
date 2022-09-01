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

const { getToolByType } = require('../ace-check/getTool');
const { isProjectRootDir, validInputDevice, getCurrentProjectVersion } = require('../util');
let bundleName;
let packageName;
let ohosclassName;
let androidclassName;
let className;
let cmdOption;
function getNames(projectDir, fileType, moduleName) {
  moduleName = moduleName || 'entry';
  if (fileType === 'hap') {
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
        className = ohosclassName + 'ShellActivity';
        return true;
      }
      console.error(`Please check ${ohosJsonPath}.`);
      return false;
    } catch (err) {
      console.error('Read config.json failed.\n' + err);
      return false;
    }
  } else if (fileType === 'apk') {
    try {
      const androidXmlPath = path.join(projectDir, '/android', moduleName === 'entry' ? 'app' : moduleName, 'src/main/AndroidManifest.xml');
      const manifestPath = path.join(projectDir, '/source', moduleName === 'app' ? 'entry' : moduleName, 'manifest.json');
      if (fs.existsSync(androidXmlPath) && fs.existsSync(manifestPath)) {
        let xmldata = fs.readFileSync(androidXmlPath, 'utf-8');
        xmldata = xmldata.trim().split('\n');
        xmldata.forEach(element => {
          if (element.indexOf(`package="`) !== -1) {
            packageName = element.split('"')[1];
          }
          if (element.indexOf('<activity') !== -1) {
            androidclassName = element.split('"')[1];
          }
        });
        bundleName = JSON.parse(fs.readFileSync(manifestPath)).appID;
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
  } else if (fileType === 'app') {
    let version = getCurrentProjectVersion(projectDir);
    if (version == "") {
      console.log("project is not exists");
      return false;
    }
    let appName = version == "app" ? "jsapp.app" : "etsapp.app";
    bundleName = path.join(projectDir, '/ios/build/outputs/app/', appName);
    return true;
  }
}

function launch(fileType, device, moduleName) {
  if (!isProjectRootDir(process.cwd())) {
    return false;
  }
  const projectDir = process.cwd();
  const toolObj = getToolByType(fileType);
  if (toolObj == null || toolObj == undefined) {
    console.error('There are not install tool, please check');
    return false;
  }
  if (validInputDevice(device) && getNames(projectDir, fileType, moduleName) && toolObj) {
    let cmdPath;
    let deviceOption;
    let cmdLaunch = '';
    if ('hdc' in toolObj) {
      cmdPath = toolObj['hdc'];
      if (device) {
        deviceOption = `-t ${device}`;
      } else {
        deviceOption = '';
      }
      cmdLaunch = `${cmdPath} ${deviceOption} shell aa start -n "${bundleName}/${packageName}${className}" ${cmdOption}`;
    } else if ('adb' in toolObj) {
      cmdPath = toolObj['adb'];
      if (device) {
        deviceOption = `-s ${device}`;
      } else {
        deviceOption = '';
      }
      cmdLaunch = `${cmdPath} ${deviceOption} shell am start -n "${bundleName}/${packageName}${className}" ${cmdOption}`;
    } else if ('ios-deploy' in toolObj) {
      cmdPath = toolObj['ios-deploy'];
      if (device) {
        deviceOption = `--id ${device}`;
      } else {
        deviceOption = '';
      }
      cmdLaunch = `${cmdPath} ${deviceOption} --bundle ${bundleName} --no-wifi --justlaunch`;
    } else {
      console.error('Internal error with hdc and adb checking.');
      return false;
    }

    try {
      exec(`${cmdLaunch}`);
      console.log(`Launch ${fileType.toUpperCase()} successfully.`);
      return true;
    } catch (error) {
      console.error(`Lanuch ${fileType.toUpperCase()} failed.`);
      return false;
    }
  } else {
    console.error(`Lanuch ${fileType.toUpperCase()} failed.`);
    return false;
  }
}

module.exports = launch;
