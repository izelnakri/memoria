import fs from 'fs/promises';
import { transformAsync } from '@babel/core';

let index = 0;
export default async function transpileImport(importPath) {
  let codeBuffer = await fs.readFile(importPath);
  let output = await transformAsync(codeBuffer.toString(), {
    filename: importPath,
    inputSourceMap: false,
    presets: [
      '@babel/preset-typescript',
    ],
    plugins: [
      'babel-plugin-module-extension-resolver'
    ]
  });

  let targetFile = importPath.slice(0, importPath.length - 3) + '.js';
  index++;

  await fs.writeFile(targetFile, output.code);

  let result = (await import(`${targetFile}?${index}`)).default;
  return result;
}
