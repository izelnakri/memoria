import path from 'path';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sharedConfig = {
  mode: 'development',
  externals: {
    fs: 'fs',
  },
  resolve: {
    plugins: [
      new TsconfigPathsPlugin({
        mainFields: ['module', 'main'],
      }),
    ],
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /(\.ts|\.js)$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-typescript',
            ],
            plugins: [
              ['module:@babel/plugin-proposal-decorators', { legacy: true }],
              'module:@babel/plugin-proposal-class-properties',
              'module:@babel/plugin-proposal-private-methods'
            ],
          }
        },
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
      path.resolve(process.cwd(), 'node_modules/qunitx/vendor'), // NOTE: make this work with qunitx in future
    ],
    onBeforeSetupMiddleware: function (app, server) {
      import("./packages/@memserver/server/test/helpers/webserver-for-passthrough.js");
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
  resolve: {
    preferRelative: true,
    extensions: ['.js', '.ts'],
    alias: {
      '@memserver/model/test': path.resolve(__dirname, 'packages/@memserver/model/test/index.ts'),
      '@memserver/model': path.resolve(__dirname, 'packages/@memserver/model/src/index.ts'),
      '@memserver/response/test': path.resolve(__dirname, 'packages/@memserver/response/test/index.ts'),
      '@memserver/response': path.resolve(__dirname, 'packages/@memserver/response/src/index.ts'),
      '@memserver/server/test': path.resolve(__dirname, 'packages/@memserver/server/test/index.ts'),
      '@memserver/server': path.resolve(__dirname, 'packages/@memserver/server/src/index.ts')
    }
  },
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
