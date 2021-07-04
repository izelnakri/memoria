import fs from 'fs/promises';

let packages = await fs.readdir('./packages/@memoria');

await Promise.all(packages.map((packageName) => {
  return fs.rm(`${process.cwd()}/packages/@memoria/${packageName}/dist`, { recursive: true, force: true });
}));
