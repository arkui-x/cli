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
const create = require('../ace-create/project');
const createModule = require('../ace-create/module');
const createComponent = require('../ace-create/component');
const { createAbility } = require('../ace-create/ability');
const { setConfig } = require('../ace-config');
const check = require('../ace-check');
const devices = require('../ace-devices');
const compiler = require('../ace-build/ace-compiler');
const build = require('../ace-build');
const install = require('../ace-install');
const uninstall = require('../ace-uninstall');
const log = require('../ace-log');
const launch = require('../ace-launch');
const run = require('../ace-run');
const clean = require('../ace-clean');
const inquirer = require('inquirer');
const test = require('../ace-test');

process.env.toolsPath = process.env.toolsPath || path.join(__dirname, '../');

parseCommander();
function parseCommander() {
  program.version(require('../../package').version);
  program.usage('<command> [options]').name('ace');
  program.option('-d, --device <device>', 'input device id to specify the device to do something');

  parseCreate();
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

function isProjectNameQualified(name) {
  const regEn = /[`~!@#$%^&*()+<>?:"{},.\/;'\\[\]]/im;
  const regCn = /[·！#￥（——）：；“”‘、，|《。》？、【】[\]]/im;

  if (regEn.test(name) || regCn.test(name) || !isNaN(name[0]) || name.length > 200) {
    return false;
  } else if (name[0] === '_') {
    return false;
  }
  return true;
}

function parseCreate() {
  program.command('create [subcommand]')
    .description(`create ace project/module/component/ability`)
    .action((subcommand, cmd) => {
      if (!subcommand || subcommand === 'project') {
        inquirer.prompt([{
          name: 'project',
          type: 'input',
          message: 'Please enter the project name:',
          validate(val) {
            if (val === '') {
              return 'Project name must be required!';
            } else if (!isProjectNameQualified(val)) {
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
      } else if (subcommand === 'module') {
        createModule();
      } else if (subcommand === 'component') {
        createComponent();
      } else if (subcommand === 'ability') {
        createAbility();
      } else {
        console.log(`Please use ace create with subcommand : project/module/component/ability.`);
      }
    });
}

function parseCheck() {
  program.command('check').description('check sdk environment').action(() => {
    check();
  });
}

function parseDevices() {
  program.command('devices').description('list the connected devices.').action(() => {
    devices(true);
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
        --java-sdk            [Java Sdk]
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
    .description('build hap/apk/app/aar/framework/xcframework of moduleName')
    .action((fileType, cmd) => {
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
      fileType = fileType || 'hap';
      if (fileType !== 'hap' && fileType !== 'apk' && fileType !== 'app') {
        console.log(`Please use ace install with subcommand : hap or apk or app.`);
      } else {
        options.target = options.target || 'entry';
        install(fileType, cmd.parent._optionValues.device, options.target);
      }
    });
}

function parseUninstall() {
  program.command('uninstall [fileType]')
    .option('--bundle [bundleId]', 'bundleId to be uninstalled')
    .description('uninstall hap/apk/app on device')
    .action((fileType, options, cmd) => {
      fileType = fileType || 'hap';
      if (fileType !== 'hap' && fileType !== 'apk' && fileType !== 'app') {
        console.log(`Please use ace uninstall with subcommand : hap or apk or app.`);
      } else if (!options.bundle) {
        console.log(`Please input bundleName with --bundle.`);
      } else {
        uninstall(fileType, cmd.parent._optionValues.device, options.bundle);
      }
    });
}

function parseRun() {
  program.command('run [fileType]')
    .description('run hap/apk on device')
    .option('--target [moduleName]', 'name of module to be installed')
    .action((fileType, options, cmd) => {
      fileType = fileType || 'hap';
      if (fileType === 'hap' || fileType === 'apk' || fileType === 'app') {
        run(fileType, cmd.parent._optionValues.device, options);
      } else {
        console.log(`Please use ace run with subcommand : hap or apk.`);
      }
    });
}

function parseLaunch() {
  program.command('launch [fileType]')
    .option('--target [moduleName]', 'name of module to be launched')
    .description('launch hap/apk on device')
    .action((fileType, options, cmd) => {
      fileType = fileType || 'hap';
      options.target = options.target || 'entry';
      if (fileType !== 'hap' && fileType !== 'apk' && fileType !== 'app') {
        console.log(`Please use ace launch with subcommand : hap or apk.`);
      } else {
        launch(fileType, cmd.parent._optionValues.device, options.target, options);
      }
    });
}

function parseLog() {
  program.command('log [fileType]')
    .description('show debug log')
    .action((fileType, options, cmd) => {
      if (fileType === 'hap' || typeof fileType === 'undefined') {
        log('hap', cmd.parent._optionValues.device);
      } else if (fileType === 'apk' || fileType === 'app') {
        log(fileType, cmd.parent._optionValues.device);
      } else {
        console.log(`Please use ace build with subcommand : hap, apk or app.`);
      }
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
      if (fileType === 'apk' || fileType === 'app') {
        options.test = 'test';
        options.debug = true;
        test(fileType, cmd.parent._optionValues.device, options);
      } else {
        console.log(`Please use ace test with subcommand : apk or app.`);
      }
    });
}
