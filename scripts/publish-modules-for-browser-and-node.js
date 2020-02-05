const fs = require("fs-extra");
const util = require("util");
const CWD = process.cwd();
const child_process = require("child_process");
const shell = util.promisify(child_process.exec);

async function main() {}

main().then(() => console.log("done"));
