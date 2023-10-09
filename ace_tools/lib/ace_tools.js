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
const { install } = require('./src/cli/ace-install');
const uninstall = require('./src/cli/ace-uninstall');
const { log } = require('./src/cli/ace-log');
const launch = require('./src/cli/ace-launch');
const run = require('./src/cli/ace-run');
const clean = require('./src/cli/ace-clean');
const test = require('./src/cli/ace-test');
const { getAbsolutePath } = require('./src/cli/util');
const help = require('./src/cli/ace-help');

process.env.toolsPath = process.env.toolsPath || path.join(__dirname, '../');
globalThis.templatePath = path.join(__dirname, '..', 'templates');
const commandsSort = {
  'Environment': [],
  'Device': [],
  'Project': [],
  'Application': [],
  'Auxiliary': []
};

function unknownOptions() {
  const unknownOption = program.args.filter(arg => arg.startsWith('-'));
  console.log('\x1B[31m%s\x1B[0m', `Could not find an option with short name "${unknownOption}"\n\n`);
  console.log('\x1B[31m%s\x1B[0m', `Run 'ace -h' (or 'ace <command> -h') for available ace commands and options`);
  process.exit(1);
}

function unknownCommands(unknownCommand) {
  console.log('\x1B[31m%s\x1B[0m', `Could not find a command named "${unknownCommand}"\n\n`);
  console.log('\x1B[31m%s\x1B[0m', `Run 'ace -h' (or 'ace <command> -h') for available ace commands and options`);
  process.exit(1);
}

