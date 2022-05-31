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

function create(args) {
  check();
  const question = [{
    name: 'delete',
    type: 'input',
    message: 'The project already exists. Do you want to delete the directory (Y / N):',
    validate(val) {
      if (val !== 'y' && val !== 'n') {
        return 'Please enter y / n!';
      } else {
        return true;
      }
    }
  }];
  const { template, project, packages, version } = args;
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
        createProject(projectPath, template, packages, project, version);
      } else {
        console.log('Failed to create project, project directory already exists.');
      }
    });
  } else {
    createProject(projectPath, template, packages, project, version);
  }
}

function createProject(projectPath, template, packages, project, version) {
  fs.mkdirSync(projectPath);
  console.log('Directory created successfully! Target directory：' + projectPath + ' .');
  findTemplate(template, projectPath, packages, project, version);
}

function findTemplate(template, projectPath, packages, project, version) {
  if (template === '' || version === '1') {
    template = 'app';
  } else if (version === '2') {
    template = 'appv2';
  }
  let pathTemplate = path.join(__dirname, 'template', template);
  if (fs.existsSync(pathTemplate)) {
    copy(pathTemplate, projectPath);
    replaceProjectInfo(projectPath, packages, project);
  } else {
    pathTemplate = path.join(__dirname, '../../../templates', template);
    if (fs.existsSync(pathTemplate)) {
      copy(pathTemplate, projectPath);
      replaceProjectInfo(projectPath, packages, project, template);
    } else {
      console.log('Error: Template is not exist!');
    }
  }
}

function replaceProjectInfo(projectPath, packages, project, template) {
  if (!packages) {
    packages = 'com.example.arkuicross';
  }
  let jsName = 'ets';
  if (template === 'app') {
    jsName = 'js';
  }
  const packageArray = packages.split('.');
  const files = [];
  const replaceInfos = [];
  const strs = [];

  files.push(path.join(projectPath, 'source/entry/src/main/' + jsName + '/manifest.json'));
  replaceInfos.push('appIDValue');
  strs.push(packages);

  files.push(path.join(projectPath, 'source/entry/src/main/' + jsName + '/manifest.json'));
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
  files.push(path.join(projectPath, 'ohos/entry/src/main/resources/base/element/string.json'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, 'android/app/src/main/java/HiHelloWorldActivity.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/main/java/HiHelloWorldApplication.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/androidTest/java/ExampleInstrumentedTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/test/java/ExampleUnitTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);

  if (jsName === 'ets') {
    files.push(path.join(projectPath, 'ios/etsapp.xcodeproj/project.pbxproj'));
  } else {
    files.push(path.join(projectPath, 'ios/jsapp.xcodeproj/project.pbxproj'));
  }
  replaceInfos.push('bundleIdentifier');
  strs.push(packages);

  replaceInfo(files, replaceInfos, strs);

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
      const _src = path.join(oldPath, javaFile);
      const _dst = path.join(packagePath, javaFile);
      if (fs.statSync(_src).isFile()) {
        fs.writeFileSync(_dst, fs.readFileSync(_src));
        fs.unlinkSync(_src);
      } else {
        fs.mkdirSync(_dst);
        copy(_src, _dst);
        rmdir(_src);
      }
    });
  });
}

function replaceInfo(files, repalceInfos, strs) {
  files.forEach((filePath, index) => {
    fs.writeFileSync(filePath, fs.readFileSync(filePath).toString().replaceAll(repalceInfos[index], strs[index]));
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
  const paths = fs.readdirSync(src);
  paths.forEach(function(newpath) {
    const _src = path.join(src, newpath);
    const _dst = path.join(dst, newpath);
    if (fs.statSync(_src).isFile()) {
      fs.writeFileSync(_dst, fs.readFileSync(_src));
    } else {
      if (!fs.existsSync(_dst)) {
        fs.mkdirSync(_dst, { recursive: true });
      }
      copy(_src, _dst);
    }
  });
  return true;
}

module.exports = {
  create,
  copy
};
