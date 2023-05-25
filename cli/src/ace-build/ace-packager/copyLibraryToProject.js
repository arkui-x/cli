/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');
const path = require('path');
const { Platform, platform } = require('../../ace-check/platform');
const { copy } = require('../../ace-create/project');
const { getAarName } = require('../../util');
const { arkuiXSdkDir } = require('../../ace-check/configs');
const { appCpu2SdkLibMap, appCpu2DestLibDir, clearLibBeforeCopy } = require('./globalConfig');
const arkUIXSdkName = 'arkui-x';
let arkUIXSdkRootLen = 0;
let projectRootLen = 0;
function getSubProjectDir(fileType, projectDir) {
  if (fileType === 'apk') {
    return ['app'];
  } else if (fileType === 'app' || fileType === 'framework' || fileType === 'xcframework') {
    return ['ios'];
  } else if (fileType === 'aar') {
    return getAarName(projectDir);
  }
}

/**
 *disable log output for current module
 **/
const printLogControl = false;
function printLog() {
  if (printLogControl) {
    let info = '';
    for (const argument in arguments) {
      info = info + arguments[argument];
    }
    console.log(info);
  }
}

/*
* return process option when a lib file is not found
* current implementation ,return 2 -- ignore all
* libraryPath --- the libfile that can't be found
* return number：
* 0 --- throw exception , break current copying library process
* 1 --- ignore current error and  continue
* 2 --- ignore all not found error on libfiles and continue
 */
function processOnNotFound(libraryPath) {
  return 2;
}

/**
 * load a json file and return json object
 **/
function getJsonConfig(apiConfigPath) {
  if (fs.existsSync(apiConfigPath)) {
    try {
      printLog('load:', apiConfigPath);
      return JSON.parse(fs.readFileSync(apiConfigPath));
    } catch (err) {
      printLog('\tload error:', apiConfigPath, '::', err);
      throw new Error('load error:' + apiConfigPath + ', please check ');
    }
  } else {
    printLog('\tcould not find: ', apiConfigPath);
    throw new Error('could not find: ' + apiConfigPath + ', please check ');
  }
}

function getCpuList(buildProject, projectDir, system) {
  if (system === 'android') {
    const androidGradlePath = path.join(projectDir,
      '/android/' + buildProject + '/build.gradle');
    console.log('\nandroid Gradle File:', androidGradlePath);
    if (fs.existsSync(androidGradlePath)) {
      let gradleData = fs.readFileSync(androidGradlePath, 'utf-8');
      gradleData = gradleData.trim().split('\n');
      let ndkList;
      gradleData.some(element => {
        if (element.indexOf(`abiFilters`) >= 0) {
          ndkList = '[' + element.replace(`abiFilters`, '') + ']';
          ndkList = JSON.parse(ndkList);
        }
      }
      );
      if (!ndkList) {
        console.log('could not find  abiFilters , please check');
      }
      return ndkList;
    }
  } else {
    return ['arm64'];
  }
}

