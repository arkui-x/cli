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
          initInfo.template = 'app';
          initInfo.project = answers.project;
          inquirer.prompt([{
            name: 'packages',
            type: 'input',
            message: 'Please enter the packages (com.example.' + initInfo.project + '):',
            validate(val) {
              return true;
            }
          }]).then(answers => {
            initInfo.packages = answers.packages ? answers.packages.toLowerCase() : 'com.example.' + initInfo.project.toLowerCase();
            inquirer.prompt([{
              name: 'version',
              type: 'input',
              message: 'Please enter the ArkUI version (1: 类web范式, 2: 声明式范式):',
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
    devices();
  });

  program.command('config')
    .option('--harmonyos-sdk [harmonyosSdk]', 'harmonyos-sdk path')
    .option('--android-sdk [androidSdk]', 'android-sdk path')
    .option('--build-dir [buildDir]', 'build-dir path')
    .option('--nodejs-dir [nodejsDir]', 'nodejs-dir path')
    .option('--java-sdk [javaSdk]', 'java-sdk path')
    .description(`--harmonyos-sdk [harmonyosSdk]
                  --android-sdk   [androidSdk]
                  --build-dir     [buildDir]
                  --nodejs-dir    [nodejsDir]
                  --java-sdk      [javaSdk]`)
    .action(cmd => {
      if (cmd.harmonyosSdk || cmd.androidSdk || cmd.buildDir ||
        cmd.nodejsDir || cmd.javaSdk || cmd.signDebug || cmd.signRelease) {
        setConfig({'harmonyos-sdk': cmd.harmonyosSdk,
          'android-sdk': cmd.androidSdk,
          'build-dir': cmd.buildDir,
          'nodejs-dir': cmd.nodejsDir,
          'java-sdk': cmd.javaSdk});
      } else {
        console.log('Please user ace config with options : ' + cmd._description);
      }
    });

  program.command('build [fileType]')
    .option('--target [moduleName]', 'name of module to be built')
    .description('build hap/apk of moduleName')
    .action((fileType, cmd) => {
      if (fileType === 'hap' || typeof fileType === 'undefined') {
        compiler('hap', cmd.target);
      } else if (fileType === 'apk') {
        build('apk', cmd.target);
      } else {
        console.log(`Please use ace build with subcommand : hap or apk.`);
      }
    });

  program.command('install [fileType]')
    .option('--target [moduleName]', 'name of module to be installed')
    .description('install hap/apk on device')
    .action((fileType, cmd) => {
      fileType = fileType || 'hap';
      if (fileType !== 'hap' && fileType !== 'apk') {
        console.log(`Please use ace install with subcommand : hap or apk.`);
      } else {
        install(fileType, cmd.parent.device, cmd.target);
      }
    });

  program.command('uninstall [fileType]')
    .option('--target [moduleName]', 'name of module to be uninstalled')
    .description('uninstall hap/apk on device')
    .action((fileType, cmd) => {
      fileType = fileType || 'hap';
      if (fileType !== 'hap' && fileType !== 'apk') {
        console.log(`Please use ace uninstall with subcommand : hap or apk.`);
      } else {
        uninstall(fileType, cmd.parent.device, cmd.target);
      }
    });

  program.command('run [fileType]')
    .description('run hap/apk on device')
    .option('--target [moduleName]', 'name of module to be installed')
    .action((fileType, cmd) => {
      fileType = fileType || 'hap';
      if (fileType === 'hap') {
        cmd.target = cmd.target || 'entry';
        run(fileType, cmd.parent.device, cmd.target);
      } else if (fileType === 'apk') {
        cmd.target = cmd.target || 'app';
        run(fileType, cmd.parent.device, cmd.target);
      } else {
        console.log(`Please use ace run with subcommand : hap or apk.`);
      }
    });

  program.command('launch [fileType]')
    .option('--target [moduleName]', 'name of module to be launched')
    .description('launch hap/apk on device')
    .action((fileType, cmd) => {
      fileType = fileType || 'hap';
      cmd.target = cmd.target || 'entry';
      if (fileType !== 'hap' && fileType !== 'apk') {
        console.log(`Please use ace launch with subcommand : hap or apk.`);
      } else {
        launch(fileType, cmd.parent.device, cmd.target);
      }
    });

  program.command('log')
    .description('show debug log')
    .action((cmd) => {
      log(cmd.parent.device);
    });

  program.parse(process.argv);
}
