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
const inquirer = require('inquirer');
const check = require('../../ace-check');
const aceVersionJs = '2';

function create(args) {
  check();
  const question = [{
    name: 'delete',
    type: 'input',
    message: 'The project already exists. Do you want to delete the directory (y / n):',
    validate(val) {
      if (val.toLowerCase() !== 'y' && val.toLowerCase() !== 'n') {
        return 'Please enter y / n!';
      } else {
        return true;
      }
    }
  }];
  const { project, packages, version } = args;
  const projectPath = path.join(process.cwd(), project);
  if (fs.existsSync(project)) {
    question.message = question.message + projectPath;
    inquirer.prompt(question).then(answers => {
      if (answers.delete === 'y') {
        try {
          rmdir(projectPath);
          console.log('Delete directory successfully, creating new project.');
        } catch (err) {
          console.log(`Failed to delete ${projectPath}, please delete it do yourself.`);
        }
        createProject(projectPath, packages, project, version);
      } else {
        console.log('Failed to create project, project directory already exists.');
      }
    });
  } else {
    createProject(projectPath, packages, project, version);
  }
}

function createProject(projectPath, packages, project, version) {
  try {
    fs.mkdirSync(projectPath);
    findTemplate(projectPath, packages, project, version);
    console.log('Project created successfully! Target directory：' + projectPath + ' .');
  } catch (error) {
    console.log('Project created failed! Target directory：' + projectPath + ' .' + error);
  }
}

function findTemplate(projectPath, packages, project, version) {
  let pathTemplate = path.join(__dirname, 'template');
  if (fs.existsSync(pathTemplate)) {
    copyTemplateToProject(pathTemplate, projectPath, version);
    replaceProjectInfo(projectPath, packages, project, version);
  } else {
    pathTemplate = path.join(__dirname, '../../../templates');
    if (fs.existsSync(pathTemplate)) {
      copyTemplateToProject(pathTemplate, projectPath, version);
      replaceProjectInfo(projectPath, packages, project, version);
    } else {
      console.log('Error: Template is not exist!');
    }
  }
}

