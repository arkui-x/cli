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
const os = require('os');
const exec = require('child_process').execSync;
const JSON5 = require('json5');
const {
  createHAR,
  extractHAR,
  readCrossPlatformConfig,
  writeCrossPlatformConfig,
  validateConfig,
  removeDirRecursive,
  copyDirRecursive,
} = require('./har-utils');
const {
  Platform,
  platform,
} = require('../../ace-check/platform');
const { getSdkVersion, getCreatedPlatforms } = require('../../util');
const { copyLibraryToProject } = require('./copyLibraryToProject');

/**
 * Auto-discover the HAR module name.
 * Strategy: 1) crossplatform-config.json5 → 2) oh-package.json5 deps with file: prefix → 3) build-profile.json5
 */
function discoverHarModule() {
  const projectDir = process.cwd();
  // Strategy 1: Check crossplatform-config.json5
  const configPath = path.join(projectDir, '.arkui-x', 'crossplatform-config.json5');
  const config = readCrossPlatformConfig(configPath);
  if (config && config.name) {
    return config.name;
  }

  // Strategy 2: Check oh-package.json5 for local file: dependencies
  const ohPackagePath = path.join(projectDir, 'oh-package.json5');
  if (fs.existsSync(ohPackagePath)) {
    const ohPackage = JSON5.parse(fs.readFileSync(ohPackagePath).toString());
    const deps = ohPackage.dependencies || {};
    const localDeps = Object.keys(deps).filter(k =>
      deps[k].startsWith('file:') && k !== 'entry'
    );
    if (localDeps.length === 1) {
      return localDeps[0];
    }
    if (localDeps.length > 1) {
      console.error('\x1B[31m%s\x1B[0m',
        `Multiple local dependencies found: ${localDeps.join(', ')}. Please specify only one local dependency in oh-package.json5.`);
      return null;
    }
  }

  // Strategy 3: Fallback to build-profile.json5 non-entry modules
  const buildProfilePath = path.join(projectDir, 'build-profile.json5');
  if (fs.existsSync(buildProfilePath)) {
    const buildProfile = JSON5.parse(fs.readFileSync(buildProfilePath).toString());
    const modules = buildProfile.modules || [];
    const harModules = modules.filter(m => m.name !== 'entry');
    if (harModules.length === 1) {
      return harModules[0].name;
    }
    if (harModules.length > 1) {
      console.error('\x1B[31m%s\x1B[0m',
        `Multiple HAR modules found: ${harModules.map(m=>m.name).join(', ')}. Please specify only one HAR module in build-profile.json5.`);
      return null;
    }
  }

  return null;
}

/**
 * Detect plugin type from project structure or crossplatform-config
 */
function detectPluginType(moduleName) {
  const projectDir = process.cwd();
  const configPath = path.join(projectDir, '.arkui-x', 'crossplatform-config.json5');
  let config = readCrossPlatformConfig(configPath);
  if (config && config.type) {
    return config.type;
  }
  // Infer from structure: has cpp → ffi, has java → plugin, neither → package
  const cppDir = path.join(projectDir, moduleName, 'src', 'main', 'cpp');
  const javaDir = path.join(projectDir, '.arkui-x', 'android', moduleName);
  if (fs.existsSync(cppDir)) return 'ffi';
  if (fs.existsSync(javaDir)) return 'plugin';
  return 'package';
}

/**
 * Build cross-platform plugin HAR
 * @param {object} cmd - Commander options
 * @returns {boolean} Success
 */
