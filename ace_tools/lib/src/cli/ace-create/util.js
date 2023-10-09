/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
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
const JSON5 = require('json5');

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
    return item.substring(0, 1) !== '.';
  });
  paths.forEach(newpath => {
    const srcEle = path.join(src, newpath);
    const dstEle = path.join(dst, newpath);
    if (fs.statSync(srcEle).isFile()) {
      const parentDir = path.parse(dstEle).dir;
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

function modifyHarmonyOSConfig(projectPath, moduleName) {
  const buildProfile = path.join(projectPath, 'build-profile.json5');
  const configFile = [path.join(projectPath, moduleName, 'src/main/module.json5'),
    path.join(projectPath, moduleName, 'src/ohosTest/module.json5')];
  const deviceTypeName = 'deviceTypes';

  if (fs.existsSync(buildProfile)) {
    const buildProfileInfo = JSON5.parse(fs.readFileSync(buildProfile));
    const productsInfo = buildProfileInfo.app.products;
    for (let index = 0; index < productsInfo.length; index++) {
      if (productsInfo[index].name === 'default' && productsInfo[index].runtimeOS !== 'HarmonyOS') {
        productsInfo[index].compileSdkVersion = '4.0.0(10)';
        productsInfo[index].compatibleSdkVersion = '4.0.0(10)';
        productsInfo[index].runtimeOS = 'HarmonyOS';
        break;
      }
    }
    fs.writeFileSync(buildProfile, JSON.stringify(buildProfileInfo, '', '  '));
  }

  configFile.forEach(config => {
    if (fs.existsSync(config)) {
      const configFileInfo = JSON5.parse(fs.readFileSync(config));
      configFileInfo.module[deviceTypeName] = ['phone'];
      fs.writeFileSync(config, JSON.stringify(configFileInfo, '', '  '));
    }
  });
}

function modifyNativeCppConfig(projectPath, files, replaceInfos, strs, project) {
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/cpp/CMakeLists.txt'));
  replaceInfos.push('appNameValue');
  strs.push(project);

  const buildGradle = path.join(projectPath, '.arkui-x/android/app/build.gradle');
  if (fs.existsSync(buildGradle)) {
    const buildGradleInfo = fs.readFileSync(buildGradle, 'utf8').split(/\r\n|\n|\r/gm);
    let num;
    for (let i = 0; i < buildGradleInfo.length; i++) {
      if (buildGradleInfo[i] === `            abiFilters "arm64-v8a", "armeabi-v7a"`) {
        buildGradleInfo[i] = `            abiFilters "arm64-v8a"`;
      }
      if (buildGradleInfo[i] === '    dynamicFeatures = []') {
        num = i;
        break;
      }
    }
    const value = `
      externalNativeBuild {
          cmake {
              path file('src/main/cpp/CMakeLists.txt')
              version '3.22.1'
          }
      }
  
      packagingOptions {
          pickFirst 'lib/arm64-v8a/libarkui_android.so'
      }
        `;
    buildGradleInfo.splice(num, 0, value);
    fs.writeFileSync(buildGradle, buildGradleInfo.join('\r\n'));
  }
}

function addCrosssPlatform(projectPath, module) {
  try {
    if (!fs.existsSync(path.join(projectPath, '.arkui-x'))) {
      fs.mkdirSync(path.join(projectPath, '.arkui-x'), { recursive: true });
    }
    const crossFile = path.join(projectPath, '.arkui-x/arkui-x-config.json5');
    if (fs.existsSync(crossFile)) {
      const crossInfo = JSON5.parse(fs.readFileSync(crossFile).toString());
      if (!crossInfo.modules.includes(module)) {
        crossInfo.modules.push(module);
      }
      fs.writeFileSync(crossFile, JSON.stringify(crossInfo, '', '  '));
    } else {
      const data = `{
  "crossplatform": true,
  "modules": [
    "${module}",
  ]
}`;
      fs.writeFileSync(crossFile, data);
    }
  } catch (err) {
    console.log('add cross platform failed\n', err)
  }
}

module.exports = {
  copy,
  rmdir,
  createPackageFile,
  replaceInfo,
  modifyHarmonyOSConfig,
  modifyNativeCppConfig,
  addCrosssPlatform
};
