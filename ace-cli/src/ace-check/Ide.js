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

const { Platform, platform, homeDir } = require('./platform');
const { getConfig } = require('../ace-config');

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
    if (config) {
      ideHomeDir = config;
    } else if (this.type in environment && this.validIdeFile(environment[this.type].replace(';', ''))) {
      ideHomeDir = environment[this.type].replace(';', '');
    } else if (platform === Platform.Linux) {
      if (this.validIdeFile(this.pointDir)) {
        ideHomeDir = this.pointDir;
      } else {
        ideHomeDir = this.checkDefaultPath(this.defaultLinuxPath);
      }
    } else if (platform === Platform.MacOS) {
      const macApp = this.checkMacApp();
      if (this.validIdeFile(macApp)) {
        ideHomeDir = macApp;
      } else {
        ideHomeDir = this.checkDefaultPath(this.defaultMacPath);
      }
    } else if (platform === Platform.Windows) {
      if (this.validIdeFile(this.pointDir)) {
        ideHomeDir = this.pointDir;
      } else {
        ideHomeDir = this.checkDefaultPath(this.defaultWinsPath);
      }
    }

    if (ideHomeDir) {
      return ideHomeDir;
    }
  }

  checkConfig() {
    try {
      const config = getConfig();
      return config[`${this.stdType}-dir`];
    } catch (err) {
      // ignore
    }
  }

  checkMacApp() {
    const appPath = [`/Applications/${this.stdType}.app`,
      path.join(homeDir, '/Applications', `${this.stdType}.app`)];
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
      if (fs.existsSync(dirs[i]) && this.validIdeFile(dirs[i])) {
        return dirs[i];
      }
    }
  }

  validIdeFile(dir) {
    if (!dir) {
      return false;
    }
    return this.validIdeBin(dir) ||
      this.validIdeBin(path.join(dir, `${platform === Platform.MacOS ? 'Contents/MacOS' : 'bin'}`));
  }

  validIdeBin(dir) {
    if (Object.values(Platform).indexOf(platform)) {
      return this.validIdePath(dir, platform);
    }
    return false;
  }

  validIdePath(dir, platform) {
    const exe = platform === Platform.Linux ? '.sh' : platform === Platform.MacOS ? '' : '.exe';
    if (fs.existsSync(path.join(dir, `${this.exePrefix}${exe}`))) {
      return true;
    } else if (fs.existsSync(path.join(dir, `${this.exePrefix}64${exe}`))) {
      return true;
    }
    return false;
  }
}

module.exports = Ide;