function replaceProjectInfo(projectPath, packages, project, version) {
  if (!packages) {
    packages = 'com.example.arkuicross';
  }
  let jsName = 'ets';
  if (version == aceVersionJs) {
    jsName = 'js';
  }
  const packageArray = packages.split('.');
  const files = [];
  const replaceInfos = [];
  const strs = [];
  let aceVersion;
  let srcLanguage;

  files.push(path.join(projectPath, 'source/entry/src/main/' + jsName + '/MainAbility/manifest.json'));
  replaceInfos.push('appIDValue');
  strs.push(packages);
  files.push(path.join(projectPath, 'source/entry/src/main/' + jsName + '/MainAbility/manifest.json'));
  replaceInfos.push('appNameValue');
  strs.push(project);
  files.push(path.join(projectPath, 'android/settings.gradle'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, 'android/settings.gradle'));
  replaceInfos.push('appIDValueHi');
  strs.push(packages);
  files.push(path.join(projectPath, 'android/settings.gradle'));
  replaceInfos.push('appNameValueHi');
  strs.push(project);
  files.push(path.join(projectPath, 'android/app/src/main/res/values/strings.xml'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, 'android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('packageName');
  strs.push(packages);
  files.push(path.join(projectPath, 'android/app/build.gradle'));
  replaceInfos.push('packageName');
  strs.push(packages);
  files.push(path.join(projectPath, 'ohos/entry/src/main/config.json'));
  replaceInfos.push('packageInfo');
  strs.push(packages);
  files.push(path.join(projectPath, 'ohos/entry/src/main/config.json'));
  replaceInfos.push('bundleNameValue');
  strs.push(packages);
  files.push(path.join(projectPath, 'ohos/entry/src/main/config.json'));
  replaceInfos.push('appNameValue');
  strs.push(project);
  files.push(path.join(projectPath, 'source/entry/src/ohosTest/config.json'));
  replaceInfos.push('bundleNameValue');
  strs.push(packages);
  files.push(path.join(projectPath, 'ohos/entry/src/main/resources/base/element/string.json'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/androidTest/java/ExampleInstrumentedTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/test/java/ExampleUnitTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ArkUIInstanceName');
  strs.push('entry_MainAbility');

  if (jsName === 'ets') {
    aceVersion = 'VERSION_ETS';
    srcLanguage = 'ets';
    files.push(path.join(projectPath, 'ios/etsapp.xcodeproj/project.pbxproj'));
    replaceInfos.push('bundleIdentifier');
    strs.push(packages);
    files.push(path.join(projectPath, 'ios/etsapp/AppDelegate.mm'));
    replaceInfos.push('ACE_VERSION');
    strs.push('ACE_VERSION_ETS');
  } else {
    aceVersion = 'VERSION_JS';
    srcLanguage = 'js';
    files.push(path.join(projectPath, 'ios/jsapp.xcodeproj/project.pbxproj'));
    replaceInfos.push('bundleIdentifier');
    strs.push(packages);
    files.push(path.join(projectPath, 'ios/jsapp.xcodeproj/project.pbxproj'));
    replaceInfos.push('etsapp');
    strs.push('jsapp');
    files.push(path.join(projectPath, 'ios/jsapp/AppDelegate.mm'));
    replaceInfos.push('ACE_VERSION');
    strs.push('ACE_VERSION_JS');
  }
  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ACE_VERSION');
  strs.push(aceVersion);
  files.push(path.join(projectPath, 'ohos/entry/src/main/config.json'));
  replaceInfos.push('srcLanguageValue');
  strs.push(srcLanguage);
  replaceInfo(files, replaceInfos, strs);
  if (jsName === 'js') {
    const configJsonPath = path.join(projectPath, 'ohos/entry/src/main/config.json');
    const configJsonObj = JSON.parse(fs.readFileSync(configJsonPath));
    delete (configJsonObj.module.js[0]['mode']);
    fs.writeFileSync(configJsonPath, JSON.stringify(configJsonObj, '', '  '));
  }

  const aospJavaPath = path.join(projectPath, 'android/app/src/main/java');
  const testAospJavaPath = path.join(projectPath, 'android/app/src/test/java');
  const androidTestAospJavaPath = path.join(projectPath, 'android/app/src/androidTest/java');
  const packagePaths = [aospJavaPath, testAospJavaPath, androidTestAospJavaPath];
  createPackageFile(packagePaths, packageArray);
}

function createPackageFile(packagePaths, packageArray) {
  packagePaths.forEach(packagePath => {
    const files = fs.readdirSync(packagePath);
    const oldPath = packagePath;
    packageArray.forEach(packageInfo => {
      fs.mkdirSync(path.join(packagePath, packageInfo));
      packagePath = path.join(packagePath, packageInfo);
    });
    files.forEach(javaFile => {
      const srcEle = path.join(oldPath, javaFile);
      const dstEle = path.join(packagePath, javaFile);
      if (fs.statSync(srcEle).isFile()) {
        fs.writeFileSync(dstEle, fs.readFileSync(srcEle));
        fs.unlinkSync(srcEle);
      } else {
        fs.mkdirSync(dstEle);
        copy(srcEle, dstEle);
        rmdir(srcEle);
      }
    });
  });
}
function replaceInfo(files, replaceInfos, strs) {
  files.forEach((filePath, index) => {
    fs.writeFileSync(filePath,
      fs.readFileSync(filePath).toString().replace(new RegExp(replaceInfos[index], 'g'), strs[index]));
  });
}

function rmdir(filePath) {
  if (fs.statSync(filePath).isFile()) {
    fs.unlinkSync(filePath);
  } else {
    fs.readdirSync(filePath).forEach(file => {
      const currentPath = path.join(filePath, file);
      if (fs.statSync(currentPath).isFile()) {
        fs.unlinkSync(currentPath);
      } else {
        rmdir(currentPath);
      }
    });
    fs.rmdirSync(filePath);
  }
}

function copy(src, dst) {
  const paths = fs.readdirSync(src).filter(item => {
    return (item.substring(0, 1) != ".");
  });
  paths.forEach(newpath => {
    const srcEle = path.join(src, newpath);
    const dstEle = path.join(dst, newpath);
    if (fs.statSync(srcEle).isFile()) {
      let parentDir = path.parse(dstEle).dir;
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(dstEle, fs.readFileSync(srcEle));
    } else {
      if (!fs.existsSync(dstEle)) {
        fs.mkdirSync(dstEle, { recursive: true });
      }
      copy(srcEle, dstEle);
    }
  });
  return true;
}

function copySourceTemplate(templatePath, projectPath, version) {
  let sourcePath;
  if (version == aceVersionJs) {
    sourcePath = path.join(templatePath, '/js_fa/source');
  } else {
    sourcePath = path.join(templatePath, '/ets_fa/source');
  }
  return copy(sourcePath, path.join(projectPath, '/source'));
}

function copyIosTemplate(templatePath, projectPath, version) {
  copy(path.join(templatePath, '/ios'), path.join(projectPath, '/ios'));
  if (version == aceVersionJs) {
    fs.renameSync(path.join(projectPath, '/ios/etsapp.xcodeproj'), path.join(projectPath, '/ios/jsapp.xcodeproj'));
    fs.renameSync(path.join(projectPath, '/ios/etsapp'), path.join(projectPath, '/ios/jsapp'));
  }
  return true;
}

function copyTemplateToProject(templatePath, projectPath, version) {
  if (!copySourceTemplate(templatePath, projectPath, version)) {
    return false;
  }
  if (!copy(path.join(templatePath, '/ohos_fa'), path.join(projectPath, '/ohos'))) {
    return false;
  }
  if (!copy(path.join(templatePath, '/android'), path.join(projectPath, '/android'))) {
    return false;
  }
  if (!copyIosTemplate(templatePath, projectPath, version)) {
    return false;
  }
  return true;
}

module.exports = {
  create,
  copy
};