parseCommander();
function parseCommander() {
  program.configureHelp({
    showGlobalOptions: true
  });
  program.addHelpText("before", 'Manage your ArkUI app development.');
  program.addHelpText("before",
    `
Common commands:

  ArkUI create [options] [subcommand]
  Create a new ArkUI project in the specified directory.

  ArkUI run [options] [fileType]
  Run your ArkUI application on an attached device or in an emulator.
    `);

  program.version(require('../package').version);
  program.usage('<command> [options]').name('ace').addHelpCommand(false);
  program.option('-d, --device <device>', 'input device id to specify the device to do something');

  program.unknownOption = () => unknownOptions();
  program.on('command:*', unknownCommand => unknownCommands(unknownCommand));


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

  const userInputCommand = process.argv.slice(2);
  if (userInputCommand.length === 0 || userInputCommand[0] === '--help' || userInputCommand[0] === '-h') {
    if (userInputCommand.length < 2) {
      program.outputHelp(() => help(commandsSort));
    } else {
      if (program.args.filter(arg => arg.startsWith('-'))) {
        console.log('\x1B[31m%s\x1B[0m', `Could not find an option with short name "${process.argv.slice(2)}"\n\n`);
        console.log('\x1B[31m%s\x1B[0m', `Run 'ace -h' (or 'ace <command> -h') for available ace commands and options`);
      } else {
        console.log('\x1B[31m%s\x1B[0m', `Could not find a command named "${process.argv.slice(2)}"\n\n`);
        console.log('\x1B[31m%s\x1B[0m', `Run 'ace -h' (or 'ace <command> -h') for available ace commands and options`);
      }
      process.exit(1);
    }
  } else {
    program.addHelpText("afterAll", `\nRun "ace --help" to see global options.`);
    program.parse(process.argv);
  }
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
  program.command('create [outputDir]', { hidden: true })
    .option('-t | --template [type]', 'project type')
    .description(`Create a new ArkUI project.`)
    .usage('<output directory>')
    .action((outputDir, cmd) => {
      if (outputDir === undefined) {
        console.log('No option specified for the output directory');
        return;
      }
      const initInfo = {};
      if (!cmd.template || cmd.template === 'app') {
        initInfo.proType = '1';
        initInfo.template = '1';
      } else if (cmd.template === 'library') {
        initInfo.proType = '2';
        initInfo.template = '1';
      } else if (cmd.template === 'plugin_napi') {
        initInfo.proType = '1';
        initInfo.template = '2';
      } else {
        console.log(`create project failed.template option does not support the value of ${cmd.template}.\nPlease choose one of app/library/plugin_napi `);
        return;
      }
      outputDir = getAbsolutePath(outputDir);
      projectName = path.basename(outputDir);

      inquirer.prompt([{
        name: 'project',
        type: 'input',
        message: `Please enter the project name(${projectName}):`,
        validate(val) {
          if (val === '') {
            val = projectName;
          }
          if (!isProjectNameValid(val)) {
            return 'The project name must contain 1 to 200 characters, start with a ' +
              'letter, and include only letters, digits and underscores (_)';
          }
          return true;
        }
      }]).then(answers => {
        initInfo.platform = '';
        initInfo.project = answers.project || projectName;
        initInfo.outputDir = outputDir;
        inquirer.prompt([{
          name: 'bundleName',
          type: 'input',
          message: 'Please enter the bundleName (com.example.' + initInfo.project.toLowerCase() + '):',
          validate(val) {
            if (val === '') {
              val = 'com.example.' + initInfo.project.toLowerCase();
            }
            if (!isBundleNameValid(val)) {
              return 'The bundle name must contain 7 to 128 characters,start with a letter,and include ' +
              'only lowercase letters, digits,underscores(_) and at least one separator(.).';
            }
            return true;
          }
        }]).then(answers => {
          initInfo.bundleName = answers.bundleName ? answers.bundleName.toLowerCase()
            : 'com.example.' + initInfo.project.toLowerCase();
          inquirer.prompt([{
            name: 'runtimeOS',
            type: 'input',
            message: 'Please enter the runtimeOS (1: OpenHarmony, 2: HarmonyOS):',
            validate(val) {
              if (val === '1' || val === '2') {
                return true;
              } else {
                return 'input must be an integer: 1 or 2.';
              }
            }
          }]).then(answers => {
            initInfo.runtimeOS = answers.runtimeOS;
            initInfo.sdkVersion = '10';
            create(initInfo);
          });
        });
      });
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Project'].push(program.commands[program.commands.length - 1]);
}

function parseNew() {
  const newCmd = program.command('new', { hidden: true })
    .description(`Create a new ability/module to your project.`)
    .addHelpCommand(false)
    .usage('[subcommand]')
    .on('--help', () => {
      if (process.argv[3] === '--help' || process.argv[3] === '-h' || process.argv.length === 3) {
        console.log(`
Available subcommands:
  module                 Create a new module.
  ability                Create a new ability.`);
      }
    });
  const newArgs = ['ability', 'module'];
  newArgs.forEach(subcommand => {
    const newSubcommand = newCmd.command(subcommand, { hidden: true });
    newSubcommand
      .action((cmd) => {
        if (subcommand === 'module') {
          createModule();
        } else if (subcommand === 'ability') {
          createAbility();
        }
      });
    newSubcommand.unknownOption = () => unknownOptions();
  });
  newCmd.on('command:*', unknownCommand => unknownCommands(unknownCommand));
  newCmd.unknownOption = () => unknownOptions();
  commandsSort['Project'].push(program.commands[program.commands.length - 1]);
}

function parseCheck() {
  program.command('check', { hidden: true })
    .option('-v|--v', 'show details')
    .description(`Show information about the installed tooling.`)
    .action((cmd) => {
      check(cmd);
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Environment'].push(program.commands[program.commands.length - 1]);
}

function parseDevices() {
  program.command('devices', { hidden: true })
    .description(`List the connected devices.`)
    .action(() => {
      devices();
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Device'].push(program.commands[program.commands.length - 1]);
}

function parseConfig() {
  program.command('config', { hidden: true })
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
    .description(`Configure ArkUI settings.`)
    .action((cmd) => {
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
        console.log('Please use ace config with options :' + `
        --openharmony-sdk     [OpenHarmony SDK]
        --harmonyos-sdk       [HarmonyOS SDK]
        --android-sdk         [Android Sdk]
        --deveco-studio-path  [DevEco Studio Path]
        --android-studio-path [Android Studio Path]
        --build-dir           [Build Dir]
        --nodejs-dir          [Nodejs Dir]
        --java-sdk            [Java Sdk]
        --arkui-x-sdk         [ArkUI-X SDK]
        --ohpm-dir            [Ohpm Dir]`);
      }
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Environment'].push(program.commands[program.commands.length - 1]);
}

function parseBuild() {
  const buildCmd = program.command('build', { hidden: true })
    .addHelpCommand(false)
    .usage('[subcommand] [options] ')
    .description(`Build an executable app or install bundle.`)
    .on('--help', () => {
      if (process.argv[3] === '--help' || process.argv[3] === '-h' || process.argv.length === 3) {
        console.log(`
Available subcommands:
  aar                    Build a repository containing an AAR and a POM file.
  aab                    Build an Android App Bundle file from your app.
  apk                    Build an Android APK file from your app.
  bundle                 Build the ArkUI assets directory from your app.
  hap                    Build a HarmonyOS/Openharmony Hap file from your app.
  ios                    Build an iOS APP file from your app.
  ios-framework          Build an iOS framework.
  ios-xcframework        Build an iOS xcframework.`);
      }
    });
  const buildArgs = ['aab', 'aar', 'apk', 'bundle', 'hap', 'ios', 'ios-framework', 'ios-xcframework'];
  buildArgs.forEach(fileType => {
    const buildType = buildCmd.command(fileType, { hidden: true });
    buildType
      .option('-r --release', 'Build a release version of your app.')
      .option('--debug', 'Build a debug version of your app.');
    if (fileType === 'ios') {
      buildType
        .option('--nosign', 'build without sign')
        .option('-s | --simulator', 'build for iOS Simulator');
    }
    if (fileType === 'hap') {
      buildType
        .option('--target [moduleName]', 'name of module to be built');
    }
    buildType
      .action((cmd) => {
        cmd.simulator = cmd.simulator && platform === Platform.MacOS && fileType === 'ios';
        if (cmd.release && cmd.debug) {
          console.log('\x1B[31m%s\x1B[0m', 'Warning: Release and debug are not allowed to exist at the same time.');
          return false;
        }
        if (fileType === 'hap' || fileType === 'bundle') {
          compiler(fileType, cmd);
        } else if (fileType === 'apk' || fileType === 'ios' || fileType === 'aar' ||
          fileType === 'ios-framework' || fileType === 'ios-xcframework' || fileType === 'aab') {
          build(fileType, cmd);
        }
      });
    buildType.unknownOption = () => unknownOptions();
  });
  buildCmd.on('command:*', unknownCommand => unknownCommands(unknownCommand));
  buildCmd.unknownOption = () => unknownOptions();
  commandsSort['Project'].push(program.commands[program.commands.length - 1]);
}

function parseInstall() {
  program.command('install [fileType]', { hidden: true })
    .usage('[subcommand]')
    .option('--target [moduleName]', 'name of module to be installed')
    .description(`Install an ArkUI app on an attached device.`)
    .on('--help', () => {
      if (process.argv[3] === '--help' || process.argv[3] === '-h') {
        console.log(`
Available subcommands:
  hap                    Install a HarmonyOS/openharmony HAP on an attached device.
  apk                    Install an Android APK on an attached device.
  ios                    Install an iOS APP on an attached device.`);
      }
    })
    .action((fileType, options, cmd) => {
      options.target = options.target || 'entry';
      execCmd(fileType, options.target, cmd, install);
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function parseUninstall() {
  program.command('uninstall [fileType]', { hidden: true })
    .usage('[subcommand]')
    .option('--bundle <bundleName>', 'bundleName to be uninstalled')
    .description(`Uninstall an ArkUI app on an attached device.`)
    .on('--help', () => {
      if (process.argv[3] === '--help' || process.argv[3] === '-h') {
        console.log(`
Available subcommands:
  hap                    Uninstall a HarmonyOS/Openharmony HAP  an attached device.
  apk                    Uninstall an Android APK an attached device.
  ios                    Uninstall an iOS APP an attached device.`);
      }
    })
    .action((fileType, options, cmd) => {
      if (!options.bundle) {
        console.log(`Please input bundleName with --bundle.`);
        return false;
      }
      execCmd(fileType, options.bundle, cmd, uninstall);
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function parseRun() {
  program.command('run [fileType]', { hidden: true })
    .usage('[subcommand]')
    .description(`Run your ArkUI app on an attached device.`)
    .option('--target [moduleName]', 'name of module to be installed')
    .on('--help', () => {
      if (process.argv[3] === '--help' || process.argv[3] === '-h') {
        console.log(`
Available subcommands:
  hap                    Run a HarmonyOS/Openharmony HAP to your device.
  apk                    Run an Android APK to your device.
  ios                    Run an iOS APP to your device.`);
      }
    })
    .action((fileType, options, cmd) => {
      execCmd(fileType, options, cmd, run);
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function parseLaunch() {
  program.command('launch [fileType]', { hidden: true })
    .usage('[subcommand]')
    .option('--target [moduleName]', 'name of module to be launched')
    .description(`Launch  your ArkUI app on an attached device.`)
    .on('--help', () => {
      if (process.argv[3] === '--help' || process.argv[3] === '-h') {
        console.log(`
Available subcommands:
  hap                    Run a HarmonyOS/Openharmony HAP to your device.
  apk                    Run an Android APK to your device.
  ios                    Run an iOS APP to your device.`);
      }
    })
    .action((fileType, options, cmd) => {
      options.target = options.target || 'entry';
      execCmd(fileType, options, cmd, launch);
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function parseLog() {
  program.command('log [fileType]', { hidden: true })
    .usage('[subcommand]')
    .description(`Show log output for running ArkUI apps.`)
    .on('--help', () => {
      if (process.argv[3] === '--help' || process.argv[3] === '-h') {
        console.log(`
Available subcommands:
  hap                    Show log output for running HAP.
  apk                    Show log output for running APK.
  ios                    Show log output for running APP.`);
      }
    })
    .action((fileType, options, cmd) => {
      execCmd(fileType, '', cmd, log);
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function parseClean() {
  program.command('clean', { hidden: true })
    .description(`Delete the build/ directories.`)
    .action(() => {
      clean();
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Project'].push(program.commands[program.commands.length - 1]);
}

function parseTest() {
  program.command('test [fileType]', { hidden: true })
    .usage('[subcommand] [options] ')
    .option('--target [moduleName]', 'name of module to be installed')
    .option('--b [bundleName]', 'name of bundleName to be test')
    .option('--m [testModuleName]', 'name of moduleName to be test')
    .option('--unittest [testRunner]', 'name of testRunner to be test')
    .option('--class [class]', 'name of testClass to be test')
    .option('--timeout [timeout]', 'time of timeout to be test')
    .option('--path [path]', 'path of package to install and test directly')
    .description(`Run ArkUI unit tests for the current project.`)
    .on('--help', () => {
      if (process.argv[3] === '--help' || process.argv[3] === '-h') {
        console.log(`
  Available subcommands:
    apk                    Run APK unit tests for the current project.
    ios                    Run APP unit tests for the current project.`);
      }
    })
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
      if (fileType === 'apk' || fileType === 'ios') {
        options.test = 'test';
        options.debug = true;
        test(fileType, cmd.parent._optionValues.device, options);
      } else {
        console.log(`Please use ace test with subcommand : apk or ios.`);
      }
    })
    .unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function execCmd(fileType, options, cmd, func) {
  if (fileType && fileType !== 'hap' && fileType !== 'apk' && fileType !== 'ios') {
    console.log('\x1B[31m%s\x1B[0m', `Could not find a command named "${process.argv.slice(3)}"\n\n`);
    console.log('\x1B[31m%s\x1B[0m', `Run 'ace -h' (or 'ace <command> -h') for available ace commands and options`);
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
