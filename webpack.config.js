import path from 'path';
import ResolveTypeScriptPlugin from "resolve-typescript-plugin";

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sharedConfig = {
  mode: 'development',
  resolve: {
    preferRelative: true,
    extensions: [".js", ".ts"],
    plugins: [
      new ResolveTypeScriptPlugin.default({
        includeNodeModules: true
      })
    ],
  },
  module: {
    rules: [
      {
        test: /(\.ts|\.js)$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                module: "ES2020"
              }
            }
          },
        ],
      },
    ],
  },
}

const devConfig = {
  name: 'devserver',
  ...sharedConfig,
  devServer: {
    hot: false,
    static: [
      path.resolve(process.cwd(), 'public'),
      path.resolve(process.cwd(), 'node_modules/qunitx/vendor'),
    ],
    onBeforeSetupMiddleware: function (app, server) {
      // import("@memserver/server/test/helpers/webserver-for-passthrough.js");
    },
    devMiddleware: {
      writeToDisk: true
    },
    port: 1234
  },
  entry: {
    // 'examples/basic': './examples/basic/index.ts',
    // 'examples/blog': path.resolve(__dirname, './examples/blog/index.ts'),
    'test/index': path.resolve(__dirname, './test/index.ts')
  },
  // resolve: {
    // alias: {
    //   '@memoria/model/test': path.resolve(__dirname, 'packages/@memoria/model/test/index'),
    //   '@memserver/model': path.resolve(__dirname, 'packages/@memserver/model/src/index.ts'),
    //   '@memoria/response/test': path.resolve(__dirname, 'packages/@memoria/response/test/index'),
    //   '@memserver/response': path.resolve(__dirname, 'packages/@memserver/response/src/index.ts'),
    //   '@memoria/server/test': path.resolve(__dirname, 'packages/@memoria/server/test/index'),
    //   '@memserver/server': path.resolve(__dirname, 'packages/@memserver/server/src/index.ts')
    // }
  // },
  // externals: {
  //   // Remove once we have new glimmer-vm version published. The duplicate version is from linking issues
  //   '@glimmer/validator': 'commonjs @glimmer/validator'
  // },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
}

export default [devConfig];
