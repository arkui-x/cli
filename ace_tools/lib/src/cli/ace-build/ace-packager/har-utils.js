/*
 * Copyright (c) 2022-2026 Huawei Device Co., Ltd.
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
const tar = require('tar');
const JSON5 = require('json5');

/**
 * Read and parse crossplatform-config.json5
 */
function readCrossPlatformConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON5.parse(content);
  } catch (e) {
    console.error('\x1B[31m%s\x1B[0m', `Failed to parse crossplatform-config.json5: ${e.message}`);
    return null;
  }
}

/**
 * Write crossplatform-config.json5
 */
function writeCrossPlatformConfig(configPath, config) {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON5.stringify(config, null, 2) + '\n');
}

/**
 * Extract HAR (gzip tar) to a directory
 */
function extractHAR(harPath, destDir) {
  if (!fs.existsSync(harPath)) {
    console.error('\x1B[31m%s\x1B[0m', `HAR file not found: ${harPath}`);
    return false;
  }
  try {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    tar.x({ file: harPath, cwd: destDir, gzip: true, sync: true });
    // Flatten if single top-level directory
    const entries = fs.readdirSync(destDir).filter(e => !e.endsWith('.tar'));
    if (entries.length === 1 && fs.statSync(path.join(destDir, entries[0])).isDirectory()) {
      const innerDir = path.join(destDir, entries[0]);
      fs.readdirSync(innerDir).forEach(entry => {
        const src = path.join(innerDir, entry);
        const dst = path.join(destDir, entry);
        if (fs.existsSync(dst)) {
          fs.rmSync(dst, { recursive: true, force: true });
        }
        fs.renameSync(src, dst);
      });
      fs.rmdirSync(innerDir);
    }
    return true;
  } catch (e) {
    console.error('\x1B[31m%s\x1B[0m', `Failed to extract HAR: ${e.message}`);
    return false;
  }
}

/**
 * Create HAR (gzip tar) from a directory
 */
function createHAR(sourceDir, outputPath) {
  try {
    const entries = fs.readdirSync(sourceDir);
    if (entries.length === 0) {
      console.error('\x1B[31m%s\x1B[0m', `No entries found in ${sourceDir} to archive`);
      return false;
    }
    tar.c({ file: outputPath, cwd: sourceDir, gzip: true, sync: true }, entries);
    return true;
  } catch (e) {
    console.error('\x1B[31m%s\x1B[0m', `Failed to create HAR: ${e.message}`);
    return false;
  }
}

/**
 * Validate crossplatform-config.json5 required fields
 */
function validateConfig(config) {
  const errors = [];
  if (!config.name) {
    errors.push('Missing required field: name');
  }
  if (!config.version) {
    errors.push('Missing required field: version');
  }
  if (!['package', 'ffi', 'plugin'].includes(config.type)) {
    errors.push(`Invalid type: ${config.type}. Must be package, ffi, or plugin`);
  }
  if (config.platform !== undefined) {
    if (!Array.isArray(config.platform)) {
      errors.push('platform must be an array');
    } else {
      config.platform.forEach(p => {
        if (p !== 'android' && p !== 'iOS') {
          errors.push(`Invalid platform value: ${p}. Must be 'android' or 'iOS'`);
        }
      });
    }
  }
  if (config.compatibleSdkVersion !== undefined) {
    if (!/^\d+\.\d+\.\d+(\(\d+\))?$/.test(String(config.compatibleSdkVersion))) {
      errors.push(`Invalid compatibleSdkVersion: ${config.compatibleSdkVersion}. Expected format: 6.0.0 or 6.0.0(20)`);
    }
  }
  if (config.type === 'ffi' || config.type === 'plugin') {
    const platList = Array.isArray(config.platform) ? config.platform.map(p => p.toLowerCase()) : ['android', 'ios'];
    if (platList.includes('android') && (!config.android || !config.android.module)) {
      errors.push('FFI/Plugin requires android.module');
    }
    if (platList.includes('ios') && (!config.ios || !config.ios.module)) {
      errors.push('FFI/Plugin requires ios.module');
    }
  }
  return errors;
}

/**
 * Remove directory recursively
 */
function removeDirRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Copy directory recursively
 */
function copyDirRecursive(src, dst) {
  if (!fs.existsSync(dst)) {
    fs.mkdirSync(dst, { recursive: true });
  }
  fs.readdirSync(src).forEach(entry => {
    const srcPath = path.join(src, entry);
    const dstPath = path.join(dst, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      const parentDir = path.dirname(dstPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, dstPath);
    }
  });
}

module.exports = {
  readCrossPlatformConfig,
  writeCrossPlatformConfig,
  extractHAR,
  createHAR,
  validateConfig,
  removeDirRecursive,
  copyDirRecursive,
};