function deleteOldFile(deleteFilePath) {
  try {
    if (fs.existsSync(deleteFilePath)) {
      const files = fs.readdirSync(deleteFilePath);
      files.forEach(function (file, index) {
        const curPath = path.join(deleteFilePath, file);
        if (fs.statSync(curPath).isDirectory()) {
          deleteOldFile(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(deleteFilePath);
    }
  } catch (error) {
    printLog('deleteOldfile:', error);
  }
}

function loaderArchType(fileType, cmd, projectDir, system, depMap) {
  let compileType = 'debug';
  if (cmd.release) {
    compileType = 'release';
  }
  const subProjectNameList = getSubProjectDir(fileType, projectDir);
  subProjectNameList.forEach(buildProject => {
    const cpuList = getCpuList(buildProject, projectDir, system);
    printLog('\nbuildSubProject : ', buildProject, '  Cpu List : ', cpuList);
    for (const cpu in cpuList) {
      const archType = appCpu2SdkLibMap[system][cpuList[cpu]][compileType][0];
      let destLibDir = path.join(projectDir, appCpu2DestLibDir[system][cpuList[cpu]]);
      destLibDir = destLibDir.replace('{subdir}', buildProject);
      if (clearLibBeforeCopy) {
        printLog('\ndelete Old Files from Dir:[', destLibDir, '] and then copy ');
        deleteOldFile(destLibDir);
      } else {
        printLog('\nkeep Old Files in Dir:[', destLibDir, '] and then copy, overwrite file if already exists');
      }
      copyLibrary(archType, depMap, system, destLibDir);
    }
  });
}

let ignoreAll = false;
function copyLibrary(archType, depMap, system, destLibDir) {
  system = system.replace('-simulator', '');
  if (!fs.existsSync(destLibDir)) {
    fs.mkdirSync(destLibDir, { recursive: true });
  }
  depMap.forEach(function(value, key) {
    const paths = value['library'][system];
    for (let libraryPath in paths) {
      let tempDestLibDir = destLibDir;
      libraryPath = paths[libraryPath].replace('arch_type', archType);
      const checkResult = checkLibraryPath(libraryPath);
      if (!checkResult) {
        let guestOption = 1;
        printLog('\t', key, ':Error ==> cannot find library:', libraryPath);
        if (!ignoreAll) {
          guestOption = processOnNotFound(libraryPath);
        }
        if (!guestOption || guestOption === 0) {
          throw new Error('library not found: ' + libraryPath);
        } else if (guestOption === 2) {
          ignoreAll = true;
        }
      }
      if (libraryPath.split('.').pop() === 'jar') {
        tempDestLibDir = path.join(destLibDir, '../');
      }
      if (checkResult) {
        copyOneLibrary(key, libraryPath, tempDestLibDir);
      }
    }
  });
}
function checkLibraryPath(libraryPath) {
  if (fs.existsSync(libraryPath)) {
    return true;
  } else {
    return false;
  }
}

function copyOneLibrary(moduleName, src, dest) {
  if (platform === Platform.Windows) {
    dest = path.join(dest, src.split('\\').pop());
  } else {
    dest = path.join(dest, src.split('/').pop());
  }
  const src0 = src.substr(arkUIXSdkRootLen);
  const tar0 = dest.substr(projectRootLen);
  if (fs.statSync(src).isFile()) {
    try {
      printLog('\t', moduleName, ': copy {' + arkUIXSdkName + ' SDK}', src0 + '\n\t\tto ', tar0);
      fs.writeFileSync(dest, fs.readFileSync(src));
    } catch (err) {
      printLog('\t', moduleName, ': copy Librarys err:', err);
    }
  } else {
    printLog('\t', moduleName, ': copy {' + arkUIXSdkName + ' SDK}', src0 + '\n\t\tto ', tar0);
    copy(src, dest);
  }
}

/**
 * main function to copy library files into project lib directory
 **/
function copyLibraryToProject(fileType, cmd, projectDir, system) {
  const apiConfigMap = loadApiConfigJson(arkuiXSdkDir);
  const collectionSet = loadCollectionJson(projectDir);
  arkUIXSdkRootLen = arkuiXSdkDir.length;
  projectRootLen = projectDir.length;

  let moduleNameList;
  collectionSet.forEach(moduleName => {
    if (!moduleNameList) {
      moduleNameList = moduleName;
    } else {
      moduleNameList = moduleNameList + ' , ' + moduleName;
    }
  });
  if (!moduleNameList) {
    moduleNameList = '';
  }

  printLog('source dependent modules: [', moduleNameList, ']');
  let depMap = new Map();
  depMap = finddeps(collectionSet, depMap, apiConfigMap, system);

  loaderArchType(fileType, cmd, projectDir, system, depMap);
}

function loadCollectionJson(projectDir) {
  printLog('load dependent modules from project:');
  let collectionSet = new Set();
  try {
    collectionSet = loadCollection(getJsonConfig(path.join(projectDir,
      'ohos/entry/build/default/cache/component_collection.json')), collectionSet);
  } catch (err) {
    printLog('get componentCollection data failed');
  }
  try {
    collectionSet = loadCollection(getJsonConfig(path.join(projectDir,
      'ohos/entry/build/default/cache/module_collection.json')), collectionSet);
  } catch (err) {
    printLog('get moduleCollection data failed');
  }
  return collectionSet;
}
function loadApiConfigJson(arkuiXSdkDir) {
  printLog('load apiconfig from SDK');
  const engineApiConfig = getJsonConfig(path.join(arkuiXSdkDir,
    '/engine/apiConfig.json'));
  const pluginsApiConfig = getJsonConfig(path.join(arkuiXSdkDir,
    '/plugins/api/apiConfig.json'));
  const pluginsComponentApiConfig = getJsonConfig(path.join(arkuiXSdkDir,
    '/plugins/component/apiConfig.json'));
  let apiConfigMap = new Map();
  let rootpath = {
    'android': path.join(arkuiXSdkDir, '/engine'),
    'ios': path.join(arkuiXSdkDir, '/engine')
  };
  apiConfigMap = loadApiConfig(rootpath, engineApiConfig, apiConfigMap);
  rootpath = {
    'android': path.join(arkuiXSdkDir, '/plugins/api'),
    'ios': path.join(arkuiXSdkDir, '/plugins/api')
  };

  apiConfigMap = loadApiConfig(rootpath, pluginsApiConfig, apiConfigMap);

  rootpath = {
    'android': path.join(arkuiXSdkDir, '/plugins/component'),
    'ios': path.join(arkuiXSdkDir, '/plugins/component')
  };

  apiConfigMap = loadApiConfig(rootpath, pluginsComponentApiConfig, apiConfigMap);
  return apiConfigMap;
}
const baseModule = 'engine/arkui';
function finddeps(collectionSet, depMap, apiConfigMap, system) {
  depMap = findOneDep(baseModule, depMap, apiConfigMap, system);
  printLog('basic module : ', baseModule);
  depMap.forEach(function(value, key) {
    printLog('\t', key);
  });
  collectionSet.forEach(moduleName => {
    depMap = findOneDep(moduleName, depMap, apiConfigMap, system);
  });
  return depMap;
}

function findOneDep(moduleName, depMap, apiConfigMap, system) {
  if (depMap.has(moduleName)) {
    return depMap;
  }
  const moduleObj = apiConfigMap.get(moduleName);
  if (!moduleObj) {
    printLog('error: cannot find the define of [' + moduleName + ']');
    return depMap;
  }
  depMap.set(moduleName, moduleObj);
  const moduleNameDeps = moduleObj.deps;
  if (!moduleNameDeps) {
    return depMap;
  }
  if (!moduleNameDeps[system]) {
    return depMap;
  }
  const moduleNameDepsSystem = moduleNameDeps[system];
  for (const depsModuleName in moduleNameDepsSystem) {
    depMap = findOneDep(moduleNameDepsSystem[depsModuleName], depMap, apiConfigMap, system);
  }
  return depMap;
}

function loadCollection(collection, collectionSet) {
  for (const key in collection) {
    const collectionList = collection[key];
    for (const modules in collectionList) {
      collectionSet.add(collectionList[modules]);
    }
  }
  return collectionSet;
}

function loadApiConfig(RootPath, ApiConfig, apiConfigMap) {
  let couldNotFound;
  ApiConfig.forEach(element => {
    let temppath = element.library.android;
    let found = false;
    if (temppath[0]) {
      found = true;
    }
    if (element.deps && element.deps.android && element.deps.android[0]) {
      found = true;
    }
    if (!found) {
      if (!couldNotFound) {
        couldNotFound = 'android:' + element.module;
      } else {
        couldNotFound = couldNotFound + ' , android:' + element.module;
      }
    }
    for (let i = 0; i < temppath.length; i++) {
      temppath[i] = path.join(RootPath.android, temppath[i]);
    }
    element.library.android = temppath;
    apiConfigMap.set(element.module, element);

    temppath = element.library.ios;
    found = false;
    if (temppath[0]) {
      found = true;
    }
    if (element.deps && element.deps.ios && element.deps.ios[0]) {
      found = true;
    }
    if (!found) {
      if (!couldNotFound) {
        couldNotFound = 'ios:' + element.module;
      } else {
        couldNotFound = couldNotFound + ' , ' + 'ios:' + element.module;
      }
    }
    for (let i = 0; i < temppath.length; i++) {
      temppath[i] = path.join(RootPath.ios, temppath[i]);
    }
    element.library.ios = temppath;
    apiConfigMap.set(element.module, element);
  }
  );
  return apiConfigMap;
}

module.exports = { copyLibraryToProject };

