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
const JSON5 = require('json5');
const { replaceInfo } = require('../util/index');

function logError(message) {
  console.log('\x1B[31m%s\x1B[0m', message);
}

function logWarn(message) {
  console.log('\x1b[33m%s\x1B[0m', message);
}

function logInfo(message) {
  console.log(message);
}

function readJson5(filePath) {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson5(filePath, data) {
  fs.writeFileSync(filePath, JSON5.stringify(data), 'utf8');
}

function readJson5IfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return readJson5(filePath);
}

function writeJson5Safe(filePath, data) {
  try {
    writeJson5(filePath, data);
    return true;
  } catch (error) {
    logError(`Error: Failed to write file ${filePath}: ${error.message}`);
    return false;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function buildReplaceTask(file, search, replacement) {
  return { file, search, replacement };
}

function executeReplaceTasks(tasks) {
  if (!tasks || tasks.length === 0) {
    return;
  }
  const files = [];
  const searches = [];
  const replacements = [];
  for (const task of tasks) {
    if (!task.file || !task.search) {
      logWarn(`Warning: skipping invalid replace task (missing file or search pattern)`);
      continue;
    }
    files.push(task.file);
    searches.push(task.search);
    replacements.push(task.replacement);
  }
  if (files.length > 0) {
    replaceInfo(files, searches, replacements);
  }
}

function safeRenameSync(oldPath, newPath) {
  if (!fs.existsSync(oldPath)) {
    return false;
  }
  try {
    fs.renameSync(oldPath, newPath);
    return true;
  } catch (error) {
    logError(`Error: Failed to rename ${oldPath} to ${newPath}: ${error.message}`);
    return false;
  }
}

function writeProjectInfoFile(filePath, content) {
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
}

module.exports = {
  logError,
  logWarn,
  logInfo,
  readJson5,
  writeJson5,
  readJson5IfExists,
  writeJson5Safe,
  fileExists,
  ensureDir,
  buildReplaceTask,
  executeReplaceTasks,
  safeRenameSync,
  writeProjectInfoFile,
};