function buildPluginHAR(cmd) {
  const projectDir = process.cwd();
  const moduleName = discoverHarModule();
  if (!moduleName) {
    console.error('\x1B[31m%s\x1B[0m',
      'Cannot find HAR module. Add a local dependency in oh-package.json5 or register in build-profile.json5.');
    return false;
  }
  console.log(`Auto-discovered HAR module: ${moduleName}`);

  // Auto-detect type
  const type = detectPluginType(moduleName);
  console.log(`Detected plugin type: ${type}`);

  // Read or auto-generate crossplatform-config
  const configPath = path.join(projectDir, '.arkui-x', 'crossplatform-config.json5');
  let config = readCrossPlatformConfig(configPath);
  if (!config) {
    config = { name: moduleName, version: '1.0.0', type: type };
    if (type !== 'package') {
      config.android = {
        path: 'android',
        module: moduleName,
        artifact: `${moduleName}-release.aar`,
      };
      config.ios = {
        path: 'ios',
        module: moduleName,
        frameworks: [],
      };
    }
    console.error('\x1B[31m%s\x1B[0m', `crossplatform-config.json5 not found, auto-generated for '${moduleName}'`);
  }

  if (config.type && config.type !== type) {
    console.error('\x1B[31m%s\x1B[0m',
      `Config type '${config.type}' does not match build target '${type}'`);
    return false;
  }

  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error('\x1B[31m%s\x1B[0m', `Invalid config:\n  ${errors.join('\n  ')}`);
    return false;
  }

  const harFile = path.join(projectDir, moduleName,
    'build', 'default', 'outputs', 'default', `${moduleName}.har`);

  if (!fs.existsSync(harFile)) {
    console.error('\x1B[31m%s\x1B[0m',
      `HAR not found: ${harFile}. Compilation may have failed.`);
    return false;
  }

  // Create staging directory
  // HAR structure (ohpm compatible, keeps package/ subdirectory):
  //   stagingDir/
  //   ├── package/                    # ohpm standard content (preserved from HarmonyOS HAR)
  //   │   ├── oh-package.json5        # main: 'Index.ets' (HarmonyOS original, not overwritten)
  //   │   ├── Index.ets
  //   │   └── src/main/ets/
  //   ├── crossplatform-config.json5
  //   ├── android/
  //   └── ios/
  const stagingDir = path.join(projectDir, 'build', '_plugin_staging');
  removeDirRecursive(stagingDir);
  fs.mkdirSync(stagingDir, { recursive: true });

  const packageDir = path.join(stagingDir, 'package');
  fs.mkdirSync(packageDir, { recursive: true });
  if (!extractHAR(harFile, packageDir)) {
    console.error('\x1B[31m%s\x1B[0m', 'Failed to extract HAR for staging');
    return false;
  }

  const metaDir = path.join(packageDir, 'META-INF');
  if (!fs.existsSync(metaDir)) {
    fs.mkdirSync(metaDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(metaDir, 'MANIFEST.MF'),
    'Manifest-Version: 1.0\n'
  );

  const createdPlatforms = getCreatedPlatforms(projectDir);

  let androidOk = true;
  if ((type === 'ffi' || type === 'plugin') && createdPlatforms.includes('android')) {
    androidOk = buildAndroidAAR(moduleName, stagingDir, config, projectDir);
  }

  // Phase 3: iOS xcframework (FFI/Plugin, macOS only) → stagingDir/ios/
  let iosOk = true;
  if ((type === 'ffi' || type === 'plugin') && createdPlatforms.includes('ios')) {
    if (platform === Platform.MacOS) {
      copyLibraryToProject('ios', cmd, projectDir, 'ios', true);
      iosOk = buildIOSXcFramework(moduleName, stagingDir, config, projectDir);
      if (iosOk) {
        // Re-write crossplatform-config.json5 after iOS build, since
        // buildIOSXcFramework updates config.ios.frameworks with the xcframework names
        writeCrossPlatformConfig(
          path.join(stagingDir, 'crossplatform-config.json5'), config);
      }
    } else {
      console.log('\x1B[33m%s\x1B[0m',
        'iOS xcframework requires macOS. Skipping iOS build.');
    }
  }

  writeCrossPlatformConfig(
    path.join(stagingDir, 'crossplatform-config.json5'), config);

  if (!androidOk && !iosOk) {
    console.error('\x1B[31m%s\x1B[0m',
      'All platform builds failed. Cannot create cross-platform HAR.');
    removeDirRecursive(stagingDir);
    return false;
  }

  // Phase 4: Create final cross-platform HAR
  const outputDir = path.join(projectDir, 'build', 'outputs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputHar = path.join(outputDir, `${moduleName}.har`);
  if (!createHAR(stagingDir, outputHar)) {
    console.error('\x1B[31m%s\x1B[0m', 'Failed to create cross-platform HAR');
    return false;
  }

  removeDirRecursive(stagingDir);
  console.log(`Cross-platform plugin HAR built: ${outputHar}`);
  console.log(`  Type: ${type}  Module: ${moduleName}`);
  return true;
}

/**
 * Phase 2: Build Android AAR via gradlew assembleRelease
 */
function buildAndroidAAR(moduleName, stagingDir, config, projectDir) {
  const androidDir = path.join(projectDir, '.arkui-x', 'android');
  if (!fs.existsSync(androidDir)) {
    console.warn('Android project not found at .arkui-x/android');
    return false;
  }

  const settingsPluginGradle = path.join(androidDir, 'settings-plugin.gradle');
  const settingsGradle = path.join(androidDir, 'settings.gradle');
  let effectiveSettings = settingsGradle;
  if (fs.existsSync(settingsPluginGradle)) {
    effectiveSettings = settingsPluginGradle;
  }
  if (!fs.existsSync(effectiveSettings)) {
    console.warn('settings.gradle not found');
    return false;
  }
  const settingsContent = fs.readFileSync(effectiveSettings, 'utf-8');
  if (!settingsContent.includes(`':${moduleName}'`)) {
    console.warn(`Module '${moduleName}' not in ${path.basename(effectiveSettings)}`);
    return false;
  }

  const { arkuiXSdkDir } = require('../../ace-check/configs');
  const { javaSdkDirAndroid } = require('../../ace-check/configs');
  const { setJavaSdkDirInEnv } = require('../../ace-check/checkJavaSdk');

  process.env.ARKUIX_SDK_HOME = arkuiXSdkDir;
  setJavaSdkDirInEnv(javaSdkDirAndroid);

  const sdkVersion = getSdkVersion(projectDir);
  const sdkEngineDir = path.join(arkuiXSdkDir, String(sdkVersion), 'arkui-x', 'engine', 'lib', 'arkui');
  const appLibsDir = path.join(androidDir, 'app', 'libs');
  const abiMap = {
    'arm64-v8a': 'android-arm64-release',
    'armeabi-v7a': 'android-arm-release',
    'x86_64': 'android-x86_64',
  };
  for (const [abi, sdkDir] of Object.entries(abiMap)) {
    const srcSo = path.join(sdkEngineDir, sdkDir, 'libarkui_android.so');
    const dstDir = path.join(appLibsDir, abi);
    const dstSo = path.join(dstDir, 'libarkui_android.so');
    if (fs.existsSync(srcSo)) {
      if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
      }
      if (!fs.existsSync(dstSo)) {
        fs.copyFileSync(srcSo, dstSo);
      }
      for (const extraSo of ['libarkui_componentsnapshot.so', 'libarkui_focuscontroller.so']) {
        const srcExtra = path.join(sdkEngineDir, sdkDir, extraSo);
        const dstExtra = path.join(dstDir, extraSo);
        if (fs.existsSync(srcExtra) && !fs.existsSync(dstExtra)) {
          fs.copyFileSync(srcExtra, dstExtra);
        }
      }
    }
  }

  const gradleCmd = os.platform() === 'win32' ? 'gradlew.bat' : './gradlew';
  try {
    console.log(`Building Android AAR for ${moduleName}...`);
    if (os.platform() !== 'win32') {
      fs.chmodSync(path.join(androidDir, 'gradlew'), 0o755);
    }
    exec(`${gradleCmd} -c ${path.basename(effectiveSettings)} :${moduleName}:assembleRelease`, {
      cwd: androidDir,
      encoding: 'utf-8',
      stdio: 'inherit',
    });
  } catch (e) {
    console.error('\x1B[31m%s\x1B[0m', `Android AAR build failed for ${moduleName}`);
    return false;
  }

  // Find built AAR
  const aarPath = path.join(androidDir, moduleName,
    'build', 'outputs', 'aar', `${moduleName}-release.aar`);
  if (!fs.existsSync(aarPath)) {
    console.warn(`AAR not found at ${aarPath}`);
    return false;
  }

  // Per spec 2.4: strip libarkui_android.so from AAR (engine lib provided by SDK).
  stripLibarkuiFromAAR(aarPath);

  // Copy AAR to staging/android/
  const androidStaging = path.join(stagingDir, 'android');
  if (!fs.existsSync(androidStaging)) {
    fs.mkdirSync(androidStaging, { recursive: true });
  }
  const aarName = `${moduleName}-release.aar`;
  fs.copyFileSync(aarPath, path.join(androidStaging, aarName));

  if (!config.android) {
    config.android = {};
  }
  config.android.artifact = aarName;
  console.log(`  Android: ${aarName} (${(fs.statSync(aarPath).size / 1024).toFixed(0)}KB)`);
  return true;
}

