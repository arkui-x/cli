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
const inquirer = require('inquirer');
const { copy } = require('../project');
const { getModuleList, getCurrentProjectVersion, getManifestPath } = require('../../util');

let projectDir;

function checkCurrentDir(currentDir) {
  if (path.basename(currentDir) === 'source') {
    return true;
  }
  return false;
}

function checkModuleName(moduleList, moduleName) {
  if (!moduleName) {
    console.error('Module name must be required!');
    return false;
  }
  const sensitiveWords = ['ohos', 'android', 'source'];
  if (sensitiveWords.includes(moduleName)) {
    console.error('Module name is invalid');
    return false;
  }
  if (!moduleName.match(/^\w+$/)) {
    console.error('The Module name can contain only letters, digits, and underscores(_).');
    return false;
  }
  if (fs.existsSync(path.join(projectDir, 'ohos', moduleName)) ||
    fs.existsSync(path.join(projectDir, 'source', moduleName))) {
    console.error(`${moduleName} already exists.`);
    return false;
  }
  for (let index = 0; index < moduleList.length; index++) {
    if (moduleList[index] === moduleName) {
      console.error(`${moduleName} already exists.`);
      return false;
    }
  }
  return true;
}

function createInSource(moduleName, templateDir, appVer) {
  let src;
  const dest = path.join(projectDir, 'source', moduleName);
  if (appVer == 'js') {
    src = path.join(templateDir, 'js_fa/source/entry');
  } else {
    src = path.join(templateDir, 'ets_fa/source/entry');
  }
  try {
    fs.mkdirSync(dest, { recursive: true });
    return copy(src, dest);
  } catch (error) {
    console.error('Error occurs when create in source.');
    return false;
  }
}

function createInOhos(moduleName, templateDir) {
  const dest = path.join(projectDir, `ohos/${moduleName}/`);
  let src = path.join(templateDir, 'ohos_fa/entry');
  try {
    fs.mkdirSync(dest, { recursive: true });
    return copy(src, dest);
  } catch (error) {
    console.error('Error occurs when create in ohos');
    return false;
  }
}

function checkActivityNameExist(fileNames, checkActivityName) {
  let existFlag = false;
  fileNames.forEach((fileName) => {
    if (fileName == checkActivityName) {
      existFlag = true;
    }
  });
  return existFlag;
}

function getNextAndroidActivityName(srcPath) {
  const startIndex = 2;
  const defaultName = 'MainActivity';
  const suffix = '.java';
  const fileNames = fs.readdirSync(srcPath);
  let index = startIndex;
  let activityName = defaultName + String(index) + suffix;

  while (checkActivityNameExist(fileNames, activityName)) {
    index++;
    activityName = defaultName + String(index) + suffix;
  }
  return defaultName + String(index);
}

function createInAndroid(moduleName, templateDir, appVer) {
  const packageName = getPackageName(appVer);
  const packageArray = packageName.split('.');
  let aceVersion = appVer == "js" ? "VERSION_JS" : "VERSION_ETS";
  let src = path.join(templateDir, 'android/app/src/main/java');
  try {
    const templateFileName = 'MainActivity.java'
    let dest = path.join(projectDir, 'android/app/src/main/java');
    packageArray.forEach(pkg => {
      dest = path.join(dest, pkg);
    });
    const srcFile = path.join(src, templateFileName);
    const destClassName = getNextAndroidActivityName(dest);
    const destFileName = destClassName + '.java';
    const destFilePath = path.join(dest, destFileName);
    fs.writeFileSync(destFilePath, fs.readFileSync(srcFile));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('MainActivity', 'g'), destClassName));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('ArkUIInstanceName', 'g'),
        moduleName.toLowerCase() + '_MainAbility'));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('ACE_VERSION', 'g'), aceVersion));
    let createActivityXmlInfo =
      '    <activity \n' +
      '            android:name=".' + destClassName + '"\n' +
      '        android:exported="false" />\n    ';
    let curManifestXmlInfo =
      fs.readFileSync(path.join(projectDir, 'android/app/src/main/AndroidManifest.xml')).toString();
    let insertIndex = curManifestXmlInfo.lastIndexOf('</application>');
    let updateManifestXmlInfo = curManifestXmlInfo.slice(0, insertIndex) +
      createActivityXmlInfo +
      curManifestXmlInfo.slice(insertIndex);
    fs.writeFileSync(path.join(projectDir, 'android/app/src/main/AndroidManifest.xml'), updateManifestXmlInfo);

    return true;
  } catch (error) {
    console.error('Error occurs when create in android', error);
    return false;
  }
}

