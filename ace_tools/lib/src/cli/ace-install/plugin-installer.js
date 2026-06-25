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
const exec = require('child_process').execSync;
const {
  Platform,
  platform,
} = require('../ace-check/platform');
const {
  readCrossPlatformConfig,
  extractHAR,
  validateConfig,
  removeDirRecursive,
  copyDirRecursive,
} = require('../ace-build/ace-packager/har-utils');
const { getOhpmTools } = require('../ace-check/getTool');
const { getSdkVersion } = require('../util');

function installPlugin(harPath) {
  const projectDir = process.cwd();
  const absHarPath = path.resolve(harPath);
  if (!fs.existsSync(absHarPath)) {
    console.error('\x1B[31m%s\x1B[0m', `HAR file not found: ${absHarPath}`);
    return false;
  }
  if (!absHarPath.endsWith('.har')) {
    console.error('\x1B[31m%s\x1B[0m', 'File must be a .har file');
    return false;
  }

  const arkuiXDir = path.join(projectDir, '.arkui-x');
  if (!fs.existsSync(arkuiXDir)) {
    console.error('\x1B[31m%s\x1B[0m', 'Not an ArkUI-X project. .arkui-x/ not found.');
    return false;
  }

  const tmpDir = path.join(projectDir, 'build', '_plugin_install_tmp');
  removeDirRecursive(tmpDir);
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`Extracting HAR: ${path.basename(absHarPath)}`);
  if (!extractHAR(absHarPath, tmpDir)) {
    removeDirRecursive(tmpDir);
    return false;
  }

  // Flatten package/ subdirectory to root (ohpm installs expect flat structure).
  // Cross-platform HAR: {package/, android/, ios/, crossplatform-config.json5}
  // After flatten: {oh-package.json5, Index.ets, src/, android/, ios/, ...}
  const pkgSubDir = path.join(tmpDir, 'package');
  if (fs.existsSync(pkgSubDir) && fs.statSync(pkgSubDir).isDirectory()) {
    const pkgEntries = fs.readdirSync(pkgSubDir);
    pkgEntries.forEach(entry => {
      const src = path.join(pkgSubDir, entry);
      const dst = path.join(tmpDir, entry);
      if (fs.existsSync(dst)) {
        fs.rmSync(dst, { recursive: true, force: true });
      }
      fs.renameSync(src, dst);
    });
    fs.rmSync(pkgSubDir, { recursive: true, force: true });
    console.log('  Flattened package/ to root level');
  }

  const config = readCrossPlatformConfig(
    path.join(tmpDir, 'crossplatform-config.json5'));
  if (!config) {
    console.error('\x1B[31m%s\x1B[0m',
      'crossplatform-config.json5 not found in HAR');
    removeDirRecursive(tmpDir);
    return false;
  }

  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error('\x1B[31m%s\x1B[0m', errors.join('\n'));
    removeDirRecursive(tmpDir);
    return false;
  }

  const pluginName = config.name;
  console.log(`Installing: ${pluginName}@${config.version} (type: ${config.type})`);

  // compatibleSdkVersion check: warn (but continue) if project SDK < declared minimum (spec 9.3).
  checkCompatibleSdkVersion(config);

  const ohPkgPath = path.join(tmpDir, 'oh-package.json5');
  if (!fs.existsSync(ohPkgPath)) {
    console.error('\x1B[31m%s\x1B[0m', 'oh-package.json5 not found in HAR');
    removeDirRecursive(tmpDir);
    return false;
  }

  // Move extracted content to persistent .arkui-x/plugins/{name}/ for ohpm resolution
  const pluginDir = path.join(arkuiXDir, 'plugins', pluginName);
  removeDirRecursive(pluginDir);
  fs.mkdirSync(pluginDir, { recursive: true });
  copyDirRecursive(tmpDir, pluginDir);
  removeDirRecursive(tmpDir);

  // Per spec 5.3: ohpm install resolves the file: dependency into entry/oh_modules/.
  updateOhPackageJson5(config, pluginDir);
  installHarmonyOS(pluginDir, config);

  if (config.type === 'package') {
    console.log('Pure ArkTS package - no platform integration needed.');
    return true;
  }

  const crossplatformDir = pluginDir;
  const androidOk = config.android ? installAndroid(config, crossplatformDir) : false;
  let iosOk = false;
  if (config.ios && platform === Platform.MacOS) {
    iosOk = installIOS(config, crossplatformDir);
  } else if (config.ios) {
    console.log('\x1B[33m%s\x1B[0m', 'iOS integration skipped (requires macOS)');
  }

  console.log(`\n${pluginName}@${config.version} installed.`);
  console.log(`  HarmonyOS: oh_modules/${pluginName}/`);
  console.log(`  Android: ${androidOk ? 'AAR installed' : 'skipped'}`);
  console.log(`  iOS: ${iosOk ? 'xcframework installed' : 'skipped'}`);
  return true;
}