/**
 * Strip libarkui_android.so from an AAR's jni/{abi}/ directories.
 * Per spec 2.4: the engine lib (~89MB) is provided by the SDK at runtime,
 * so it must not be embedded in plugin AARs.
 * Preserves classes.jar, AndroidManifest.xml, and all other .so files.
 */
function stripLibarkuiFromAAR(aarPath) {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(aarPath);
    let stripped = 0;
    const entries = zip.getEntries();
    const toRemove = [];
    for (const entry of entries) {
      if (entry.entryName.match(/^jni\/[^/]+\/libarkui_android\.so$/)) {
        toRemove.push(entry.entryName);
        stripped++;
      }
    }
    if (stripped > 0) {
      const beforeSize = fs.statSync(aarPath).size;
      for (const name of toRemove) {
        zip.deleteEntry(name);
      }
      zip.writeZip(aarPath);
      const afterSize = fs.statSync(aarPath).size;
      console.log(`  AAR stripped libarkui_android.so (x${stripped}): ` +
        `${(beforeSize / 1024 / 1024).toFixed(1)}MB -> ${(afterSize / 1024 / 1024).toFixed(1)}MB`);
    } else {
      console.log('  AAR: no libarkui_android.so found (already clean)');
    }
  } catch (e) {
    console.warn(`  AAR strip skipped: ${e.message}`);
  }
}

