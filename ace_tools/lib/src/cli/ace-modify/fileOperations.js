/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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
const { FILE_NAME_MAP } = require('./constants');
const { buildReplaceTask, executeReplaceTasks } = require('./utils');

function copyFileSync(source, destination) {
  fs.copyFileSync(source, destination);
}

function copyFolderSync(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name);
    const destName = FILE_NAME_MAP[entry.name] || entry.name;
    const destPath = path.join(destination, destName);
    if (entry.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function createPackageFile(packagePaths, packageArray) {
  for (const packagePath of packagePaths) {
    if (!fs.existsSync(packagePath)) {
      continue;
    }
    const entries = fs.readdirSync(packagePath, { withFileTypes: true });
    let newPath = packagePath;
    for (const packageInfo of packageArray) {
      newPath = `${newPath}/${packageInfo}`;
      fs.mkdirSync(newPath, { recursive: true });
    }
    for (const entry of entries) {
      copyFileSync(`${packagePath}/${entry.name}`, `${newPath}/${entry.name}`);
      fs.unlinkSync(`${packagePath}/${entry.name}`);
    }
  }
}

function renameFileSync(oldPath, newPath) {
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = {
  copyFileSync,
  copyFolderSync,
  createPackageFile,
  renameFileSync,
  ensureDirectory,
};