function replaceInOhos(moduleName, appName, packageName, bundleName, appVer) {
  const stringJsonPath = path.join(projectDir, 'ohos', moduleName, 'src/main/resources/base/element/string.json');
  fs.writeFileSync(stringJsonPath,
    fs.readFileSync(stringJsonPath).toString().replace('appName', appName));
  const configJsonPath = path.join(projectDir, 'ohos', moduleName, 'src/main/config.json');
  const configJsonObj = JSON.parse(fs.readFileSync(configJsonPath));
  configJsonObj.app.bundleName = bundleName;
  configJsonObj.module.package = packageName;
  configJsonObj.module.name = '.MyApplication';
  configJsonObj.module.distro.moduleName = moduleName;
  configJsonObj.module.abilities[0].srcLanguage = appVer;
  delete (configJsonObj.module.abilities[0]['skills']);
  if (moduleName == 'entry') {
    configJsonObj.module.distro.moduleType = 'entry';
  } else {
    configJsonObj.module.distro.moduleType = 'feature';
  }
  if (appVer == 'js') {
    delete (configJsonObj.module.js[0]['mode']);
  }
  fs.writeFileSync(configJsonPath, JSON.stringify(configJsonObj, '', '  '));
  if (moduleName === 'entry') {
    const testJsonPath = path.join(projectDir, 'ohos', moduleName, 'src/ohosTest/config.json');
    const testJsonObj = JSON.parse(fs.readFileSync(testJsonPath));
    testJsonObj.module.bundleName = bundleName;
    testJsonObj.module.package = packageName;
    testJsonObj.module.distro.moduleName = moduleName + '_test';
    fs.writeFileSync(testJsonPath, JSON.stringify(testJsonObj, '', '  '));
  }
}

function getPackageName(appVer) {
  try {
    const manifestPath = path.join(projectDir, 'source/entry/src/main', appVer, 'MainAbility/manifest.json');
    const manifestJsonObj = JSON.parse(fs.readFileSync(manifestPath));
    return manifestJsonObj.appID;
  } catch (error) {
    console.error('Get package name error.');
    return '';
  }
}

function getAppNameForModule(appVer) {
  try {
    const manifestPath = path.join(projectDir, 'source/entry/src/main', appVer, 'MainAbility/manifest.json');
    const manifestJsonObj = JSON.parse(fs.readFileSync(manifestPath));
    return manifestJsonObj.appName;
  } catch (error) {
    console.error('Get app name error.');
    return '';
  }
}

function replaceProjectInfo(moduleName, appVer) {
  try {
    const packageName = 'com.example.' + moduleName.toLowerCase();
    let appName = getAppNameForModule(appVer);
    if (appName == '') {
      return false;
    }
    const bundleName = JSON.parse(fs.readFileSync(getManifestPath(projectDir))).appID;
    const jsonPath = path.join(projectDir, 'source', moduleName, 'src/main', appVer, 'MainAbility/manifest.json');
    const jsonObj = JSON.parse(fs.readFileSync(jsonPath));
    jsonObj.appID = bundleName;
    jsonObj.appName = appName;
    fs.writeFileSync(jsonPath, JSON.stringify(jsonObj, '', '  '));
    replaceInOhos(moduleName, appName, packageName, bundleName, appVer);
    const settingPath = path.join(projectDir, 'ohos/build-profile.json5');

    if (fs.existsSync(settingPath)) {
      let buildProfileInfo = JSON.parse(fs.readFileSync(settingPath).toString());
      let moduleInfo = {
        "name": moduleName,
        "srcPath": "./" + moduleName,
        "targets": [
          {
            "name": "default",
            "applyToProducts": [
              "default"
            ]
          }
        ]
      };
      buildProfileInfo.modules.push(moduleInfo);
      fs.writeFileSync(settingPath, JSON.stringify(buildProfileInfo, '', '  '));
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Replace project info error.');
    return false;
  }
}

function createModule() {
  if (!checkCurrentDir(process.cwd())) {
    console.error(`Please go to source directory under ace project path and create module again.`);
    return false;
  }
  projectDir = path.join(process.cwd(), '..');
  const appVer = getCurrentProjectVersion(projectDir);
  if (appVer == '') {
    console.log("project is not exists");
    return false;
  }
  let templateDir = path.join(__dirname, 'template');
  if (!fs.existsSync(templateDir)) {
    templateDir = path.join(__dirname, '../../../templates');
  }
  const settingPath = path.join(projectDir, 'ohos/build-profile.json5');
  const moduleList = getModuleList(settingPath);
  if (moduleList == null) {
    console.error('Create module failed');
    return false;
  } else if (moduleList.length == 0) {
    console.log(moduleList);
    if (createInSource('entry', templateDir, appVer) &&
      createInOhos('entry', templateDir) &&
      createInAndroid('entry', templateDir, appVer)) {
      return replaceProjectInfo('entry', appVer);
    }
  } else {
    const question = [{
      name: 'moduleName',
      type: 'input',
      message: 'Please enter the module name:',
      validate(val) {
        return checkModuleName(moduleList, val);
      }
    }];
    inquirer.prompt(question).then(answers => {
      if (createInSource(answers.moduleName, templateDir, appVer) &&
        createInOhos(answers.moduleName, templateDir) &&
        createInAndroid(answers.moduleName, templateDir, appVer)) {
        return replaceProjectInfo(answers.moduleName, appVer);
      }
    });
  }
}

module.exports = createModule;
