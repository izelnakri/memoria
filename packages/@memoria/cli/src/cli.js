#!/usr/bin/env node
import fs from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";
import kleur from "kleur";

import generateCommand from "./commands/generate.js";
import helpCommand from "./commands/help.js";
import initCommand from "./commands/init.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.env.NODE_ENV === "test") {
  kleur.enabled = false;
}

const CLI = {
  default(commandHandler) {
    !process.argv[2] ? commandHandler() : null;
  },
  command(commandName, commandHandler) {
    if (Array.isArray(commandName)) {
      return commandName.includes(process.argv[2]) ? commandHandler() : null;
    }

    commandName === process.argv[2] ? commandHandler() : null;
  },
};

CLI.default(helpCommand);
CLI.command(["help", "h"], helpCommand);
CLI.command(["init", "new"], initCommand);
CLI.command(["generate", "g"], generateCommand);
// CLI.command(["sync", "s"], generateCommand); // TODO: this should sync with urls or post-init memserver state to fixtures
CLI.command(["version", "v"], async () => {
  console.log(
    kleur.cyan("[Memserver CLI]"),
    JSON.parse((await fs.readFile(`${__dirname}/../package.json`)).toString()).version
  );
});
