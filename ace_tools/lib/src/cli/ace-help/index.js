/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
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
const program = require('commander');

function aceHelp(commandsSort) {
  let helpText = program.helpInformation();
  helpText += `\nAvailable commands:\n`;
  for (const helpCommands in commandsSort) {
    helpText += `\n${helpCommands}: \n`;
    commandsSort[helpCommands].forEach((command) => {
      helpText += `  ${command._name}   \t\t ${command._description}\n`;
    });
  }
  program.addHelpText('after', `\nRun "ace help <command>" for more information about a command.`);
  return helpText;
}

function commandHelp(helpCmd) {
  helpCmd.addHelpText('afterAll', `\nRun "ace help" to see global options.`);
  helpCmd.help();
}

function subcommandHelp(helpCmd, subArgs, subcommand, helpSubCmd) {
  if (typeof process.argv[4] === 'undefined' || !subArgs.includes(process.argv[4])) {
    commandHelp(helpCmd);
  } else if (subcommand === process.argv[4]) {
    helpSubCmd.addHelpText('afterAll', `\nRun "ace help" to see global options.`);
    helpSubCmd.help();
  }
}

function unknownOptions() {
  const unknownOption = program.args.filter(arg => arg.startsWith('-'));
  console.log('\x1B[31m%s\x1B[0m', `Could not find an option with short name "${unknownOption}".\n\n`);
  console.log('\x1B[31m%s\x1B[0m', `Run 'ace help <command>' for available ACE Tools commands and options.`);
  process.exit(1);
}

function unknownCommands(unknownCommand) {
  console.log('\x1B[31m%s\x1B[0m', `Could not find a command named "${unknownCommand}".\n\n`);
  console.log('\x1B[31m%s\x1B[0m', `Run 'ace help <command>' for available ACE Tools commands and options.`);
  process.exit(1);
}

module.exports = { aceHelp, commandHelp, subcommandHelp, unknownOptions, unknownCommands };
