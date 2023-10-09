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
  program.addHelpText("after", `\nRun "ace help <command>" for more information about a command.`);
  return helpText;
}

module.exports = help;
