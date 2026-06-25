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
const zlib = require('zlib');
const exec = require('child_process').execSync;
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
    console.error(`Failed to parse crossplatform-config.json5: ${e.message}`);
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
    console.error(`HAR file not found: ${harPath}`);
    return false;
  }
  try {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const gunzipped = harPath + '.tar';
    const compressed = fs.readFileSync(harPath);
    const decompressed = zlib.gunzipSync(compressed);
    fs.writeFileSync(gunzipped, decompressed);
    exec(`tar -xf "${gunzipped}" -C "${destDir}"`, { encoding: 'utf-8' });
    fs.unlinkSync(gunzipped);
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
    console.error(`Failed to extract HAR: ${e.message}`);
    return false;
  }
}

/**
 * Create HAR (gzip tar) from a directory
 */
function createHAR(sourceDir, outputPath) {
  try {
    const tmpTar = outputPath + '.tar';
    const entries = fs.readdirSync(sourceDir).join(' ');
    if (!entries) {
      console.error(`No entries found in ${sourceDir} to archive`);
      return false;
    }
    const osModule = require('os');
    let tarCmd;
    if (osModule.platform() === 'win32') {
      tarCmd = `tar -cf "${tmpTar}" -C "${sourceDir}" ${entries}`;
    } else {
      tarCmd = `COPYFILE_DISABLE=1 tar -cf "${tmpTar}" --no-xattrs --no-acls -C "${sourceDir}" ${entries}`;
    }
    exec(tarCmd, { encoding: 'utf-8' });
    const tarData = fs.readFileSync(tmpTar);
    const compressed = zlib.gzipSync(tarData);
    fs.writeFileSync(outputPath, compressed);
    fs.unlinkSync(tmpTar);
    return true;
  } catch (e) {
    console.error(`Failed to create HAR: ${e.message}`);
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
    if (!config.android || !config.android.module) {
      errors.push('FFI/Plugin requires android.module');
    }
    if (!config.ios || !config.ios.module) {
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