function installHarmonyOS(pluginDir, config) {
  const projectDir = process.cwd();
  const entryDir = path.join(projectDir, 'entry');
  if (!fs.existsSync(entryDir)) {
    console.warn('\x1B[33m%s\x1B[0m', 'entry/ directory not found, skip ohpm install');
    return;
  }
  const ohpmPath = getOhpmTools();
  if (!ohpmPath) {
    console.warn('\x1B[33m%s\x1B[0m', 'ohpm tool not found (ace config --ohpm-dir), skip HarmonyOS install');
    return;
  }
  try {
    exec(`"${ohpmPath}" install`, {
      cwd: entryDir,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    console.log(`  HarmonyOS: ohpm install resolved ${config.name} -> entry/oh_modules/`);
  } catch (e) {
    console.warn('\x1B[33m%s\x1B[0m', `ohpm install failed: ${e.message}`);
  }
}

function checkCompatibleSdkVersion(config) {
  if (!config.compatibleSdkVersion) {
    return;
  }
  const projectDir = process.cwd();
  const projectSdkVersion = getSdkVersion(projectDir);
  if (!projectSdkVersion) {
    return;
  }
  const projectApiLevel = extractApiLevel(projectSdkVersion);
  const declaredApiLevel = extractApiLevel(config.compatibleSdkVersion);
  if (projectApiLevel === null || declaredApiLevel === null) {
    return;
  }
  if (projectApiLevel < declaredApiLevel) {
    console.warn('\x1B[33m%s\x1B[0m',
      `compatibleSdkVersion warning: project SDK (${projectSdkVersion}) < plugin declared minimum (${config.compatibleSdkVersion}). Installation continues (spec 9.3).`);
  }
}

function extractApiLevel(versionStr) {
  const match = String(versionStr).match(/\((\d+)\)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  if (/^\d+$/.test(String(versionStr))) {
    return parseInt(versionStr, 10);
  }
  return null;
}

function updateOhPackageJson5(config, pluginDir) {
  const projectDir = process.cwd();
  const ohPackagePath = path.join(projectDir, 'entry', 'oh-package.json5');
  if (!fs.existsSync(ohPackagePath)) {
    console.warn('\x1B[33m%s\x1B[0m', 'entry/oh-package.json5 not found, skip dependency update');
    return;
  }

  try {
    let content = fs.readFileSync(ohPackagePath, 'utf-8');
    const entryDir = path.join(projectDir, 'entry');
    const relPath = path.relative(entryDir, pluginDir).replace(/\\/g, '/');
    const depRef = 'file:' + relPath;
    const depKey = config.name;

    if (content.includes(`"${depKey}"`)) {
      console.log(`  oh-package.json5: '${config.name}' already registered`);
      return;
    }

    // Handle empty {} vs non-empty { ... } dependencies to avoid trailing comma
    const emptyDepsRegex = /"dependencies"\s*:\s*\{\s*\}/;
    if (emptyDepsRegex.test(content)) {
      // Empty dependencies: {} → add entry without trailing comma
      content = content.replace(
        emptyDepsRegex,
        `"dependencies": {\n    "${depKey}": "${depRef}"\n  }`
      );
    } else {
      // Non-empty dependencies: add entry with trailing comma before existing entries
      content = content.replace(
        /"dependencies"\s*:\s*\{/,
        `"dependencies": {\n    "${depKey}": "${depRef}",`
      );
    }
    fs.writeFileSync(ohPackagePath, content);
    console.log(`  oh-package.json5: added '${config.name}': '${depRef}'`);
  } catch (e) {
    console.warn('\x1B[33m%s\x1B[0m', `oh-package.json5 update failed: ${e.message}`);
  }
}

function installAndroid(config, crossplatformDir) {
  const projectDir = process.cwd();
  const moduleName = config.android.module;
  const artifactName = config.android.artifact || `${moduleName}-release.aar`;
  const aarSrc = path.join(crossplatformDir, config.android.path || 'android', artifactName);

  if (!fs.existsSync(aarSrc)) {
    console.warn(`AAR not found: ${aarSrc}`);
    return false;
  }

  const libsDir = path.join(projectDir, '.arkui-x', 'android', 'app', 'libs');
  if (!fs.existsSync(libsDir)) {
    fs.mkdirSync(libsDir, { recursive: true });
  }
  fs.copyFileSync(aarSrc, path.join(libsDir, artifactName));

  updateAppBuildGradle(
    path.join(projectDir, '.arkui-x', 'android'), artifactName);
  console.log(`  Android: ${artifactName} -> app/libs/`);
  return true;
}

function installIOS(config, crossplatformDir) {
  const projectDir = process.cwd();
  const iosSrc = path.join(crossplatformDir, config.ios.path || 'ios');
  if (!fs.existsSync(iosSrc)) {
    console.warn('iOS dir not found in HAR');
    return false;
  }

  const frameworksDir = path.join(projectDir, '.arkui-x', 'ios', 'frameworks');
  if (!fs.existsSync(frameworksDir)) {
    fs.mkdirSync(frameworksDir, { recursive: true });
  }

  const frameworks = (config.ios.frameworks && config.ios.frameworks.length > 0)
    ? config.ios.frameworks
    : fs.readdirSync(iosSrc).filter(
        e => e.endsWith('.xcframework') && fs.statSync(path.join(iosSrc, e)).isDirectory());

  frameworks.forEach(fw => {
    const src = path.join(iosSrc, fw);
    const dst = path.join(frameworksDir, fw);
    if (!fs.existsSync(src)) {
      return;
    }
    if (fs.existsSync(dst)) {
      removeDirRecursive(dst);
    }
    copyDirRecursive(src, dst);
    console.log(`  iOS: ${fw} -> frameworks/`);
  });

  registerIosFrameworks(frameworks, frameworksDir);
  return true;
}

function registerIosFrameworks(frameworks, frameworksDir) {
  const projectDir = process.cwd();
  try {
    const { updateIosProjectPbxproj } = require(
      '../ace-build/ace-packager/adjustPbxproj4Framework');
    const depMap = new Map();
    frameworks.forEach(fw => {
      const fwPath = path.join(frameworksDir, fw);
      depMap.set(fw.replace('.xcframework', ''), {
        library: {
          ios: [fwPath],
        },
      });
    });
    updateIosProjectPbxproj('ios', projectDir, depMap, 'ios');
    console.log('  iOS: registered in project.pbxproj');
  } catch (e) {
    console.warn(`  iOS: pbxproj registration failed: ${e.message}`);
  }
}

function updateAppBuildGradle(androidDir, aarName) {
  const projectDir = process.cwd();
  const filePath = path.join(androidDir, 'app', 'build.gradle');
  if (!fs.existsSync(filePath)) {
    console.warn('app/build.gradle not found');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const depLine = `    implementation files('libs/${aarName}')`;

  if (content.includes(depLine)) {
    console.log(`  build.gradle: '${aarName}' already registered`);
    return;
  }

  const marker = '    // ACE_PLUGIN:AUTO_GENERATED';
  const endMarker = '    // ACE_PLUGIN:END';

  if (content.includes(marker)) {
    content = content.replace(endMarker, `${depLine}\n${endMarker}`);
  } else {
    const depsMatch = content.match(/dependencies\s*\{[\s\S]*?\}/);
    if (depsMatch) {
      content = content.replace(depsMatch[0],
        depsMatch[0].replace('}',
          `${marker}\n${depLine}\n${endMarker}\n}`));
    } else {
      content += `\ndependencies {\n${marker}\n${depLine}\n${endMarker}\n}\n`;
    }
  }
  fs.writeFileSync(filePath, content);
}

module.exports = { installPlugin };
