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
const Process = require('child_process');

const { Platform, platform, homeDir } = require('./platform');
const { getConfig, modifyConfigPath } = require('../ace-config');
const { typeStudioPathCheck } = require('./checkPathLawful');
const { cmpVersion } = require('./util');

const environment = process.env;

class Ide {
  constructor(
    type,
    defaultLinuxPath,
    defaultMacPath,
    defaultWinsPath,
    exePrefix
  ) {
    this.type = type;
    this.stdType = this.type.replace(/\s/g, '-').toLowerCase();
    this.defaultLinuxPath = defaultLinuxPath || [];
    this.defaultMacPath = defaultMacPath || [];
    this.defaultWinsPath = defaultWinsPath || [];
    this.exePrefix = exePrefix;
    this.versions = this.getPointVersion();
    this.pointDir = this.getPointPath();
  }

  locateIde() {
    let ideHomeDir;
    const config = this.checkConfig();
    if (config && typeStudioPathCheck(config, this.type)) {
      ideHomeDir = config;
    } else if (this.type in environment && typeStudioPathCheck(environment[this.type].replace(';', ''), this.type)) {
      ideHomeDir = environment[this.type].replace(';', '');
    } else if (this.getDefaultPath()) {
      ideHomeDir = this.getDefaultPath();
    } else {
      ideHomeDir = this.readIdeHomePath();
    }
    modifyConfigPath(this.type, ideHomeDir);
    if (ideHomeDir) {
      return ideHomeDir;
    }
  }

  getDefaultPath() {
    let defaultPath;
    if (platform === Platform.Windows || platform === Platform.Linux) {
      if (typeStudioPathCheck(this.pointDir, this.type)) {
        defaultPath = this.pointDir;
      } else if (this.checkDefaultPath(this.defaultLinuxPath)) {
        defaultPath = this.checkDefaultPath(this.defaultLinuxPath);
      }
    } else if (platform === Platform.MacOS) {
      const macApp = this.checkMacApp();
      if (typeStudioPathCheck(macApp, this.type)) {
        defaultPath = macApp;
      } else if (this.checkDefaultPath(this.defaultMacPath)) {
        defaultPath = this.checkDefaultPath(this.defaultMacPath);
      }
    }
    return defaultPath;
  }

  readIdeHomePath() {
    let idetype;
    let fileName;
    let ideHomePath;
    let validHomeDir;
    const fileType = '.home';
    if (this.type === 'DevEco Studio') {
      idetype = 'DevEcoStudio';
      fileName = 'Huawei';
    } else if (this.type === 'Android Studio') {
      idetype = 'AndroidStudio';
      fileName = 'Google';
    } else {
      return '';
    }
    if (platform === Platform.Windows) {
      ideHomePath = path.join(homeDir, 'AppData\\Local', fileName);
      validHomeDir = this.validHomeOrXmlPath(ideHomePath, idetype, fileType);
    } else if (platform === Platform.Linux) {
      ideHomePath = path.join(homeDir, '.cache', fileName);
      validHomeDir = this.validHomeOrXmlPath(ideHomePath, idetype, fileType);
    } else if (platform === Platform.MacOS) {
      ideHomePath = path.join(homeDir, 'Library/Caches', fileName);
      validHomeDir = this.validHomeOrXmlPath(ideHomePath, idetype, fileType);
    }
    if (validHomeDir) {
      validHomeDir = path.join(validHomeDir, fileType);
      ideHomePath = fs.readFileSync(validHomeDir, 'utf-8');
      if (platform === Platform.MacOS) {
        ideHomePath = path.dirname(ideHomePath);
      }
      if (ideHomePath && typeStudioPathCheck(ideHomePath, this.type)) {
        return ideHomePath;
      }
    }
  }

  validHomeOrXmlPath(ideHomePath, idetype, fileType) {
    const ideValidFiles = [];
    let maxValidVersionFile;
    if (fs.existsSync(ideHomePath)) {
      ideValidFiles.push(...fs.readdirSync(ideHomePath).filter((file) => {
        return file.startsWith(idetype) && fs.existsSync(path.join(ideHomePath, file, fileType));
      }));
    }
    if (ideValidFiles.length !== 0) {
      maxValidVersionFile = this.maxIdePath(ideValidFiles);
      return path.join(ideHomePath, maxValidVersionFile);
    }
    return '';
  }

  maxIdePath(ideValidFiles) {
    if (ideValidFiles.length === 1) {
      return ideValidFiles[0];
    } else {
      for (let i = 0; i < ideValidFiles.length - 1; i++) {
        if (cmpVersion(ideValidFiles[i].match(/[0-9]+\.[0-9]+/)[0], ideValidFiles[i + 1].match(/[0-9]+\.[0-9]+/)[0])) {
          const tmp = ideValidFiles[i];
          ideValidFiles[i] = ideValidFiles[i + 1];
          ideValidFiles[i + 1] = tmp;
        }
      }
      return ideValidFiles[ideValidFiles.length - 1];
    }
  }

