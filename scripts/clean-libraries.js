import fs from 'fs/promises';

let packages = await fs.readdir('./packages/@memserver');

await Promise.all(packages.map((packageName) => {
  return fs.rm(`${process.cwd()}/packages/@memserver/${packageName}/dist`, { recursive: true, force: true });
}));
