
'use strict';

/* global __dirname module require*/
/* eslint comma-dangle: ["error", "never"] */

const path = require('path');

const toolsPath = str => path.resolve(`tools/node_modules/${str}`);

const {webpackConfig}      = require(path.resolve('src/config.js'));
const webpack              = require(toolsPath('webpack'));
const DashboardPlugin      = require(toolsPath('webpack-dashboard/plugin'));
const {CleanWebpackPlugin} = require(toolsPath('clean-webpack-plugin'));
const CopyWebpackPlugin    = require(toolsPath('copy-webpack-plugin'));
const HtmlWebpackPlugin    = require(toolsPath('html-webpack-plugin'));
const BrowserSyncPlugin    = require(toolsPath('browser-sync-webpack-plugin'));


// App specific, from src/config.js.
const {
  alt,
  description,
  image,
  name,
  siteVerification,
  title,
  url
} = webpackConfig;


module.exports = {
  mode: 'development',
  entry: [ 
    toolsPath('@webcomponents/shadycss/entrypoints/custom-style-interface.js'),
    path.resolve('src/index.js')
  ],
  output: {
    filename: '[name].bundle.js',
    path:      path.resolve('dist'),

    // MUST be set, otherwise manifest and sw plugins will prepend file 
    // paths with 'auto' which does not exist in the output folder structure.
    publicPath:   '', 
    globalObject: 'this' // Addresses an issue with async imports in Web Worker files.
  },
  resolve: {

    // Exposes a node.js like 'path' dependency to all modules.
    fallback: { 
      'path': require.resolve(toolsPath('path-browserify')),
    },
    modules:          [path.resolve('src'), 'node_modules'],
    descriptionFiles: ['package.json']
  },
  devtool: 'cheap-module-source-map',
  resolveLoader: {

    // An array of directory names to be resolved to the current directory.
    modules: [path.resolve('tools/node_modules')],
  },
  module: {
    rules: [
      { 
        test: /\.wasm$/,
        type: 'javascript/auto',
        loader: 'file-loader',
        options: {
          name: '[name]-[contenthash].[ext]'
        }        
      },
      {
        test: /\.(html)$/,
        loader: 'html-loader',
        options: {
          esModule: true
        }
      },
      {
        test: /worker\.js$/,
        loader: 'worker-loader'
      },
      {
        test: /\.css$/,
        loader: 'css-loader',
        options: {
          import: false // Resolves an issue with 'firebaseui' css file.
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf)$/, // specifically for 'typeface-' self hosted font-family node_modules
        loader: 'file-loader'
      },
      {
        test: /\.(jpe?g|png|webp)$/i,
        loader: 'responsive-loader',
        options: {

          // Use Sharp instead of Jimp to allow webp support.
          adapter:         require(toolsPath('responsive-loader/sharp')),
          esModule:        true, // Allow tree shaking.
          format:         'webp',
          name:           '[name]-[width]-[contenthash].[ext]',
          outputPath:     'responsive/', 
          placeholder:     true,
          placeholderSize: 50,
          quality:         90, // Default is 85.
          sizes:           [300, 600, 900, 1200, 1500]
        }
      }
    ]
  },

  // Enable the Webpack dev server which will build, serve, and reload our
  // project on changes.
  devServer: {
    host:               '0.0.0.0', 
    port:               3100,
    contentBase:        './dist',
    compress:           true,
    historyApiFallback: true
  },
  plugins: [

    new webpack.ProgressPlugin(),

    new DashboardPlugin(),

    // Cleanup dist folder before each build.
    new CleanWebpackPlugin(),

    // Shim the 'process' global variable used by node.js modules such as 'path',
    // which is also shimmed by the 'path-browserify' module.
    // See resolve.fallback.path.
    new webpack.ProvidePlugin({
      process: require.resolve(toolsPath('process/browser'))
    }),

    // This is a performance improvement for 'jimp' package.
    new webpack.DefinePlugin({
      'process.browser': 'true'
    }),

    // Pass a stubbed version of service worker file to dev server.
    new CopyWebpackPlugin({
      patterns: [{
        from: path.resolve('src/images'), 
        to:  'images'
      }]
    }),

    new HtmlWebpackPlugin({

      scriptLoading: 'defer',

      // Load a custom template.
      template: 'src/index.ejs',

      // Fixes an issue with workbox-webpack-plugin not updating its revision number
      // for index.html. This lead to the service worker serving outdated previously
      // precached files even after the refresh prompt after a new deployment. 
      // Exposes the 'webpack' variable to index.ejs
      templateParameters: compilation => ({
        alt,
        description,
        image,
        name,
        siteVerification,
        title,
        url,
        webpack: compilation.getStats().toJson()
      })
    }),

    // BrowserSync options.
    new BrowserSyncPlugin({

      // Go to http://localhost:3000/ during development.
      host: 'localhost',
      port: 3000,

      // Proxy the Webpack Dev Server endpoint 
      // (which should be serving on http://localhost:3100/) 
      // through BrowserSync.
      proxy: 'http://localhost:3100/'
    }, {

      // Prevent BrowserSync from reloading the page,
      // and let Webpack Dev Server take care of this.
      reload: false
    })
  ]
};
