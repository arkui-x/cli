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
const exec = require('child_process').execSync;
const {
  Platform,
  platform
} = require('../ace-check/platform');

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

function copy(src, dst, excludefile) {
  const paths = fs.readdirSync(src).filter(item => {
    return (item.substring(0, 1) !== '.' && item !== excludefile);
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
      copy(srcEle, dstEle, excludefile);
    }
  });
  return true;
}

function createPackageFile(packagePaths, packageArray) {
  packagePaths.forEach(packagePath => {
    const files = fs.readdirSync(packagePath);
    const oldPath = packagePath;
    packageArray.forEach(packageInfo => {
      fs.mkdirSync(path.join(packagePath, packageInfo), { recursive: true });
      packagePath = path.join(packagePath, packageInfo);
    });
    files.forEach(javaFile => {
      const srcEle = path.join(oldPath, javaFile);
      const dstEle = path.join(packagePath, javaFile);
      if (fs.statSync(srcEle).isFile()) {
        fs.writeFileSync(dstEle, fs.readFileSync(srcEle));
        fs.unlinkSync(srcEle);
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
    const buildGradleInfo = fs.readFileSync(buildGradle, 'utf8').toString();
    const searchAbi = `testInstrumentationRunner "android.support.test.runner.AndroidJUnitRunner"`;
    const searchFeatures = 'dynamicFeatures = []';
    const addAbiIndex = buildGradleInfo.lastIndexOf(searchAbi);
    const delFeaturesIndex = buildGradleInfo.lastIndexOf(searchFeatures);
    const addAbi = `\n
        ndk {
            abiFilters "arm64-v8a"
        }
    `;
    const addPackage = `
    externalNativeBuild {
        cmake {
            path file('src/main/cpp/CMakeLists.txt')
            version '3.22.1'
        }
    }

    packagingOptions {
        pickFirst 'lib/arm64-v8a/libarkui_android.so'
    }`;

    const updateBuildGradleInfo = buildGradleInfo.slice(0, addAbiIndex + searchAbi.length) + addAbi +
      buildGradleInfo.slice(addAbiIndex + searchAbi.length, delFeaturesIndex) + addPackage +
      buildGradleInfo.slice(delFeaturesIndex + searchFeatures.length);
    fs.writeFileSync(buildGradle, updateBuildGradleInfo);
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

function signIOS(configFile) {
  if (platform !== Platform.MacOS) {
    return true;
  }
  try {
    exec('which security', { stdio: 'pipe' });
    exec('which openssl', { stdio: 'pipe' });
    const files = [];
    const replaceInfos = [];
    const strs = [];
    const identityResult = [];
    const findIdentityCmd = 'security find-identity -p codesigning -v';
    const result = exec(`${findIdentityCmd}`, { stdio: 'pipe' }).toString().split('\n').filter(item => {
      return (/^\s*\d+\).+"(.+Develop(ment|er).+)"$/g).exec(item);
    });
    result.forEach(item => {
      identityResult.push((/^\s*\d+\).+"(.+Develop(ment|er).+)"$/g).exec(item)[1]);
    });
    if (identityResult.length === 0) {
      return false;
    }
    const identity = identityResult[0].match(RegExp(/.*\(([a-zA-Z0-9]+)\)/))[1];
    const findCertificateCmd = `security find-certificate -c ${identity} -p | openssl x509 -subject`;
    const certificateResult = exec(`${findCertificateCmd}`, { stdio: 'pipe' }).toString().match(RegExp(/OU\s*=\s*([a-zA-Z0-9]+)/))[1];

    files.push(configFile);
    replaceInfos.push('Manual');
    strs.push('Automatic');
    files.push(configFile);
    replaceInfos.push('MCN34247SC');
    strs.push(certificateResult);
    files.push(configFile);
    replaceInfos.push('iPhone Distribution: ');
    strs.push('Apple Development');
    files.push(configFile);
    replaceInfos.push('shiseido sc adhoc');
    strs.push('');
    replaceInfo(files, replaceInfos, strs);
    console.log(`Signing iOS app for device deployment using developer identity: "${identityResult[0]}"`);
    return true;
  } catch (err) {
    console.log(err)
    return false;
  }
}

module.exports = {
  copy,
  rmdir,
  createPackageFile,
  replaceInfo,
  modifyHarmonyOSConfig,
  modifyNativeCppConfig,
  addCrosssPlatform,
  signIOS
};
