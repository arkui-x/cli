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

const fs = require('fs');
const path = require('path');
const program = require('commander');
const inquirer = require('inquirer');
const { Platform, platform } = require('./src/cli/ace-check/platform');
const { create, repairProject, createProject } = require('./src/cli/ace-create/project');
const { createModule } = require('./src/cli/ace-create/module');
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
const { getAbsolutePath, validOptions, checkProjectType } = require('./src/cli/util');
const { aceHelp, commandHelp, subcommandHelp, unknownOptions, unknownCommands } = require('./src/cli/ace-help');
const { getProjectInfo, getTempPath } = require('./src/cli/ace-create/util')

process.env.toolsPath = process.env.toolsPath || path.join(__dirname, '../');
globalThis.templatePath = path.join(__dirname, '..', 'templates');
const commandsSort = {
  'Application': [],
  'Device': [],
  'Environment': [],
  'Project': []
};
const subCommands = ['apk', 'hap', 'ios'];
const aceCommands = ['build', 'check', 'clean', 'config', 'create', 'devices', 'help',
  'install', 'launch', 'log', 'new', 'run', 'test', 'uninstall'];
parseCommander();
function parseCommander() {
  program.configureHelp({
    showGlobalOptions: true
  });
  program.addHelpText("before", 'Manage your ArkUI cross-platform app development.');
  program.addHelpText("before",
    `
Common commands:

  ace create
  Create a new ArkUI cross-platform project in the specified directory.

  ace run
  Run your ArkUI cross-platform application on an attached device or in an emulator.
    `);

  program.version(require('../package').version);
  program.usage('<command> [arguments]').name('ace').addHelpCommand(false);
  program.option('-d, --device <device>', 'Input device id to specify the device to do something.');

  program.unknownOption = () => unknownOptions();
  program.on('command:*', unknownCommand => unknownCommands(unknownCommand));

  parseBuild();
  parseCheck();
  parseClean();
  parseConfig();
  parseCreate();
  parseDevices();
  parseHelp();
  parseInstall();
  parseLaunch();
  parseLog();
  parseNew();
  parseRun();
  parseTest();
  parseUninstall();

  const userInputCommand = process.argv.slice(2);
  if (userInputCommand.length === 0 || ['help', '--help', '-h'].includes(userInputCommand[0]) && userInputCommand.length === 1) {
    program.outputHelp(() => aceHelp(commandsSort));
  } else {
    if (!aceCommands.includes(userInputCommand[0]) && process.argv.some(arg => ['--help', '-h'].includes(arg))) {
      unknownCommands(userInputCommand[0]);
    }
    program.addHelpText("afterAll", `\nRun "ace help" to see global options.`);
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

function parseHelp() {
  const helpCmd = program.command('help', { hidden: true })
    .usage('[arguments]')
    .description(`help.`)
    .addHelpCommand(false)
    .addHelpText("afterAll", `\nRun "ace help" to see global options.`)
  aceCommands.forEach(subcommand => {
    helpCmd.command(subcommand, { hidden: true });
  });
  helpCmd.on('command:*', unknownCommand => unknownCommands(unknownCommand));
}

function parseCreate() {
  const createCmd = program.command('create [outputDir]', { hidden: true })
    .usage('<output directory>')
    .option('-t, --template [type]', '[app (default), library, plugin_napi]')
    .description(`Create a new ArkUI cross-platform project.`)
    .action((outputDir, cmd) => {
      if (outputDir === undefined) {
        console.log('No option specified for the output directory.');
        return;
      }
      const initInfo = {};
      initInfo.currentProjectPath = outputDir;
      const absolutePath = getAbsolutePath(outputDir);
      const projectName = path.basename(absolutePath);

      if (!cmd.template) {
        initInfo.template = 'app'
      } else if (cmd.template === 'app' || cmd.template === 'library' || cmd.template === 'plugin_napi') {
        initInfo.template = cmd.template;
      } else {
        console.log(`Failed to create the project.Invaild template type ${cmd.template}.\nChoose from the app,library and plugin_napi options`);
        return;
      }

      if (fs.existsSync(path.join(absolutePath, 'oh-package.json5'))) {
        const currentProjectTemplate = checkProjectType(absolutePath);
        if (initInfo.template !== currentProjectTemplate) {
          console.log('\x1B[31m%s\x1B[0m', `"${outputDir}" project already exists, the requested template type doesn't match the existing template type.`);
          return false;
        }
        inquirer.prompt([{
          name: 'repair',
          type: 'input',
          message: `The project already exists. Do you want to repair the project (y / n):`,
          validate(val) {
            if (val.toLowerCase() !== 'y' && val.toLowerCase() !== 'n') {
              return 'Please enter y / n!';
            } else {
              return true;
            }
          }
        }]).then(answers => {
          if (answers.repair.toLowerCase() === 'y') {
            const projectInfo = getProjectInfo(absolutePath);
            const projectTempPath = getTempPath(outputDir);
            createProject(absolutePath, projectTempPath, projectInfo.bundleName, projectName, projectInfo.runtimeOS,
              initInfo.template, initInfo.currentProjectPath, projectInfo.compileSdkVersion);
            repairProject(absolutePath, outputDir);
          } else {
            console.log("Failed to repair project, preserve existing project.");
          }
        })
        return true;
      }

      if (!isProjectNameValid(projectName)) {
        console.log('The project dir must contain 1 to 200 characters, start with a ' +
        'letter, and include only letters, digits and underscores (_)');
        return;
      }
      inquirer.prompt([{
        name: 'project',
        type: 'input',
        message: `Enter the project name(${projectName}):`,
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
        initInfo.projectAbsolutePath = absolutePath;
        initInfo.outputDir = outputDir;
        inquirer.prompt([{
          name: 'bundleName',
          type: 'input',
          message: 'Enter the bundleName (com.example.' + initInfo.project.toLowerCase() + '):',
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
            message: 'Enter the runtimeOS (1: OpenHarmony, 2: HarmonyOS):',
            validate(val) {
              if (val === '1' || val === '2') {
                return true;
              } else {
                return 'input must be an integer: 1 or 2.';
              }
            }
          }]).then(answers => {
            initInfo.runtimeOS = answers.runtimeOS;
            inquirer.prompt([{
              name: 'Complie SDk',
              type: 'input',
              message: 'Please select the Complie SDk (1: 10, 2: 11):',
              validate(val) {
                if (val === '1' || val === '2') {
                  return true;
                } else {
                  return 'input must be an integer: 1 or 2.';
                }
              }
            }]).then(answers => {
              initInfo.sdkVersion = answers['Complie SDk'] === '1' ? '10' : '11';
              create(initInfo);
            })
          });
        });
      });
    });
  if (process.argv[2] === 'help' && process.argv[3] === 'create') {
    commandHelp(createCmd);
  }
  createCmd.unknownOption = () => unknownOptions();
  commandsSort['Project'].push(program.commands[program.commands.length - 1]);
}

function parseNew() {
  const newCmd = program.command('new', { hidden: true })
    .usage('<subCommand> [arguments]')
    .description(`Create a new ability or module for your project.`)
    .addHelpCommand(false)
    .on('--help', () => {
      if (process.argv.some(option => ['help', '--help', '-h'].includes(option)) || process.argv.length === 3) {
        console.log(`
Available subcommands:
  ability                Create a new ability.
  module                 Create a new module.`);
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
    if (process.argv[2] === 'help' && process.argv[3] === 'new') {
      subcommandHelp(newCmd, newArgs, subcommand, newSubcommand)
    }
    newSubcommand.unknownOption = () => unknownOptions();
  });
  newCmd.on('command:*', unknownCommand => unknownCommands(unknownCommand));
  newCmd.unknownOption = () => unknownOptions();
  commandsSort['Project'].push(program.commands[program.commands.length - 1]);
}

function parseCheck() {
  const checkCmd = program.command('check', { hidden: true })
    .usage('[arguments]')
    .option('-v, --v', 'Show details.')
    .description(`Show information about the installed tools.`)
    .action((cmd) => {
      check(cmd);
    });
  checkCmd.unknownOption = () => unknownOptions();
  if (process.argv[2] === 'help' && process.argv[3] === 'check') {
    commandHelp(checkCmd);
  }
  commandsSort['Environment'].push(program.commands[program.commands.length - 1]);
}

function parseDevices() {
  const devicesCmd = program.command('devices', { hidden: true })
    .usage('[arguments]')
    .description(`List the connected devices.`)
    .action(() => {
      devices();
    });
  if (process.argv[2] === 'help' && process.argv[3] === 'devices') {
    commandHelp(devicesCmd);
  }
  devicesCmd.unknownOption = () => unknownOptions();
  commandsSort['Device'].push(program.commands[program.commands.length - 1]);
}

function parseConfig() {
  const configCmd = program.command('config', { hidden: true })
    .usage('[arguments]')
    .option('--android-sdk [Android SDK]', 'Android SDK path.')
    .option('--android-studio-path [Android Studio Path]', 'Android Studio path.')
    .option('--arkui-x-sdk [ArkUI-X SDK]', 'ArkUI-X Sdk path.')
    .option('--build-dir [Build Dir]', 'Build directory.')
    .option('--deveco-studio-path [DevEco Studio Path]', 'DevEco Studio path.')
    .option('--harmonyos-sdk [HarmonyOS SDK]', 'HarmonyOS SDK path.')
    .option('--java-sdk [Java SDK]', 'Java SDK path.')
    .option('--nodejs-dir [Nodejs Dir]', 'Node.js path.')
    .option('--ohpm-dir [Ohpm Dir]', 'Ohpm path.')
    .option('--openharmony-sdk [OpenHarmony SDK]', 'OpenHarmony SDK path.')
    .description(`Configure ArkUI cross-platform settings.`)
    .action((cmd) => {
      if (cmd.openharmonySdk || cmd.harmonyosSdk || cmd.androidSdk || cmd.devecoStudioPath || cmd.androidStudioPath
        || cmd.buildDir ||
        cmd.nodejsDir || cmd.javaSdk || cmd.signDebug || cmd.signRelease || cmd.arkuiXSdk || cmd.ohpmDir) {
        setConfig({
          'android-sdk': cmd.androidSdk,
          'android-studio-path': cmd.androidStudioPath,
          'arkui-x-sdk': cmd.arkuiXSdk,
          'build-dir': cmd.buildDir,
          'deveco-studio-path': cmd.devecoStudioPath,
          'harmonyos-sdk': cmd.harmonyosSdk,
          'java-sdk': cmd.javaSdk,
          'nodejs-dir': cmd.nodejsDir,
          'ohpm-dir': cmd.ohpmDir,
          'openharmony-sdk': cmd.openharmonySdk
        });
      } else {
        console.log('Please use ace config with options :' + `
        --android-sdk         [Android SDK]
        --android-studio-path [Android Studio Path]
        --arkui-x-sdk         [ArkUI-X SDK]
        --build-dir           [Build Dir]
        --deveco-studio-path  [DevEco Studio Path]
        --harmonyos-sdk       [HarmonyOS SDK]
        --java-sdk            [Java SDK]
        --nodejs-dir          [Nodejs Dir]
        --ohpm-dir            [Ohpm Dir]
        --openharmony-sdk     [OpenHarmony SDK]`);
      }
    });
  if (process.argv[2] === 'help' && process.argv[3] === 'config') {
    commandHelp(configCmd);
  }
  configCmd.unknownOption = () => unknownOptions();
  commandsSort['Environment'].push(program.commands[program.commands.length - 1]);
}

function parseBuild() {
  const buildCmd = program.command('build', { hidden: true })
    .addHelpCommand(false)
    .usage('<subCommand> [arguments]')
    .description(`Build an executable app or install a bundle.`)
    .on('--help', () => {
      if (process.argv.some(option => ['help', '--help', '-h'].includes(option)) || process.argv.length === 3) {
        console.log(`
Available subcommands:
  aab                    Build an Android App Bundle file from your app.
  aar                    Build a repository containing an AAR and a POM file.
  apk                    Build an Android APK file from your app.
  bundle                 Build an ArkUI cross-platform assets directory from your app.
  hap                    Build a HarmonyOS/Openharmony HAP file from your app.
  ios                    Build an iOS APP file from your app.
  ios-framework          Build an iOS framework.
  ios-xcframework        Build an iOS XCFramework.`);
      }
    });
  const buildArgs = ['aab', 'aar', 'apk', 'bundle', 'hap', 'ios', 'ios-framework', 'ios-xcframework'];
  buildArgs.forEach(subcommand => {
    const buildSubcommand = buildCmd.command(subcommand, { hidden: true }).usage('[arguments]');
    buildSubcommand
      .option('-r, --release', 'Build a release version of your app.')
      .option('--debug', 'Build a debug version of your app.')
      .option('--profile', 'Build a version of your app specialized for performance profiling.');
    if (subcommand === 'ios') {
      buildSubcommand
        .option('--nosign', 'Build without sign.')
        .option('-s, --simulator', 'Build for iOS Simulator.');
    }
    if (subcommand === 'ios-framework' || subcommand === 'ios-xcframework') {
      buildSubcommand
        .option('-s, --simulator', 'Build for iOS Simulator.');
    }
    if (subcommand === 'apk' || subcommand === 'aab' || subcommand === 'aar' || subcommand === 'bundle') {
      buildSubcommand
        .option('--target-platform <platform>', 'The target platform for which the apk is compiled ' +
          '[arm, arm64, x86_64]');
    }
    if (subcommand === 'hap') {
      buildSubcommand
        .option('--target [moduleName]', 'name of module to be built');
    }
    if (process.argv[2] === 'help' && process.argv[3] === 'build') {
      subcommandHelp(buildCmd, buildArgs, subcommand, buildSubcommand)
    }
    buildSubcommand
      .action((cmd) => {
        cmd.simulator = cmd.simulator && platform === Platform.MacOS;
        if (cmd.release && cmd.debug || cmd.release && cmd.profile || cmd.profile && cmd.debug) {
          console.log('\x1B[31m%s\x1B[0m', 'Warning: Multiple build models are not allowed to exist at the same time.');
          return false;
        }
        if (cmd.targetPlatform && (subcommand === 'apk' || subcommand === 'aab' ||
        subcommand === 'aar' || subcommand === 'bundle')) {
          const errValue = validOptions(cmd.targetPlatform, ['arm', 'arm64', 'x86_64']);
          if (errValue) {
            console.log('\x1B[31m%s\x1B[0m', `Error: ` +
            `"${errValue}" is an invalid value, please input arm, arm64, x86_64.`);
            return false;
          }
        }
        if (subcommand === 'hap' || subcommand === 'bundle') {
          compiler(subcommand, cmd);
        } else if (subcommand === 'apk' || subcommand === 'ios' || subcommand === 'aar' ||
          subcommand === 'ios-framework' || subcommand === 'ios-xcframework' || subcommand === 'aab') {
          build(subcommand, cmd);
        }
      });
    buildSubcommand.unknownOption = () => unknownOptions();
  });
  buildCmd.on('command:*', unknownCommand => unknownCommands(unknownCommand));
  buildCmd.unknownOption = () => unknownOptions();
  commandsSort['Project'].push(program.commands[program.commands.length - 1]);
}

function parseInstall() {
  const installCmd = program.command('install [fileType]', { hidden: true })
    .usage('[arguments]')
    .option('--target [moduleName]', 'Specifies the name of the module to install.')
    .description(`Install an ArkUI cross-platform app on an attached device.`)
    .on('--help', () => {
      if (!subCommands.some(sub => process.argv.includes(sub))) {
        console.log(`
Available subcommands:
  apk                    Install an Android APK on an attached device.
  hap                    Install a HarmonyOS/OpenHarmony HAP on an attached device.
  ios                    Install an iOS APP on an attached device.`);
      }
    })
    .action((fileType, options, cmd) => {
      options.target = options.target || 'entry';
      execCmd(fileType, options.target, cmd, install);
    });
  if (process.argv[2] === 'help' && process.argv[3] === 'install') {
    commandHelp(installCmd);
  }
  installCmd.unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function parseUninstall() {
  const uninstallCmd = program.command('uninstall [fileType]', { hidden: true })
    .usage('[arguments]')
    .option('--bundle <bundleName>', 'Specifies the name of the bundle to be uninstalled..')
    .description(`Uninstall an ArkUI cross-platform app on an attached device.`)
    .on('--help', () => {
      if (!subCommands.some(sub => process.argv.includes(sub))) {
        console.log(`
Available subcommands:
  apk                    Uninstall an Android APK an attached device.
  hap                    Uninstall a HarmonyOS/Openharmony HAP an attached device.
  ios                    Uninstall an iOS APP an attached device.`);
      }
    })
    .action((fileType, options, cmd) => {
      if (!options.bundle) {
        console.log(`Please input bundleName with --bundle.`);
        return false;
      }
      execCmd(fileType, options.bundle, cmd, uninstall);
    });
  if (process.argv[2] === 'help' && process.argv[3] === 'uninstall') {
    commandHelp(uninstallCmd);
  }
  uninstallCmd.unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function parseRun() {
  const runCmd = program.command('run [fileType]', { hidden: true })
    .usage('[arguments]')
    .description(`Run your ArkUI cross-platform app on an attached device.`)
    .option('--target [moduleName]', 'Specifies the name of the module to install.')
    .option('-r, --release', 'Run a release version of your app.')
    .option('--debug', 'Run a debug version of your app.')
    .option('--profile', 'Run a version of your app specialized for performance profiling.')
    .on('--help', () => {
      if (!subCommands.some(sub => process.argv.includes(sub))) {
        console.log(`
Available subcommands:
  apk                    Run an Android APK to your device.
  hap                    Run a HarmonyOS/Openharmony HAP to your device.
  ios                    Run an iOS APP to your device.`);
      }
    })
    .action((fileType, options, cmd) => {
      execCmd(fileType, options, cmd, run);
    });
  if (process.argv[2] === 'help' && process.argv[3] === 'run') {
    commandHelp(runCmd);
  }
  runCmd.unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function parseLaunch() {
  const launchCmd = program.command('launch [fileType]', { hidden: true })
    .usage('[arguments]')
    .option('--target [moduleName]', 'Name of module to be launched.')
    .description(`Launch your ArkUI cross-platform app on an attached device.`)
    .on('--help', () => {
      if (!subCommands.some(sub => process.argv.includes(sub))) {
        console.log(`
Available subcommands:
  apk                    Launch an Android APK to your device.
  hap                    Launch a HarmonyOS/Openharmony HAP to your device.
  ios                    Launch an iOS APP to your device.`);
      }
    })
    .action((fileType, options, cmd) => {
      options.target = options.target || 'entry';
      execCmd(fileType, options, cmd, launch);
    });
  if (process.argv[2] === 'help' && process.argv[3] === 'launch') {
    commandHelp(launchCmd);
  }
  launchCmd.unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function parseLog() {
  const logCmd = program.command('log [fileType]', { hidden: true })
    .usage('[arguments]')
    .description(`Show log output for running ArkUI cross-platform apps.`)
    .on('--help', () => {
      if (!subCommands.some(sub => process.argv.includes(sub))) {
        console.log(`
Available subcommands:
  apk                    Show log output for running the APK.
  hap                    Show log output for running the HAP.
  ios                     Show log output for running the APP.`);
      }
    })
    .action((fileType, options, cmd) => {
      execCmd(fileType, '', cmd, log);
    });
  if (process.argv[2] === 'help' && process.argv[3] === 'log') {
    commandHelp(logCmd);
  }
  logCmd.unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function parseClean() {
  const cleanCmd = program.command('clean', { hidden: true })
    .usage('[arguments]')
    .description(`Delete the build/ directories.`)
    .action(() => {
      clean();
    });
  if (process.argv[2] === 'help' && process.argv[3] === 'clean') {
    commandHelp(cleanCmd);
  }
  cleanCmd.unknownOption = () => unknownOptions();
  commandsSort['Project'].push(program.commands[program.commands.length - 1]);
}

function parseTest() {
  const testCmd = program.command('test [fileType]', { hidden: true })
    .usage('[arguments]')
    .option('--b [bundleName]', 'Specifies the name of the bundle to test.')
    .option('--class [class]', 'Specifies the name of the class to test.')
    .option('--m [testModuleName]', 'Specifies the name of the module to test.')
    .option('--path [path]', 'Specifies the path of the package to install and test.')
    .option('--skipInstall', 'Specifies the name of the app you want to skip installation. Works only when the app has been installed.')
    .option('--target [moduleName]', 'Specifies the name of the module to install.')
    .option('--timeout [timeout]', 'Specifies the timeout time.')
    .option('--unittest [testRunner]', 'Specifies the name of the test runner.')
    .description(`Run ArkUI cross-platform unit tests for the current project.`)
    .on('--help', () => {
      if (!['apk', 'ios'].some(sub => process.argv.includes(sub))) {
        console.log(`
Available subcommands:
  apk                      Run APK unit tests for the current project.
  ios                      Run APP unit tests for the current project.`);
      }
    })
    .action((fileType, options, cmd) => {
      if (!options.b) {
        console.log("No bundle name specified. Use '--b <testBundleName>' to specify one.");
        return false;
      }
      if (!options.m) {
        console.log("test moduleName not found, please use '--m <testModuleName>'");
        return false;
      }
      if (!options.unittest) {
        console.log("test unittest not found, please use '--unittest <unittest>'");
        return false;
      }
      if (options.path !== undefined && options.path.length == 0) {
        console.log("please input the correct path of install file");
        return false;
      }
      if (fileType === 'apk' || fileType === 'ios') {
        options.test = 'test';
        options.debug = true;
        if (!cmd.parent._optionValues.device) {
          chooseDevice(fileType, options, test);
        } else {
          test(fileType, cmd.parent._optionValues.device, options);
        }
      } else {
        console.log(`Please use ace test with subCommand : apk or ios.`);
      }
    });
  if (process.argv[2] === 'help' && process.argv[3] === 'test') {
    commandHelp(testCmd);
  }
  testCmd.unknownOption = () => unknownOptions();
  commandsSort['Application'].push(program.commands[program.commands.length - 1]);
}

function execCmd(fileType, options, cmd, func) {
  if (fileType && fileType !== 'hap' && fileType !== 'apk' && fileType !== 'ios') {
    console.log('\x1B[31m%s\x1B[0m', `Could not find a command named "${process.argv.slice(3)}".\n\n`);
    console.log('\x1B[31m%s\x1B[0m', `Run 'ace help <command>' for available ACE Tools commands and options.`);
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