  checkConfig() {
    try {
      const config = getConfig();
      return config[`${this.stdType}-path`];
    } catch (err) {
      // ignore
    }
  }

  checkMacApp() {
    let type = this.stdType;
    if (type === 'android-studio') {
      type = 'Android Studio';
    }
    const appPath = [`/Applications/${type}.app`,
      path.join(homeDir, '/Applications', `${type}.app`)];
    for (const i in appPath) {
      if (fs.existsSync(appPath[i])) {
        return appPath[i];
      }
    }
  }

  getPointPath() {
    let idePath;
    const installPath = {};
    for (const i in this.versions) {
      try {
        const key = this.versions[i];
        const path = path.join(homeDir, this.versions[i], 'system', '.home');
        installPath[key] = fs.readFileSync(path, 'utf-8');
      } catch (err) {
        // ignore
      }
    }
    let newVersion = -1;
    for (const key in installPath) {
      const version = parseFloat(key.slice(this.type.length, key.length));
      if (version > newVersion) {
        newVersion = version;
        idePath = installPath[key];
      }
    }
    return idePath;
  }

  getPointVersion() {
    try {
      const version = [];
      const type = this.type.replace(/\s/g, '');
      const files = fs.readdirSync(homeDir);
      files.forEach(item => {
        const stat = fs.lstatSync(path.join(homeDir, item));
        if (stat.isDirectory() === true &&
          item.slice(0, type.length + 1) === `.${type}`) {
          version.push(item);
        }
      });
      return version;
    } catch (err) {
      // ignore
    }
  }

  checkDefaultPath(dirs) {
    for (const i in dirs) {
      if (fs.existsSync(dirs[i]) && typeStudioPathCheck(dirs[i], this.type)) {
        return dirs[i];
      }
    }
  }

  getVersion(studioDir) {
    if (!studioDir) {
      return 'unknown';
    }
    if (studioDir.endsWith('bin')) {
      studioDir = studioDir.substring(0, studioDir.length - 3);
    }
    if (platform === Platform.MacOS) {
      const targetPath = path.join(studioDir, 'Contents', 'Info.plist');
      if (!fs.existsSync(targetPath)) {
        return 'unknown';
      }
      try {
        return Process.execSync(`defaults read "${targetPath}" CFBundleShortVersionString`, { stdio: 'pipe' }).toString().replace(/\n/g, '');
      } catch (err) {
        return 'unknown';
      }
    } else {
      const targetPath = path.join(studioDir, 'product-info.json');
      if (!fs.existsSync(targetPath)) {
        return 'unknown';
      }
      return JSON.parse(fs.readFileSync(targetPath))['version'];
    }
  }
}

function readIdeXmlPath(envtype, AnOrDeStudio) {
  let ideOtherFilePath;
  let ideXmlFileDir;
  let fileName;
  if (AnOrDeStudio === 'DevEcoStudio') {
    fileName = 'Huawei';
  } else if (AnOrDeStudio === 'AndroidStudio') {
    fileName = 'Google';
  } else {
    return '';
  }
  const fileType = path.join('options', 'other.xml');
  if (platform === Platform.Windows) {
    ideOtherFilePath = path.join(homeDir, 'AppData\\Roaming', fileName);
  } else if (platform === Platform.Linux) {
    ideOtherFilePath = path.join(homeDir, '.config', fileName);
  } else if (platform === Platform.MacOS) {
    ideOtherFilePath = path.join(homeDir, `Library/Application Support`, fileName);
  }
  const maxDevEcoStudio = devEcoStudio.validHomeOrXmlPath(ideOtherFilePath, AnOrDeStudio, fileType);
  if (maxDevEcoStudio) {
    ideXmlFileDir = path.join(maxDevEcoStudio, fileType);
    const ideOtherEnvDir = searchXmlPath(ideXmlFileDir, envtype);
    return ideOtherEnvDir;
  }
}

function searchXmlPath(ideXmlFileDir, envtype) {
  let packageName;
  let xmldata = fs.readFileSync(ideXmlFileDir, 'utf-8').replace(/&quot;/g, '"');
  xmldata = xmldata.trim().split('\n');
  for (let i = 0; i < xmldata.length; i++) {
    if (xmldata[i].indexOf(`"${envtype}"`) !== -1) {
      packageName = xmldata[i].split('"')[3];
      return packageName.replace(/\\\\/g, '\\');
    }
  }
  return null;
}

const devEcoStudio = new Ide(
  'DevEco Studio',
  [],
  [],
  [`C:\\Program Files\\Huawei\\DevEco Studio`,
    `D:\\Program Files\\Huawei\\DevEco Studio`],
  'devecostudio'
);

const androidStudio = new Ide(
  'Android Studio',
  [`/opt/android-studio`, `${homeDir}/android-studio`],
  [],
  [`C:\\Program Files\\Android\\Android Studio`,
    `D:\\Program Files\\Android\\Android Studio`],
  'androidstudio'
);

module.exports = {
  devEcoStudio,
  androidStudio,
  readIdeXmlPath,
};
