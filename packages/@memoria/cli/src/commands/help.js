import fs from "fs/promises";
import kleur from "kleur";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function printCommand() {
  const config = JSON.parse((await fs.readFile(`${__dirname}/../../package.json`)).toString());
  const highlight = (text) => kleur.bold().cyan(text);

  console.log(`${highlight("[Memserver CLI v" + config.version + "] Usage:")} memserver ${kleur.yellow(
    "<command (Default: help)>"
  )}

memserver init | new                    # Sets up the initial memserver folder structure
memserver generate model ${kleur.yellow(
    "[ModelName]"
  )}    # Generates the initial files for a MemServer Model ${kleur.cyan('[alias: "memserver g model"]')}
memserver generate fixtures             # Outputs your initial MemServer state as pure javascript fixture files
memserver generate fixtures ${kleur.yellow(
    "[ModelName]"
  )} # Outputs your initial MemServer state for certain model as pure javascript fixture
`);
}
