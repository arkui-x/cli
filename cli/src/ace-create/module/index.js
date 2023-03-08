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
const inquirer = require('inquirer');
const JSON5 = require('json5');
const { copy, modifyHarmonyOSConfig } = require('../project');
const { getModuleList, getCurrentProjectVersion, getManifestPath, isStageProject,
  getModuleAbilityList, getCurrentProjectSystem } = require('../../util');

let projectDir;
let currentSystem;

function checkCurrentDir(currentDir) {
  if (path.basename(currentDir) === 'source') {
    return true;
  }
  return false;
}

function capitalize(str) {
  if (/^[A-Z]/.test(str)) {
    return str;
  } else {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
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
  if (/^\d/.test(moduleName)) {
    console.error('The Module name can contain only letters, digits, and underscores(_).');
    return false;
  }
  if (fs.existsSync(path.join(projectDir, 'ohos', moduleName)) ||
    fs.existsSync(path.join(projectDir, 'source', moduleName))) {
    console.error(`\n${moduleName} already exists.`);
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
  const src = path.join(templateDir, 'ohos_fa/entry');
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

function createInAndroid(moduleName, templateDir, appVer, type) {
  const packageName = getPackageName(appVer, type);
  const packageArray = packageName.split('.');
  const aceVersion = appVer == 'js' ? 'VERSION_JS' : 'VERSION_ETS';
  const src = path.join(templateDir, 'android/app/src/main/java');
  try {
    const templateFileName = 'MainActivity.java';
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
    const createActivityXmlInfo =
      '    <activity \n' +
      '            android:name=".' + destClassName + '"\n' +
      '        android:exported="false" />\n    ';
    const curManifestXmlInfo =
      fs.readFileSync(path.join(projectDir, 'android/app/src/main/AndroidManifest.xml')).toString();
    const insertIndex = curManifestXmlInfo.lastIndexOf('</application>');
    const updateManifestXmlInfo = curManifestXmlInfo.slice(0, insertIndex) +
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
  delete configJsonObj.module.abilities[0]['skills'];
  if (moduleName == 'entry') {
    configJsonObj.module.distro.moduleType = 'entry';
  } else {
    configJsonObj.module.distro.moduleType = 'feature';
  }
  if (appVer == 'js') {
    delete configJsonObj.module.js[0]['mode'];
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

function getPackageName(appVer, type) {
  try {
    if (type == 'FA') {
      const manifestPath = path.join(projectDir, 'source/entry/src/main', appVer, 'MainAbility/manifest.json');
      const manifestJsonObj = JSON.parse(fs.readFileSync(manifestPath));
      return manifestJsonObj.appID;
    } else {
      const manifestPath = path.join(projectDir, 'ohos/AppScope/app.json5');
      const manifestJsonObj = JSON.parse(fs.readFileSync(manifestPath));
      return manifestJsonObj.app.bundleName;
    }
  } catch (error) {
    console.error('Get package name error.');
    return '';
  }
}

function getAppNameForModule(appVer, type) {
  try {
    if (type == 'FA') {
      const manifestPath = path.join(projectDir, 'source/entry/src/main', appVer, 'MainAbility/manifest.json');
      const manifestJsonObj = JSON.parse(fs.readFileSync(manifestPath));
      return manifestJsonObj.appName;
    } else {
      const manifestPath = path.join(projectDir, 'ohos/package.json');
      const manifestJsonObj = JSON.parse(fs.readFileSync(manifestPath));
      return manifestJsonObj.name;
    }
  } catch (error) {
    console.error('Get app name error.');
    return '';
  }
}

function replaceProjectInfo(moduleName, appVer, type) {
  try {
    const packageName = 'com.example.' + moduleName.toLowerCase();
    const appName = getAppNameForModule(appVer, type);
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

    const moduleBuildProfile = path.join(projectDir, 'ohos', moduleName, '/build-profile.json5');
    if (moduleName != 'entry' && fs.existsSync(moduleBuildProfile)) {
      let moduleBuildProfileInfo = JSON5.parse(fs.readFileSync(moduleBuildProfile));
      moduleBuildProfileInfo.entryModules = ["entry"];
      fs.writeFileSync(moduleBuildProfile, JSON.stringify(moduleBuildProfileInfo, '', '  '));
    }
    if (currentSystem === HarmonyOS) {
      modifyHarmonyOSConfig(projectDir, moduleName);
    }

    const settingPath = path.join(projectDir, 'ohos/build-profile.json5');

    if (fs.existsSync(settingPath)) {
      const buildProfileInfo = JSON.parse(fs.readFileSync(settingPath).toString());
      const moduleInfo = {
        'name': moduleName,
        'srcPath': './' + moduleName,
        'targets': [
          {
            'name': 'default',
            'applyToProducts': [
              'default'
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

function createStageModuleInSource(moduleName, templateDir) {
  const dest = path.join(projectDir, 'source', moduleName);
  const src = path.join(templateDir, 'ets_stage/source/entry');
  try {
    fs.mkdirSync(dest, { recursive: true });
    return copy(src, dest);
  } catch (error) {
    console.error('Error occurs when create in source.');
    return false;
  }
}

function replaceStageProfile(moduleName) {
  try {
    if (moduleName != 'entry') {
      const srcModulePath = path.join(projectDir, 'source/' + moduleName + '/src/main/module.json5');
      const modulePathJson = JSON.parse(fs.readFileSync(srcModulePath).toString());
      delete modulePathJson.module.abilities[0].skills;
      fs.writeFileSync(srcModulePath, JSON.stringify(modulePathJson, '', '  '));
      const srcModuleBuildPath = path.join(projectDir, 'source/' + moduleName + '/build-profile.json5');
      const moduleEntryModule = {
        'apiType': 'stageMode',
        'buildOption': {
        },
        'entryModules': [
          'entry'
        ],
        'targets': [
          {
            'name': 'default'
          },
          {
            'name': 'ohosTest'
          }
        ]
      };
      fs.writeFileSync(srcModuleBuildPath, JSON.stringify(moduleEntryModule, '', '  '));
    }

    const srcBuildPath = path.join(projectDir, 'ohos/build-profile.json5');
    const buildPathJson = JSON.parse(fs.readFileSync(srcBuildPath).toString());
    const moduleInfo = {
      'name': moduleName,
      'srcPath': './' + moduleName,
      'targets': [
        {
          'name': 'default',
          'applyToProducts': [
            'default'
          ]
        }
      ]
    };
    buildPathJson.modules.push(moduleInfo);
    fs.writeFileSync(srcBuildPath, JSON.stringify(buildPathJson, '', '  '));
    return true;
  } catch (error) {
    console.error('Replace stage project info error.');
    return false;
  }
}

function replaceStageProjectInfo(moduleName) {
  try {
    fs.renameSync(path.join(projectDir, 'source/' + moduleName + '/src/main/ets/entryability/EntryAbility.ts'),
      path.join(projectDir, 'source/' + moduleName + '/src/main/ets/entryability',
        capitalize(moduleName) + 'Ability.ts'));
    fs.renameSync(path.join(projectDir, 'source/' + moduleName + '/src/main/ets/entryability'),
      path.join(projectDir, 'source/' + moduleName + '/src/main/ets', moduleName.toLowerCase() + 'ability'));
    const files = [];
    const replaceInfos = [];
    const strs = [];
    files.push(path.join(projectDir, 'source/' + moduleName + '/src/main/resources/base/element/string.json'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    files.push(path.join(projectDir, 'source/' + moduleName + '/src/main/resources/en_US/element/string.json'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    files.push(path.join(projectDir, 'source/' + moduleName + '/src/main/resources/zh_CN/element/string.json'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    if (moduleName != 'entry') {
      files.push(path.join(projectDir, 'source/' + moduleName + '/src/main/module.json5'));
      replaceInfos.push('entry');
      strs.push('feature');
    }
    files.push(path.join(projectDir, 'source/' + moduleName + '/src/main/module.json5'));
    replaceInfos.push('module_path_name');
    strs.push(moduleName.toLowerCase());
    files.push(path.join(projectDir, 'source/' + moduleName + '/src/main/module.json5'));
    replaceInfos.push('module_name');
    strs.push(moduleName);
    files.push(path.join(projectDir, 'source/' + moduleName + '/src/main/ets', moduleName.toLowerCase() +
    'ability', capitalize(moduleName) + 'Ability.ts'));
    replaceInfos.push('EntryAbility');
    strs.push(capitalize(moduleName) + 'Ability');
    files.push(path.join(projectDir, 'source/' + moduleName + '/src/main/module.json5'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    files.push(path.join(projectDir, 'source/' + moduleName + '/src/ohosTest/module.json5'));
    replaceInfos.push('module_test_name');
    strs.push(moduleName + '_test');
    files.push(path.join(projectDir, 'source/' + moduleName + '/package.json'));
    replaceInfos.push('module_name');
    strs.push(moduleName);
    files.forEach((filePath, index) => {
      fs.writeFileSync(filePath,
        fs.readFileSync(filePath).toString().replace(new RegExp(replaceInfos[index], 'g'), strs[index]));
    });
    if (!replaceStageProfile(moduleName)) {
      console.error('Please check stage project.');
      return false;
    }
    if (currentSystem === HarmonyOS) {
      modifyHarmonyOSConfig(projectDir, moduleName, 'stage');
    }
    return true;
  } catch (error) {
    console.error('Replace project info error.');
    return false;
  }
}

function createStageInIOS(moduleName, moduleList) {
  const iosFilePath = path.join(projectDir, 'ios/app/AppDelegate.mm');
  if (!fs.existsSync(iosFilePath)) {
    console.error('Create module failed');
    return false;
  }
  const abilityList = getModuleAbilityList(projectDir, moduleList);
  let fileContent = fs.readFileSync(iosFilePath, 'utf8');
  const keyword = '[[AceViewController alloc] initWithVersion:(ACE_VERSION_ETS) instanceName:@"' +
  abilityList[abilityList.length - 1] + '"];\n';
  const index = fileContent.indexOf(keyword);
  const newLine = '    AceViewController *controller' +
    (abilityList.length + 1) +
    ' = [[AceViewController alloc] initWithVersion:(ACE_VERSION_ETS) instanceName:@"' +
    moduleName + '_MainAbility"];\n';
  fileContent = fileContent.slice(0, index + keyword.length) + newLine + fileContent.slice(index + keyword.length);
  fs.writeFileSync(iosFilePath, fileContent, 'utf8');
  return true;
}

function createStageModule(moduleList, templateDir) {
  if (moduleList.length == 0) {
    if (createStageModuleInSource('entry', templateDir) &&
    createInAndroid('entry', templateDir, 'ets', 'Stage')) {
      return replaceStageProjectInfo('entry');
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
      if (createStageModuleInSource(answers.moduleName, templateDir)
      && createInAndroid(answers.moduleName, templateDir, 'ets', 'Stage')
      && createStageInIOS(answers.moduleName, moduleList)) {
        return replaceStageProjectInfo(answers.moduleName);
      }
    });
  }
}

function createFaModule(moduleList, templateDir) {
  const appVer = getCurrentProjectVersion(projectDir);
  if (appVer == '') {
    console.log('project is not exists');
    return false;
  }
  if (moduleList.length == 0) {
    if (createInSource('entry', templateDir, appVer) &&
        createInOhos('entry', templateDir) &&
        createInAndroid('entry', templateDir, appVer, 'FA')) {
      return replaceProjectInfo('entry', appVer, 'FA');
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
          createInAndroid(answers.moduleName, templateDir, appVer, 'FA')) {
        return replaceProjectInfo(answers.moduleName, appVer, 'FA');
      }
    });
  }
}

function createModule() {
  if (!checkCurrentDir(process.cwd())) {
    console.error(`Please go to source directory under ace project path and create module again.`);
    return false;
  }
  projectDir = path.join(process.cwd(), '..');
  currentSystem = getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('current system is unknown.');
    return false;
  }
  const settingPath = path.join(projectDir, 'ohos/build-profile.json5');
  const moduleList = getModuleList(settingPath);
  if (moduleList == null) {
    console.error('Create module failed');
    return false;
  }
  let templateDir = path.join(__dirname, 'template');
  if (!fs.existsSync(templateDir)) {
    templateDir = path.join(__dirname, '../../../templates');
  }
  if (isStageProject(process.cwd())) {
    return createStageModule(moduleList, templateDir);
  } else {
    return createFaModule(moduleList, templateDir);
  }
}

module.exports = createModule;