/**
 * Phase 3: Build iOS xcframework via xcodebuild + -create-xcframework
 * Follows the official pattern from ace-packager/index.js buildXcFramework()
 */
function buildIOSXcFramework(moduleName, stagingDir, config, projectDir) {
  const iosDir = path.join(projectDir, '.arkui-x', 'ios');
  if (!fs.existsSync(iosDir)) {
    console.warn('iOS project not found');
    return false;
  }

  const frameworkName = (config.ios && config.ios.module) ? config.ios.module : moduleName;
  const xcodeproj = path.join(iosDir, `${frameworkName}.xcodeproj`);
  const buildScript = path.join(iosDir, 'scripts', 'build.sh');

  // Step 1: Build .framework via xcodebuild
  if (fs.existsSync(xcodeproj)) {
    const mode = 'Release';
    const builtFramework = path.join(iosDir, `build/${mode}-iphoneos/${frameworkName}.framework`);
    const exportPath = path.join(iosDir, 'build/outputs/ios-xcframework');
    const xcFrameworkPath = path.join(exportPath, `${frameworkName}.xcframework`);

    // Clean old xcframework output to avoid "item with the same name already exists" error
    if (fs.existsSync(xcFrameworkPath)) {
      fs.rmSync(xcFrameworkPath, { recursive: true, force: true });
    }

    const cmds = [
      `xcodebuild -project ${xcodeproj} -sdk iphoneos -configuration "${mode}" ` +
        `generic/platform="iOS" ARCHS=arm64 build`,
      `xcodebuild -create-xcframework -framework ${builtFramework} -output ${xcFrameworkPath}`,
    ];

    try {
      console.log('Building iOS xcframework via xcodebuild...');
      cmds.forEach(cmdStr => {
        exec(cmdStr, { encoding: 'utf-8', stdio: 'inherit' });
      });

      // Fix framework directory case mismatch: Xcode's c99extidentifier lowercases the first letter
      // of TARGET_NAME, so the binary file and install name use lowercase (e.g. ffitest030lib) while
      // the xcframework Info.plist LibraryPath uses the original case (e.g. ffiTest030lib.framework).
      // macOS is case-insensitive so local builds pass, but iOS APFS is case-sensitive and dyld
      // fails to find the framework at launch with "Library missing" error.
      const fwDirOriginal = path.join(xcFrameworkPath, 'ios-arm64', `${frameworkName}.framework`);
      const fwNameLower = frameworkName.toLowerCase();
      const fwDirLower = path.join(xcFrameworkPath, 'ios-arm64', `${fwNameLower}.framework`);
      if (fs.existsSync(fwDirOriginal) && frameworkName !== fwNameLower) {
        // macOS APFS is case-insensitive by default, so direct rename fails silently.
        // Use a two-step rename through a temporary name to force the case change.
        const tempName = `${fwNameLower}_tmp_${Date.now()}.framework`;
        const tempDir = path.join(xcFrameworkPath, 'ios-arm64', tempName);
        fs.renameSync(fwDirOriginal, tempDir);
        fs.renameSync(tempDir, fwDirLower);

        // Update xcframework Info.plist LibraryPath to match the renamed directory
        const plistPath = path.join(xcFrameworkPath, 'Info.plist');
        if (fs.existsSync(plistPath)) {
          let plistContent = fs.readFileSync(plistPath, 'utf-8');
          plistContent = plistContent.replace(
            `<string>${frameworkName}.framework</string>`,
            `<string>${fwNameLower}.framework</string>`,
          );
          fs.writeFileSync(plistPath, plistContent);
        }

        console.log(`Fixed framework case: ${frameworkName}.framework -> ${fwNameLower}.framework`);
      }
    } catch (e) {
      console.error('\x1B[31m%s\x1B[0m', 'iOS xcodebuild failed');
      return false;
    }
  } else if (fs.existsSync(buildScript)) {
    try {
      console.log('Building iOS xcframework via build script...');
      exec('bash scripts/build.sh', {
        cwd: iosDir,
        encoding: 'utf-8',
        stdio: 'inherit',
      });
    } catch (e) {
      console.error('\x1B[31m%s\x1B[0m', 'iOS build script failed');
      return false;
    }
  } else {
    console.warn('No iOS build mechanism found');
    return false;
  }

  // Step 2: Find and copy .xcframework to staging
  const searchDirs = [
    path.join(iosDir, 'build', 'outputs', 'ios-xcframework'),
    path.join(iosDir, 'build'),
  ];
  const iosStaging = path.join(stagingDir, 'ios');

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    const xcfws = findXcframeworks(dir);
    if (xcfws.length > 0) {
      if (!fs.existsSync(iosStaging)) {
        fs.mkdirSync(iosStaging, { recursive: true });
      }
      xcfws.forEach(xc => {
        copyDirRecursive(
          path.join(dir, xc),
          path.join(iosStaging, xc),
        );
      });
      if (!config.ios) {
        config.ios = {};
      }
      config.ios.frameworks = xcfws;
      console.log(`  iOS: ${xcfws.join(', ')}`);
      return true;
    }
  }
  console.warn('No xcframework found');
  return false;
}

/**
 * Recursively find .xcframework directories under a given dir (shallow)
 */
function findXcframeworks(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  fs.readdirSync(dir).forEach(entry => {
    if (entry.endsWith('.xcframework') &&
        fs.statSync(path.join(dir, entry)).isDirectory()) {
      results.push(entry);
    }
  });
  return results;
}

module.exports = { buildPluginHAR };
