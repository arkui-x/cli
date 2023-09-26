#!/usr/bin/env node
/*
 * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
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

const path = require('path');
const program = require('commander');
const inquirer = require('inquirer');
const { Platform, platform } = require('./src/cli/ace-check/platform');
const create = require('./src/cli/ace-create/project');
const createModule = require('./src/cli/ace-create/module');
const { createAbility } = require('./src/cli/ace-create/ability');
const { setConfig } = require('./src/cli/ace-config');
const check = require('./src/cli/ace-check');
const { devices, getDeviceID, showValidDevice, getDeviceType } = require('./src/cli/ace-devices');
const compiler = require('./src/cli/ace-build/ace-compiler');
const build = require('./src/cli/ace-build');
const {install} = require('./src/cli/ace-install');
const uninstall = require('./src/cli/ace-uninstall');
const { log } = require('./src/cli/ace-log');
const launch = require('./src/cli/ace-launch');
const run = require('./src/cli/ace-run');
const clean = require('./src/cli/ace-clean');
const test = require('./src/cli/ace-test');

process.env.toolsPath = process.env.toolsPath || path.join(__dirname, '../');
globalThis.templatePath = path.join(__dirname,'..','templates');
parseCommander();
function parseCommander() {
  program.version(require('../package').version);
  program.usage('<command> [options]').name('ace');
  program.option('-d, --device <device>', 'input device id to specify the device to do something');

  parseCreate();
  parseNew();
  parseCheck();
  parseDevices();
  parseConfig();
  parseBuild();
  parseInstall();
  parseUninstall();
  parseRun();
  parseLaunch();
  parseLog();
  parseClean();
  parseTest();

  program.parse(process.argv);
}

function isProjectNameValid(name) {
  const regex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  if (name.length < 1 || name.length > 200) {
    return false;
  }
  return regex.test(name);
}

function isBundleNameValid(name) {
  const regex = /^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/;
  if (name.length < 7 || name.length > 128) {
    return false;
  }
  return regex.test(name);
}

function parseCreate() {
  program.command('create')
    .description(`create ace project/module/component/ability`)
    .action((cmd) => {
      inquirer.prompt([{
        name: 'project',
        type: 'input',
        message: 'Please enter the project name:',
        validate(val) {
          if (val === '') {
            return 'Project name must be required!';
          } else if (!isProjectNameValid(val)) {
            return 'The project name must contain 1 to 200 characters, start with a ' +
              'letter, and include only letters, digits and underscores (_)';
          }
          return true;
        }
      }]).then(answers => {
        const initInfo = {};
        initInfo.platform = '';
        initInfo.project = answers.project;
        inquirer.prompt([{
          name: 'packages',
          type: 'input',
          message: 'Please enter the bundle name (com.example.' + initInfo.project.toLowerCase() + '):',
          validate(val) {
            if (!val) {
              val = 'com.example.' + initInfo.project.toLowerCase();
            }
            if (!isBundleNameValid(val)) {
              return 'The bundle name must contain 7 to 128 characters,start with a letter,and include ' +
              'only lowercase letters, digits,underscores(_) and at least one separator(.).';
            }
            return true;
          }
        }]).then(answers => {
          initInfo.packages = answers.packages ? answers.packages.toLowerCase()
            : 'com.example.' + initInfo.project.toLowerCase();
          inquirer.prompt([{
            name: 'system',
            type: 'input',
            message: 'Please enter the system (1: OpenHarmony, 2: HarmonyOS):',
            validate(val) {
              if (val === '1' || val === '2') {
                return true;
              } else {
                return 'system must be an integer: 1 or 2.';
              }
            }
          }]).then(answers => {
            initInfo.system = answers.system;
            inquirer.prompt([{
              name: 'proType',
              type: 'input',
              message: 'Please enter the project type (1: Application, 2: Library):',
              validate(val) {
                if (val === '1' || val === '2') {
                  return true;
                } else {
                  return 'project type must be an integer: 1 or 2.';
                }
              }
            }]).then(answers => {
              initInfo.proType = answers.proType;
              inquirer.prompt([{
                name: 'template',
                type: 'input',
                message: 'Please enter the template (1: Empty Ability, 2: Native C++):',
                validate(val) {
                  if (val === '1' || val === '2') {
                    return true;
                  } else {
                    return 'template must be an integer: 1 or 2.';
                  }
                }
              }]).then(answers => {
                initInfo.template = answers.template;
                initInfo.sdkVersion = '10';
                create(initInfo);
              });
            });
          });
        });
      });
  });
}

function parseNew() {
  program.command('new [subcommand]')
    .description('create abilit/module in project')
    .action((subcommand,cmd) => {
      if(subcommand === 'module') {
        createModule();
      }else if(subcommand === 'ability') {
        createAbility();
      } else {
        console.log(`Please use ace new with subcommand: module/ability`);
      }
  })
}

function parseCheck() {
  program.command('check').option('-v|--v', 'show details').description('check sdk environment').action((cmd) => {
    check(cmd);
  });
}

function parseDevices() {
  program.command('devices').description('list the connected devices.').action(() => {
    devices();
  });
}

function parseConfig() {
  program.command('config')
    .option('--openharmony-sdk [OpenHarmony Sdk]', 'openharmony-sdk path')
    .option('--harmonyos-sdk [HarmonyOS Sdk]', 'harmonyos-sdk path')
    .option('--android-sdk [Android Sdk]', 'android-sdk path')
    .option('--deveco-studio-path [DevEco Studio Path]', 'deveco-studio path')
    .option('--android-studio-path [Android Studio Path]', 'android-studio path')
    .option('--build-dir [Build Dir]', 'build-dir path')
    .option('--nodejs-dir [Nodejs Dir]', 'nodejs-dir path')
    .option('--java-sdk [Java Sdk]', 'java-sdk path')
    .option('--arkui-x-sdk [ArkUI-X SDK]', 'arkui-x-sdk path')
    .option('--ohpm-dir [Ohpm Dir]', 'ohpm path')
    .description(`
        --openharmony-sdk     [OpenHarmony SDK]
        --harmonyos-sdk       [HarmonyOS SDK]
        --android-sdk         [Android Sdk]
        --deveco-studio-path  [DevEco Studio Path]
        --android-studio-path [Android Studio Path]
        --build-dir           [Build Dir]
        --nodejs-dir          [Nodejs Dir]
        --arkui-x-sdk         [ArkUI-X SDK]
        --ohpm-dir            [Ohpm Dir]`)

    .action((cmd, description) => {
      if (cmd.openharmonySdk || cmd.harmonyosSdk || cmd.androidSdk || cmd.devecoStudioPath || cmd.androidStudioPath
        || cmd.buildDir ||
        cmd.nodejsDir || cmd.javaSdk || cmd.signDebug || cmd.signRelease || cmd.arkuiXSdk || cmd.ohpmDir) {
        setConfig({
          'openharmony-sdk': cmd.openharmonySdk,
          'harmonyos-sdk': cmd.harmonyosSdk,
          'android-sdk': cmd.androidSdk,
          'deveco-studio-path': cmd.devecoStudioPath,
          'android-studio-path': cmd.androidStudioPath,
          'build-dir': cmd.buildDir,
          'nodejs-dir': cmd.nodejsDir,
          'java-sdk': cmd.javaSdk,
          'arkui-x-sdk': cmd.arkuiXSdk,
          'ohpm-dir': cmd.ohpmDir
        });
      } else {
        console.log('Please use ace config with options :' + description._description);
      }
    });
}

function parseBuild() {
  program.command('build [fileType]')
    .option('--target [moduleName]', 'name of module to be built')
    .option('-r --release', 'build as release')
    .option('--debug', 'build as debug')
    .option('--nosign', 'build without sign')
    .option('-s | --simulator', 'build for iOS Simulator')
    .description('build hap/apk/app/aar/framework/xcframework of moduleName')
    .action((fileType, cmd) => {
      cmd.simulator = cmd.simulator && platform === Platform.MacOS && fileType === 'app';
      if (cmd.release && cmd.debug) {
        console.log('\x1B[31m%s\x1B[0m', 'Warning: Release and debug are not allowed to exist at the same time.');
        return false;
      }
      if (fileType === 'hap' || typeof fileType === 'undefined') {
        compiler('hap', cmd);
      } else if (fileType === 'apk' || fileType === 'app' || fileType === 'aar' ||
        fileType === 'framework' || fileType === 'xcframework') {
        build(fileType, cmd);
      } else {
        console.log(`Please use ace build with subcommand : hap, apk, aar, app, framework or xcframework.`);
      }
    });
}

function parseInstall() {
  program.command('install [fileType]')
    .option('--target [moduleName]', 'name of module to be installed')
    .description('install hap/apk/app on device')
    .action((fileType, options, cmd) => {
      options.target = options.target || 'entry';
      execCmd(fileType, options.target, cmd, install);
    });
}

function parseUninstall() {
  program.command('uninstall [fileType]')
    .option('--bundle <bundleName>', 'bundleName to be uninstalled')
    .description('uninstall hap/apk/app on device')
    .action((fileType, options, cmd) => {
      if (!options.bundle) {
        console.log(`Please input bundleName with --bundle.`);
        return false;
      }
      execCmd(fileType, options.bundle, cmd, uninstall);
    });
}

function parseRun() {
  program.command('run [fileType]')
    .description('run hap/apk on device')
    .option('--target [moduleName]', 'name of module to be installed')
    .action((fileType, options, cmd) => {
      execCmd(fileType, options, cmd, run);
    });
}

function parseLaunch() {
  program.command('launch [fileType]')
    .option('--target [moduleName]', 'name of module to be launched')
    .description('launch hap/apk on device')
    .action((fileType, options, cmd) => {
      options.target = options.target || 'entry';
      execCmd(fileType, options, cmd, launch);
    });
}

function parseLog() {
  program.command('log [fileType]')
    .description('show debug log')
    .action((fileType, options, cmd) => {
      execCmd(fileType, '', cmd, log);
    });
}

function parseClean() {
  program.command('clean').description('clean project').action(() => {
    clean();
  });
}

function parseTest() {
  program.command('test [fileType]')
    .option('--target [moduleName]', 'name of module to be installed')
    .option('--b [bundleName]', 'name of bundleName to be test')
    .option('--m [testModuleName]', 'name of moduleName to be test')
    .option('--unittest [testRunner]', 'name of testRunner to be test')
    .option('--class [class]', 'name of testClass to be test')
    .option('--timeout [timeout]', 'time of timeout to be test')
    .option('--path [path]', 'path of package to install and test directly')
    .description(`test apk/app on device
      --b                   [Test BundleName]
      --m                   [Test ModuleName]
      --unittest            [TestRunner]
      --timeout             [Test timeout]`)
    .action((fileType, options, cmd) => {
      if (!options.b) {
        console.log("test bundleName not found， please use '--b <testBundleName>'");
        return false;
      }
      if (!options.m) {
        console.log("test moduleName not found， please use '--m <testModuleName>'");
        return false;
      }
      if (!options.unittest) {
        console.log("test unittest not found， please use '--unittest <unittest>'");
        return false;
      }
      if (options.path !== undefined && options.path.length == 0) {
        console.log("please input the correct path of install file");
        return false;
      }
      if (fileType === 'apk' || fileType === 'app') {
        options.test = 'test';
        options.debug = true;
        test(fileType, cmd.parent._optionValues.device, options);
      } else {
        console.log(`Please use ace test with subcommand : apk or app.`);
      }
    });
}

function execCmd(fileType, options, cmd, func) {
  if (fileType && fileType !== 'hap' && fileType !== 'apk' && fileType !== 'app') {
    console.log(`Please use ace ${func.name} with subcommand : hap or apk or app.`);
    return false;
  } else {
    if (!cmd.parent._optionValues.device) {
      chooseDevice(fileType, options, func);
    } else {
      if (!fileType) {
        fileType = getDeviceType(cmd.parent._optionValues.device);
      }
      func(fileType, cmd.parent._optionValues.device, options);
    }
  }
}

function chooseDevice(fileType, options, func) {
  const mapDevice = showValidDevice(fileType);
  if (!mapDevice) {
    return false;
  } else if (mapDevice.size === 1) {
    const inputDevice = getDeviceID(mapDevice.get('0'));
    if (!fileType) {
      fileType = getDeviceType(inputDevice);
    }
    func(fileType, inputDevice, options);
  } else {
    inquirer.prompt([{
      name: 'ID',
      type: 'input',
      message: 'Please choose one (or "q" to quit):',
      validate(val) {
        if (val.toLowerCase() === 'q' || val.toLowerCase() === 'quit') return true;
        if (mapDevice.get(val)) {
          return true;
        } else {
          return `choose 1 ~ ${mapDevice.size}.`;
        }
      }
    }]).then(answers => {
      const id = answers.ID;
      if (id === 'q' || id === 'quit') return false;
      const inputDevice = getDeviceID(mapDevice.get(id));
      if (!fileType) {
        fileType = getDeviceType(inputDevice);
      }
      func(fileType, inputDevice, options);
    });
  }
}
