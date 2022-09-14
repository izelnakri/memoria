import fs from "fs/promises";

export default async function getMemServerDirectory() {
  const cwd = process.cwd();
  const folders = cwd.split("/");
  const memServerIndex = folders.findIndex((path) => path === "memserver");

  if (memServerIndex !== -1) {
    return folders.slice(0, memServerIndex + 1).join("/");
  } else if ((await fs.readdir(".")).includes("memserver")) {
    return `${cwd}/memserver`;
  }
}
