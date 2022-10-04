#!/usr/bin/env node
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

const path = require('path');
const program = require('commander');
const { create } = require('../ace-create/project');
const createModule = require('../ace-create/module');
const createComponent = require('../ace-create/component');
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

process.env.toolsPath = process.env.toolsPath || path.join(__dirname, '../');

parseCommander();
function parseCommander() {
  program.version(require('../../package').version);
  program.usage('<command> [options]').name('ace');
  program.option('-d, --device <device>', 'input device id to specify the device to do something');

  program.command('create [subcommand]')
    .description(`create ace project/module/component`)
    .action((subcommand, cmd) => {
      if (!subcommand || subcommand === 'project') {
        inquirer.prompt([{
          name: 'project',
          type: 'input',
          message: 'Please enter the project name:',
          validate(val) {
            if (val === '') {
              return 'Project name must be required!';
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
            message: 'Please enter the packages (com.example.' + initInfo.project + '):',
            validate(val) {
              return true;
            }
          }]).then(answers => {
            initInfo.packages = answers.packages ? answers.packages.toLowerCase()
              : 'com.example.' + initInfo.project.toLowerCase();
            inquirer.prompt([{
              name: 'version',
              type: 'input',
              message: 'Please enter the ArkUI version (1: 声明式范式, 2: 类web范式):',
              validate(val) {
                if (val === '1' || val === '2') {
                  return true;
                } else {
                  return 'ArkUI version must be an integer: 1 or 2.';
                }
              }
            }]).then(answers => {
              initInfo.version = answers.version;
              create(initInfo);
            });
          });
        });
      } else if (subcommand === 'module') {
        createModule();
      } else if (subcommand === 'component') {
        createComponent();
      } else {
        console.log(`Please use ace create with subcommand : project/module/component.`);
      }
    });

  program.command('check').description('check sdk environment').action(() => {
    check();
  });

  program.command('devices').description('list the connected devices.').action(() => {
    devices(true);
  });

  program.command('config')
    .option('--openharmony-sdk [OpenHarmony Sdk]', 'openharmony-sdk path')
    .option('--android-sdk [Android Sdk]', 'android-sdk path')
    .option('--deveco-studio-path [DevEco Studio Path]', 'deveco-studio path')
    .option('--android-studio-path [Android Studio Path]', 'android-studio path')
    .option('--build-dir [Build Dir]', 'build-dir path')
    .option('--nodejs-dir [Nodejs Dir]', 'nodejs-dir path')
    .option('--java-sdk [Java Sdk]', 'java-sdk path')
    .description(`
        --openharmony-sdk [OpenHarmony SDK]
        --android-sdk   [Android Sdk]
        --deveco-studio-path [DevEco Studio Path]
        --android-studio-path [Android Studio Path]
        --build-dir     [Build Dir]
        --nodejs-dir    [Nodejs Dir]
        --java-sdk      [Java Sdk]`)
    .action((cmd, description)  => {
      if (cmd.openharmonySdk || cmd.androidSdk || cmd.devecoStudioPath || cmd.androidStudioPath
        || cmd.buildDir ||
        cmd.nodejsDir || cmd.javaSdk || cmd.signDebug || cmd.signRelease) {
        setConfig({
          'openharmony-sdk': cmd.openharmonySdk,
          'android-sdk': cmd.androidSdk,
          'deveco-studio-path': cmd.devecoStudioPath,
          'android-studio-path': cmd.androidStudioPath,
          'build-dir': cmd.buildDir,
          'nodejs-dir': cmd.nodejsDir,
          'java-sdk': cmd.javaSdk
        });
      } else {
        console.log('Please use ace config with options :' + description._description);
      }
    });

  program.command('build [fileType]')
    .option('--target [moduleName]', 'name of module to be built')
    .option('-r --release', 'build as release')
    .option('--nosign', 'build without sign')
    .description('build hap/apk/app of moduleName')
    .action((fileType, cmd) => {
      if (fileType === 'hap' || typeof fileType === 'undefined') {
        compiler('hap', cmd);
      } else if ((fileType === 'apk') || (fileType === 'app')) {
        build(fileType, cmd);
      } else {
        console.log(`Please use ace build with subcommand : hap, apk or app.`);
      }
    });

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

  program.command('run [fileType]')
    .description('run hap/apk on device')
    .option('--target [moduleName]', 'name of module to be installed')
    .action((fileType, options, cmd) => {
      fileType = fileType || 'hap';
      if (fileType === 'hap' || fileType === 'apk' || fileType === 'app') {
        options.target = options.target || 'entry';
        run(fileType, cmd.parent._optionValues.device, options);
      } else {
        console.log(`Please use ace run with subcommand : hap or apk.`);
      }
    });

  program.command('launch [fileType]')
    .option('--target [moduleName]', 'name of module to be launched')
    .description('launch hap/apk on device')
    .action((fileType, options, cmd) => {
      fileType = fileType || 'hap';
      options.target = options.target || 'entry';
      if (fileType !== 'hap' && fileType !== 'apk' && fileType !== 'app') {
        console.log(`Please use ace launch with subcommand : hap or apk.`);
      } else {
        launch(fileType, cmd.parent._optionValues.device, options.target);
      }
    });

  program.command('log [fileType]')
    .description('show debug log')
    .action((fileType, options, cmd) => {
      if (fileType === 'hap' || typeof fileType === 'undefined') {
        log('hap', cmd.parent._optionValues.device);
      } else if ((fileType === 'apk') || (fileType === 'app')) {
        log(fileType, cmd.parent._optionValues.device);
      } else {
        console.log(`Please use ace build with subcommand : hap, apk or app.`);
      }
    });

  program.command('clean').description('clean project').action(() => {
    clean();
  });
  program.parse(process.argv);
}
