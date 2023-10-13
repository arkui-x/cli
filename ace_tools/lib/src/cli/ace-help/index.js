const program = require('commander');

function help(commandsSort) {
  let helpText = program.helpInformation();
  helpText += `\nAvailable commands:\n`;
  for (const helpCommands in commandsSort) {
    helpText += `\n${helpCommands}: \n`;
    commandsSort[helpCommands].forEach((command) => {
      helpText += `  ${command._name}   \t\t ${command._description}\n`;
    });
  }
  program.addHelpText("after", `\nRun "ace [command] --help" for more information about a command.`);
  return helpText;
}

function unknownOptions() {
  const unknownOption = program.args.filter(arg => arg.startsWith('-'));
  console.log('\x1B[31m%s\x1B[0m', `Could not find an option with short name "${unknownOption}".\n\n`);
  console.log('\x1B[31m%s\x1B[0m', `Run 'ace [command] --help' for available ace commands and options.`);
  process.exit(1);
}

function unknownCommands(unknownCommand) {
  console.log('\x1B[31m%s\x1B[0m', `Could not find a command named "${unknownCommand}".\n\n`);
  console.log('\x1B[31m%s\x1B[0m', `Run 'ace [command] --help' for available ace commands and options.`);
  process.exit(1);
}

module.exports = { help, unknownOptions, unknownCommands }
